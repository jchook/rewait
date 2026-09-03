import http from 'node:http'
import { Readable } from 'node:stream'
import test from 'tape'
import checkHttpResponse from '../src/checkHttpResponse.ts'
import checkHttp from '../src/http.ts'
import { getAddrInfo } from './util.ts'

/**
 * Build a fake IncomingMessage with a status code and body chunks
 */
function fakeResponse(statusCode: number | undefined, chunks: string[] = []) {
  const res = Readable.from(chunks.map(c => Buffer.from(c))) as any
  res.statusCode = statusCode
  return res as http.IncomingMessage
}

async function rejection(promise: Promise<unknown>): Promise<Error> {
  try {
    await promise
  } catch (err) {
    return err as Error
  }
  throw new Error('Expected promise to reject')
}

test('checkHttpResponse() default status check', async t => {
  await checkHttpResponse()(fakeResponse(200))
  await checkHttpResponse()(fakeResponse(301))
  t.pass('accepts 2xx and 3xx')
  const err = await rejection(checkHttpResponse()(fakeResponse(500)))
  t.match(err.message, /error code: 500/, 'rejects 5xx')
  const missing = await rejection(checkHttpResponse()(fakeResponse(undefined)))
  t.match(missing.message, /undefined/, 'rejects missing status')
  t.end()
})

test('checkHttpResponse() status', async t => {
  await checkHttpResponse({ status: 204 })(fakeResponse(204))
  t.pass('accepts exact status')
  const err = await rejection(
    checkHttpResponse({ status: 204 })(fakeResponse(200))
  )
  t.equal(err.message, 'Expected HTTP status 204 but received 200')
  await checkHttpResponse({ status: [200, 404] })(fakeResponse(404))
  t.pass('accepts status from list')
  const listErr = await rejection(
    checkHttpResponse({ status: [200, 404] })(fakeResponse(500))
  )
  t.equal(listErr.message, 'Expected HTTP status 200 or 404 but received 500')
  const missing = await rejection(
    checkHttpResponse({ status: 200 })(fakeResponse(undefined))
  )
  t.equal(missing.message, 'Expected HTTP status 200 but received undefined')
  t.end()
})

test('checkHttpResponse() statusRange', async t => {
  await checkHttpResponse({ statusRange: [200, 299] })(fakeResponse(299))
  t.pass('accepts status within range')
  const err = await rejection(
    checkHttpResponse({ statusRange: [200, 299] })(fakeResponse(301))
  )
  t.equal(err.message, 'Expected HTTP status 200-299 but received 301')
  await checkHttpResponse({ status: 404, statusRange: [200, 299] })(
    fakeResponse(404)
  )
  t.pass('status and statusRange are combined as alternatives')
  const both = await rejection(
    checkHttpResponse({ status: 404, statusRange: [200, 299] })(
      fakeResponse(500)
    )
  )
  t.equal(both.message, 'Expected HTTP status 404 or 200-299 but received 500')
  t.end()
})

test('checkHttpResponse() body checks', async t => {
  await checkHttpResponse({ bodySubstring: 'OK' })(
    fakeResponse(200, ['all ', 'OK'])
  )
  t.pass('bodySubstring passes')
  const sub = await rejection(
    checkHttpResponse({ bodySubstring: 'OK' })(fakeResponse(200, ['nope']))
  )
  t.equal(
    sub.message,
    'Expected response body to contain "OK" but received "nope"'
  )

  await checkHttpResponse({ bodyRegex: /^\{.*\}$/ })(fakeResponse(200, ['{}']))
  t.pass('bodyRegex passes')
  const re = await rejection(
    checkHttpResponse({ bodyRegex: /^\{.*\}$/ })(fakeResponse(200, ['[]']))
  )
  t.equal(
    re.message,
    'Expected response body to match /^\\{.*\\}$/ but received "[]"'
  )

  await checkHttpResponse({ bodyExact: 'OK' })(fakeResponse(200, ['OK']))
  t.pass('bodyExact passes')
  const exact = await rejection(
    checkHttpResponse({ bodyExact: 'OK' })(fakeResponse(200, ['OK\n']))
  )
  t.equal(
    exact.message,
    'Expected response body to equal "OK" but received "OK\\n"'
  )

  await checkHttpResponse({
    bodyExact: 'OK',
    bodySubstring: 'K',
    bodyRegex: /O/,
  })(fakeResponse(200, ['OK']))
  t.pass('all body checks must pass')

  const long = 'x'.repeat(150)
  const truncated = await rejection(
    checkHttpResponse({ bodyExact: 'OK' })(fakeResponse(200, [long]))
  )
  t.equal(
    truncated.message,
    `Expected response body to equal "OK" but received "${'x'.repeat(100)}"...`,
    'long bodies are truncated in the error message'
  )
  t.end()
})

test('checkHttpResponse() encoding', async t => {
  const res = fakeResponse(200, ['OK'])
  await checkHttpResponse({ bodyExact: '4f4b', encoding: 'hex' })(res)
  t.pass('decodes body using the given encoding')
  t.end()
})

test('checkHttpResponse() status is checked before reading the body', async t => {
  const res = fakeResponse(500, ['OK'])
  await rejection(checkHttpResponse({ bodySubstring: 'OK' })(res))
  t.notOk(res.readableEnded, 'body was not read')
  t.end()
})

test('checkHttpResponse() body already consumed', async t => {
  const res = fakeResponse(200, ['OK'])
  const check = checkHttpResponse({ bodySubstring: 'OK' })
  await check(res)
  const err = await rejection(check(res))
  t.equal(err.message, 'Response body is no longer readable')
  t.end()
})

test('checkHttpResponse() body stream error', async t => {
  const res = fakeResponse(200, ['partial'])
  const check = checkHttpResponse({ bodySubstring: 'OK' })
  const pending = check(res)
  res.destroy(new Error('boom'))
  const err = await rejection(pending)
  t.equal(err.message, 'boom')
  t.end()
})

test('checkHttpResponse() through http()', async t => {
  const server = http.createServer((_req, res) => {
    res.statusCode = 503
    res.end('{"status":"starting"}')
  })
  server.listen()
  const url = `http://127.0.0.1:${getAddrInfo(server).port}/`
  const notReady = await rejection(
    checkHttp(url, {
      checkOk: checkHttpResponse({ status: 503, bodySubstring: '"ok"' }),
    })()
  )
  t.match(
    notReady.message,
    /Expected response body to contain/,
    'body rejected'
  )
  server.close()

  const ready = http.createServer((_req, res) => {
    res.end('{"status":"ok"}')
  })
  ready.listen()
  const res = await checkHttp(`http://127.0.0.1:${getAddrInfo(ready).port}/`, {
    checkOk: checkHttpResponse({ bodySubstring: '"ok"' }),
  })()
  t.equal(res.statusCode, 200, 'resolves with the response')
  t.ok(res.readableEnded, 'body was consumed by the check')
  ready.close()
  t.end()
})
