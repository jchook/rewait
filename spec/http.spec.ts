import fs from 'node:fs'
import http from 'node:http'
import https from 'node:https'
import net from 'node:net'
import path from 'node:path'
import test from 'tape'
import checkHttp, {
  type AuthCredentials,
  encodeHttpAuth,
  getForwardedRequestOptions,
} from '../src/http.ts'
import { getAddrInfo } from './util.ts'

function getUsernamePassword(req: http.IncomingMessage): AuthCredentials {
  const header = req.headers.authorization || '' // get the auth header
  const token = header.split(/\s+/).pop() || '' // and the encoded auth token
  const auth = Buffer.from(token, 'base64').toString() // convert from base64
  const parts = auth.split(/:/, 2) // split on colon
  const username = decodeURIComponent(parts.shift() || '') // username is first
  const password = decodeURIComponent(parts.shift() || '')
  return { username, password }
}

test('http() connects via http', async t => {
  t.plan(4)
  const server = http.createServer((req, res) => {
    t.ok(req, 'server received request')
    res.end('42')
  })
  server.listen()
  t.ok(server, 'server listening')
  await checkHttp(`http://localhost:${getAddrInfo(server).port}`, {
    onRequest: req => {
      t.ok(req, 'client made request')
    },
    onResponse: res => {
      t.ok(res, 'client received a response')
    },
  })()
  server.close()
})

test('http() bail on infinite data', t => {
  t.plan(6)
  let interval: NodeJS.Timeout

  // Build server that streams data forever
  const server = http.createServer((req, res) => {
    t.ok(req, 'server received request')
    const write = () => res.write('42\n')
    write()
    interval = setInterval(write, 1000)
  })
  server.listen()

  // Make request
  const url = `http://localhost:${getAddrInfo(server).port}`
  checkHttp(url, {
    bail: true, // without this it will hang
    onRequest: req => {
      t.ok(req, 'client made a request')
      req.on('close', () => {
        t.ok(true, 'request is closed')
      })
    },
  })().then(res => {
    t.ok(res instanceof http.IncomingMessage, 'return value is response')
    clearInterval(interval)
    server.close(err => {
      t.notOk(err, 'does not error on closing server')
      t.notOk(server.listening, 'server no longer listening')
    })
  })
})

test('http() timeout when server fails to send data', t => {
  t.plan(5)

  // Build server that never sends data
  const server = http.createServer(req => {
    t.ok(req, 'server received request')
  })
  server.listen()

  // Make request
  const url = `http://localhost:${getAddrInfo(server).port}`
  checkHttp(url, {
    timeout: 100,
    onRequest: req => {
      t.ok(req, 'client made a request')
    },
  })()
    .then(() => t.fail('Did not timeout'))
    .catch(err => {
      t.ok(err, 'timeout occurred')
      server.close(err => {
        t.notOk(err, 'does not error on closing server')
        t.notOk(server.listening, 'server no longer listening')
      })
    })
})

test('http() connection failure', async t => {
  t.plan(2)

  // Make request
  // Do not listen on this port
  const url = 'http://localhost:21331'
  try {
    await checkHttp(url, {
      onError: err => {
        t.ok(err instanceof Error, 'onError called')
      },
    })()
    t.fail('connection did fail as expected')
  } catch (err) {
    t.ok(err, 'connection failure occurred as expected')
  }
})

test('encodeHttpAuth() properly encodes passwords', t => {
  const username = 'xyz'
  const password = 'abc😀'
  const encoded = encodeHttpAuth(username, password)
  t.equal(encoded, 'xyz:abc%F0%9F%98%80', 'encodes auth')
  t.end()
})

test('http() url parameters', async t => {
  t.plan(9)
  const username = 'xyz'
  const password = 'abc😀'
  const path = '/test'
  const search = '?with=query'
  const server = http.createServer((req, res) => {
    t.ok(req, 'server received request')
    t.ok(req.method === 'GET', 'GET request')
    t.ok(req.headers.host?.substring(0, 10) === '127.0.0.1:', '127.0.0.1:')
    const url = new URL(req.url || '', `http://${req.headers.host}/`)
    t.equal(url.pathname, path, 'url path')
    t.equal(url.search, search, 'url query')
    const auth = getUsernamePassword(req)
    t.equal(auth.username, username, 'username received')
    t.equal(auth.password, password, 'password received')
    res.end('42')
  })
  server.listen()
  const port = getAddrInfo(server).port
  await checkHttp(
    `http://${encodeHttpAuth(
      username,
      password
    )}@127.0.0.1:${port}${path}${search}`,
    {
      onRequest: req => {
        t.ok(req, 'client made request')
      },
      onResponse: res => {
        t.ok(res, 'client received a response')
      },
    }
  )()
  server.close()
})

test('http() POST request', async t => {
  t.plan(1)
  const data = 'The capybara is a giant cavy rodent native to South America'
  const server = http.createServer((req, res) => {
    let received = ''
    req.on('data', chunk => {
      received += chunk
    })
    req.on('end', () => {
      t.equal(received, data, 'received data')
      res.end('42')
    })
  })
  server.listen()
  const port = getAddrInfo(server).port
  await checkHttp(`http://127.0.0.1:${port}/`, {
    data,
    requestOptions: {
      method: 'POST',
    },
  })()
  server.close()
})

test('http() error response code', async t => {
  t.plan(1)
  const server = http.createServer((_req, res) => {
    res.statusCode = 401
    res.end('Unauthorized')
  })
  server.listen()
  const port = getAddrInfo(server).port
  try {
    await checkHttp(`http://127.0.0.1:${port}/`)()
  } catch (err) {
    if (err instanceof Error) {
      t.match(err.message, /401/, '401 status code error')
    }
  }
  server.close()
})

test('http() connect timeout', async t => {
  t.plan(1)
  const server = net.createServer(() => {})
  server.listen()
  const port = getAddrInfo(server).port
  try {
    await checkHttp(new URL(`http://127.0.0.1:${port}/`), {
      timeout: 60000,
      requestOptions: {
        timeout: 100,
      },
    })()
  } catch (err) {
    if (err instanceof Error) {
      t.match(err.message, /Connection timeout/, 'timeout error')
    }
  }
  server.close()
})

test('http() supports https', async t => {
  t.plan(1)
  const ca = fs.readFileSync(
    path.join(import.meta.dirname, 'fixtures', 'cert', 'rootCA.pem')
  )
  const cert = fs.readFileSync(
    path.join(import.meta.dirname, 'fixtures', 'cert', 'localhost.pem')
  )
  const key = fs.readFileSync(
    path.join(import.meta.dirname, 'fixtures', 'cert', 'localhost-key.pem')
  )
  const server = https.createServer(
    {
      cert,
      key,
    },
    (_req, res) => {
      res.end('42')
    }
  )
  server.listen()
  const port = getAddrInfo(server).port
  await checkHttp(`https://localhost:${port}/`, {
    requestOptions: {
      ca,
    },
  })()
  t.ok(true, 'connection succeeded')
  server.close()
})

test('getForwardedRequestOptions()', t => {
  const username = 'r00t'
  const password = '😀'
  const reqOpts = getForwardedRequestOptions({
    auth: { username, password },
    connectTimeout: 1000,
  })
  t.deepEqual(reqOpts, {
    auth: encodeHttpAuth(username, password),
    timeout: 1000,
  })
  t.end()
})

async function rejection(promise: Promise<unknown>): Promise<Error> {
  try {
    await promise
  } catch (err) {
    return err as Error
  }
  throw new Error('Expected promise to reject')
}

test('http() checkOk receives the live response stream', async t => {
  t.plan(3)
  const server = http.createServer((_req, res) => {
    res.end('hello')
  })
  server.listen()
  const res = await checkHttp(`http://127.0.0.1:${getAddrInfo(server).port}/`, {
    checkOk: res =>
      new Promise<void>(resolve => {
        t.notOk(res.readableEnded, 'body not yet consumed')
        let body = ''
        res.on('data', chunk => {
          body += chunk
        })
        res.on('end', () => {
          t.equal(body, 'hello', 'checkOk read the body')
          resolve()
        })
      }),
  })()
  t.ok(res.readableEnded, 'stream was ended')
  server.close()
})

test('http() rejects when checkOk throws', async t => {
  t.plan(1)
  const server = http.createServer((_req, res) => {
    res.end('42')
  })
  server.listen()
  const err = await rejection(
    checkHttp(`http://127.0.0.1:${getAddrInfo(server).port}/`, {
      checkOk: () => {
        throw new Error('not ready')
      },
    })()
  )
  t.equal(err.message, 'not ready', 'error propagated')
  server.close()
})

test('http() timeout covers checkOk', async t => {
  t.plan(1)
  const server = http.createServer((_req, res) => {
    res.end('42')
  })
  server.listen()
  const err = await rejection(
    checkHttp(`http://127.0.0.1:${getAddrInfo(server).port}/`, {
      timeout: 100,
      checkOk: () => new Promise(() => {}), // never settles
    })()
  )
  t.equal(err.message, 'HTTP response timeout')
  server.close()
})

test('http() timeout covers the response body', async t => {
  t.plan(1)
  let pending: http.ServerResponse | undefined
  const server = http.createServer((_req, res) => {
    pending = res
    res.write('partial') // never ends
  })
  server.listen()
  const err = await rejection(
    checkHttp(`http://127.0.0.1:${getAddrInfo(server).port}/`, {
      timeout: 100,
    })()
  )
  t.equal(err.message, 'HTTP response timeout')
  pending?.destroy()
  server.close()
})

test('http() no timeout when timeout is not a number', async t => {
  t.plan(1)
  const server = http.createServer((_req, res) => {
    res.end('42')
  })
  server.listen()
  await checkHttp(`http://127.0.0.1:${getAddrInfo(server).port}/`, {
    timeout: undefined,
  })()
  t.pass('resolved without a deadline')
  server.close()
})

test('http() flowingMode false requires manual consumption', async t => {
  t.plan(1)
  const server = http.createServer((_req, res) => {
    res.end('42')
  })
  server.listen()
  await checkHttp(`http://127.0.0.1:${getAddrInfo(server).port}/`, {
    flowingMode: false,
    onResponse: res => res.resume(),
  })()
  t.pass('resolved once the manually-resumed stream ended')
  server.close()
})

test('http() rejects when the server drops the connection mid-body', async t => {
  t.plan(1)
  const server = http.createServer((_req, res) => {
    res.write('partial')
    setTimeout(() => res.socket?.destroy(), 20)
  })
  server.listen()
  const err = await rejection(
    checkHttp(`http://127.0.0.1:${getAddrInfo(server).port}/`)()
  )
  t.ok(err, `rejected: ${err.message}`)
  server.close()
})

test('http() rejects when checkOk destroys the response', async t => {
  t.plan(2)
  const server = http.createServer((_req, res) => {
    res.write('partial')
    setTimeout(() => res.end(), 50)
  })
  server.listen()
  const url = `http://127.0.0.1:${getAddrInfo(server).port}/`
  const sync = await rejection(
    checkHttp(url, { checkOk: res => res.destroy() })()
  )
  t.equal(sync.message, 'Response closed before completion', 'sync destroy')
  const async = await rejection(
    checkHttp(url, {
      checkOk: res => {
        setTimeout(() => res.destroy(), 10)
      },
    })()
  )
  t.equal(async.message, 'Response closed before completion', 'async destroy')
  server.close()
})
