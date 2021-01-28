const net = require('net')
const dgram = require('dgram')
const test = require('tape')
const socket = require('./socket')
const dns2 = require('dns2')

test('socket() throws when it cannot connect', async t => {
  t.plan(2)
  try {
    await socket({ port: 43424 })()
  } catch (err) {
    t.ok(err, 'throws an exception')
    t.match(err.message, /ECONNREFUSED 127.0.0.1:43424/)
  }
})

test('socket() connects via TCP', t => {
  t.plan(4)
  const port = 43424
  const server = net.createServer(sock => {
    t.ok(sock, 'server received connection')
  })
  server.listen(port, () => {
    socket({ port })().then(client => {
      t.ok(client instanceof net.Socket, 'callback receives socket instance')
      client.on('close', () => {
        t.ok(true, 'client closed')
      })
      server.close(() => {
        t.ok(true, 'server closed')
      })
    })
  })
})

test('socket() connects via UDP4', t => {
  t.plan(3)
  const port = 43424
  const server = dgram.createSocket('udp4')
  server.bind(port, () => {
    socket('udp:' + port)().then(client => {
      t.ok(client instanceof dgram.Socket, 'callback receives socket instance')
      client.on('close', () => {
        t.ok(true, 'client socket closed')
      })
      server.close(() => {
        t.ok(true, 'server socket closed')
      })
    })
  })
})

test('socket() connects via UDP6', t => {
  t.plan(2)
  const port = 43424
  const server = dgram.createSocket('udp6')
  server.bind(() => {
    const { address, port } = server.address()
    console.log({ address, port })
    server.close()
    // socket('udp:' + port)().then(client => {
    //   t.ok(client)
    //   server.close()
    // })
  })
})

