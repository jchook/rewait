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
  t.plan(3)
  let interval
  let response

  // Build server that streams data forever
  const server = http.createServer((req, res) => {
    t.ok(req, 'server received request')
    const write = () => res.write('42\n')
    write()
    interval = setInterval(write, 1000)
    response = res
  })
  server.listen()

  // Make request
  const url = `http://localhost:${server.address().port}`
  return checkHttp(url, {
    bail: true, // without this it will hang
    onRequest: req => {
      t.ok(req, 'client made a request')
    },
  })()
    .then(
      () =>
        new Promise(resolve => {
          server.close(err => {
            t.notOk(err)
            resolve()
          })
        })
    )
    .finally(() => {
      // Tear-down infinite data stream server
      clearInterval(interval)
      response.end()
      server.close()
    })
})

test('timeout when server fails to send data', t => {
  t.plan(3)
  let response

  // Build server that never sends data
  const server = http.createServer((req, res) => {
    t.ok(req, 'server received request')
    response = res
  })
  server.listen()

  // Make request
  const url = `http://localhost:${server.address().port}`
  return checkHttp(url, {
    timeout: 100,
    responseTimeout: 100,
    onRequest: req => {
      t.ok(req, 'client made a request')
    },
  })()
    .then(() => t.fail('Did not timeout'))
    .catch(err => t.ok(err, 'timeout occurred'))
    .finally(() => {
      if (response) {
        response.end()
        server.close()
      }
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
