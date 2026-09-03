import dgram from 'node:dgram'
import fs from 'node:fs'
import http from 'node:http'
import https from 'node:https'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import test from 'tape'
import { renderHelp } from '../../src/cli/help.ts'
import { describeError, run } from '../../src/cli/run.ts'
import { getAddrInfo } from '../util.ts'

async function exec(argv: string[]) {
  let stdout = ''
  let stderr = ''
  const code = await run(argv, {
    version: '1.2.3',
    stdout: text => {
      stdout += text
    },
    stderr: text => {
      stderr += text
    },
  })
  return { code, stdout, stderr }
}

const certDir = path.join(import.meta.dirname, '..', 'fixtures', 'cert')

test('rewait --help and --version', async t => {
  t.deepEqual(await exec(['--help']), {
    code: 0,
    stdout: renderHelp(),
    stderr: '',
  })
  t.deepEqual(await exec(['-V']), { code: 0, stdout: '1.2.3\n', stderr: '' })
  t.end()
})

test('rewait usage errors', async t => {
  const none = await exec([])
  t.equal(none.code, 2)
  t.match(none.stderr, /^rewait: No checks given\nUsage: rewait/)
  const badTimeout = await exec(['-t', 'soon', '/x'])
  t.equal(badTimeout.code, 2)
  t.match(badTimeout.stderr, /Invalid duration for --timeout/)
  const badInterval = await exec(['-i', 'often', '/x'])
  t.equal(badInterval.code, 2)
  t.match(badInterval.stderr, /Invalid duration for --interval/)
  const unknown = await exec(['--bogus'])
  t.equal(unknown.code, 2)
  t.match(unknown.stderr, /Unknown option: --bogus/)
  t.end()
})

test('rewait http check with curl-style options', async t => {
  const seen: Record<string, unknown> = {}
  const server = http.createServer((req, res) => {
    let body = ''
    req.on('data', chunk => {
      body += chunk
    })
    req.on('end', () => {
      Object.assign(seen, {
        method: req.method,
        auth: req.headers.authorization,
        custom: req.headers['x-custom'],
        body,
      })
      res.statusCode = 201
      res.end('{"ok":true}')
    })
  })
  server.listen()
  const url = `http://127.0.0.1:${getAddrInfo(server).port}/`
  const result = await exec([
    url,
    '-H',
    'X-Custom: yes',
    '-d',
    '{"probe":1}',
    '-u',
    'me:secret',
    '--status',
    '201',
    '--body-substring',
    '"ok":true',
  ])
  t.deepEqual(result, { code: 0, stdout: '', stderr: '' })
  t.deepEqual(seen, {
    method: 'POST',
    auth: `Basic ${Buffer.from('me:secret').toString('base64')}`,
    custom: 'yes',
    body: '{"probe":1}',
  })
  const put = await exec([
    url,
    '-d',
    'x',
    '-X',
    'put',
    '--status-range',
    '200-299',
  ])
  t.equal(put.code, 0)
  t.equal(seen.method, 'PUT', '-X overrides the POST implied by -d')
  server.close()
  t.end()
})

test('rewait https check with --cacert and -k', async t => {
  const server = https.createServer(
    {
      cert: fs.readFileSync(path.join(certDir, 'localhost.pem')),
      key: fs.readFileSync(path.join(certDir, 'localhost-key.pem')),
    },
    (_req, res) => res.end('ok')
  )
  server.listen()
  const url = `https://localhost:${getAddrInfo(server).port}/`
  const ca = path.join(certDir, 'rootCA.pem')
  t.equal((await exec([url, '--cacert', ca])).code, 0, '--cacert')
  t.equal((await exec([url, '-k'])).code, 0, '-k')
  const untrusted = await exec(['--once', url])
  t.equal(untrusted.code, 1, 'untrusted without either')
  t.match(untrusted.stderr, /1 of 1 checks failed/)
  server.close()
  t.end()
})

test('rewait tcp, unix and udp checks', async t => {
  const tcp = net.createServer(sock => {
    sock.on('data', data => {
      if (String(data) === 'PING\r\n') {
        sock.write('+PONG\r\n')
      }
    })
  })
  tcp.listen()
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rw-'))
  const sockPath = path.join(tmp, 's')
  const unix = net.createServer()
  unix.listen(sockPath)
  const udp = dgram.createSocket('udp4')
  udp.on('message', (msg, rinfo) =>
    udp.send(`ok:${msg}`, rinfo.port, rinfo.address)
  )
  await new Promise<void>(resolve => udp.bind(0, '127.0.0.1', resolve))

  const result = await exec([
    '-t',
    '2s',
    `tcp://127.0.0.1:${getAddrInfo(tcp).port}`,
    '--send',
    'PING\r\n',
    '--body-regex',
    '^\\+PONG',
    `unix://${sockPath}`,
    `udp://127.0.0.1:${udp.address().port}`,
    '--send',
    'hi',
    '--body-exact',
    'ok:hi',
    '--response-timeout',
    '1s',
  ])
  t.deepEqual(result, { code: 0, stdout: '', stderr: '' })

  tcp.close()
  unix.close()
  udp.close()
  fs.rmSync(tmp, { recursive: true })
  t.end()
})

test('rewait retries until checks pass', async t => {
  let hits = 0
  const server = http.createServer((_req, res) => {
    hits++
    res.statusCode = hits < 3 ? 503 : 200
    res.end()
  })
  server.listen()
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rw-'))
  const file = path.join(tmp, 'ready')
  setTimeout(() => fs.writeFileSync(file, 'ready'), 100)
  const result = await exec([
    '-v',
    '-i',
    '20ms',
    `http://127.0.0.1:${getAddrInfo(server).port}/`,
    file,
    '--min-size',
    '5',
  ])
  t.equal(result.code, 0)
  t.equal(hits, 3, 'http check was retried')
  t.match(
    result.stderr,
    /^\[\d+\.\d{3}s\] http:.*: Received HTTP error code: 503/m,
    'verbose failures'
  )
  t.match(result.stderr, /: ok\n/, 'verbose successes')
  server.close()
  fs.rmSync(tmp, { recursive: true })
  t.end()
})

test('rewait times out', async t => {
  const result = await exec(['-t', '100ms', '-i', '10ms', '/nonexistent/file'])
  t.equal(result.code, 1)
  t.equal(
    result.stderr,
    "rewait: timed out after 100ms\n  /nonexistent/file: ENOENT: no such file or directory, stat '/nonexistent/file'\n"
  )
  const quiet = await exec(['-q', '-t', '50ms', '/nonexistent/file'])
  t.deepEqual(quiet, { code: 1, stdout: '', stderr: '' }, '--quiet')
  const seconds = await exec(['-t', '1500', '--once', '/nonexistent/file'])
  t.match(seconds.stderr, /1 of 1 checks failed/, '--once ignores the timeout')
  const long = await exec(['-t', '1.5s', '/etc/hostname'])
  t.equal(long.code, 0)
  t.end()
})

test('rewait -t 0 waits forever', async t => {
  const result = await exec(['-t', '0', '/etc/hostname'])
  t.deepEqual(result, { code: 0, stdout: '', stderr: '' })
  t.end()
})

test('rewait timeout headline uses seconds', async t => {
  const result = await exec(['-t', '1s', '-i', '2s', '/nonexistent/file'])
  t.match(result.stderr, /^rewait: timed out after 1s\n/)
  t.end()
})

test('rewait --once', async t => {
  const ok = await exec(['--once', '/etc/hostname'])
  t.deepEqual(ok, { code: 0, stdout: '', stderr: '' })
  const failed = await exec([
    '--once',
    '/etc/hostname',
    '/nonexistent/a',
    '/nonexistent/b',
  ])
  t.equal(failed.code, 1)
  t.match(
    failed.stderr,
    /^rewait: 2 of 3 checks failed\n {2}\/nonexistent\/a: ENOENT/
  )
  t.end()
})

test('rewait --sequential', async t => {
  const order: string[] = []
  const server = http.createServer((req, res) => {
    order.push(req.url || '')
    res.end()
  })
  server.listen()
  const base = `http://127.0.0.1:${getAddrInfo(server).port}`
  const ok = await exec(['--sequential', `${base}/1`, `${base}/2`])
  t.equal(ok.code, 0)
  t.deepEqual(order, ['/1', '/2'], 'ran in order')
  const failed = await exec([
    '--sequential',
    '--once',
    '/nonexistent/x',
    `${base}/3`,
  ])
  t.equal(failed.code, 1)
  t.equal(
    failed.stderr,
    "rewait: 1 of 2 checks failed\n  /nonexistent/x: ENOENT: no such file or directory, stat '/nonexistent/x'\n  http://127.0.0.1:" +
      `${getAddrInfo(server).port}/3: not attempted\n`
  )
  server.close()
  t.end()
})

test('describeError()', t => {
  t.equal(describeError(new Error('plain')), 'plain')
  const aggregate = new Error('')
  Object.assign(aggregate, { errors: [new Error('a'), new Error('b')] })
  t.equal(describeError(aggregate), 'a, b', 'aggregate errors')
  t.equal(describeError(new Error('')), 'Error', 'empty message')
  t.equal(describeError('oops'), 'oops', 'non-Error')
  t.end()
})
