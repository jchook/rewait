const path = require('path')
const net = require('net')
const test = require('tape')
const socket = require('./socket')

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
  t.plan(5)
  const port = 43425
  const server = net.createServer(sock => {
    t.ok(sock, 'server received connection')
  })
  server.listen(port, () => {
    socket({ port })().then(client => {
      t.ok(client instanceof net.Socket, 'callback receives socket instance')
      client.on('close', () => {
        t.ok(true, 'client closed')
        t.throws(client.close, 'cannot close again')
      })
      server.close(() => {
        t.ok(true, 'server closed')
      })
    })
  })
})

test('socket() connects with various URLs', t => {
  const server = net.createServer()
  server.listen(async () => {
    const { address, port } = server.address()
    t.ok(await socket(port)(), 'port only')
    t.ok(await socket('tcp::' + port)(), 'prot::port')
    t.ok(await socket('tcp:' + address + ':' + port)(), 'prot:host:port')
    server.close()
    t.end()
  })
})


test('socket() connects to IPC socket', t => {
  t.plan(5)
  const server = net.createServer()
  const sock = 'temp-sock'
  const fullPath = path.join(process.cwd(), sock)
  socket(sock)().catch(err => t.ok(err, 'cannot connect to non-listening sock'))
  server.listen(sock, async () => {
    t.ok(await socket(sock)(), 'only socket path')
    t.ok(await socket('tcp://' + fullPath)(), 'tcp:///full/path/to/sock')
    t.ok(await socket({ path: sock }), 'path specified in object')
    t.ok(await socket({ path: sock, port: 55 }), 'path overrides port')
    server.close()
  })
})
