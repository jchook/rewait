const test = require('tape')
const http = require('http')
const checkHttp = require('./http')

test('connects via http', async t => {
  t.plan(4)
  const server = http.createServer((req, res) => {
    t.ok(req, 'server received request')
    res.end('42')
  })
  server.listen()
  t.ok(server, 'server listening')
  await checkHttp(`http://localhost:${server.address().port}`, {
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
  let interval

  // Build server that streams data forever
  const server = http.createServer((req, res) => {
    t.ok(req, 'server received request')
    const write = () => res.write('42\n')
    write()
    interval = setInterval(write, 1000)
  })
  server.listen()

  // Make request
  const url = `http://localhost:${server.address().port}`
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
  const server = http.createServer((req) => {
    t.ok(req, 'server received request')
  })
  server.listen()

  // Make request
  const url = `http://localhost:${server.address().port}`
  checkHttp(url, {
    timeout: 100,
    responseTimeout: 100,
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

test('connection failure', t => {
  t.plan(1)

  // Make request
  // Do not listen on this port
  const url = "http://localhost:21331"
  return checkHttp(url)()
    .then(() => t.fail('connection did fail as expected'))
    .catch(err => t.ok(err, 'connection failure occurred as expected'))
})
