import test from 'tape'
import fs from 'fs'
import path from 'path'
import net from 'net'
import http from 'http'
import https from 'https'
import checkHttp, { encodeHttpAuth } from '../src/http'
import { getAddrInfo } from './util'

interface AuthCredentials {
  username: string
  password: string
}

function getUsernamePassword(req: http.IncomingMessage): AuthCredentials {
  const header = req.headers.authorization || '' // get the auth header
  const token = header.split(/\s+/).pop() || '' // and the encoded auth token
  const auth = Buffer.from(token, 'base64').toString() // convert from base64
  const parts = auth.split(/:/, 2) // split on colon
  const username = decodeURIComponent(parts.shift() || '') // username is first
  const password = decodeURIComponent(parts.shift() || '')
  return { username, password }
}

test('connects via http', async t => {
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

test('bail on infinite data', t => {
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

test('timeout when server fails to send data', t => {
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

test('connection failure', async t => {
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

test('encodeHttpAuth', t => {
  const username = 'xyz'
  const password = 'abc😀'
  const encoded = encodeHttpAuth(username, password)
  t.equal(encoded, 'xyz:abc%F0%9F%98%80', 'encodes auth')
  t.end()
})

test('url parameters', async t => {
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

test('POST request', async t => {
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

test('HTTP error response code', async t => {
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

test('connect timeout', async t => {
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

test('https', async t => {
  t.plan(1)
  const ca = fs.readFileSync(
    path.join(__dirname, 'fixtures', 'cert', 'rootCA.pem')
  )
  const cert = fs.readFileSync(
    path.join(__dirname, 'fixtures', 'cert', 'localhost.pem')
  )
  const key = fs.readFileSync(
    path.join(__dirname, 'fixtures', 'cert', 'localhost-key.pem')
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
