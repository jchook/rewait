import dgram from 'node:dgram'
import test from 'tape'
import udp from '../src/udp.ts'

// Shit b/c UDP is connectionless there's no easy universal way to verify
// that the service is "up"
// test('socket() fails correctly', t => {
//   t.plan(1)
//   const port = 43425
//   udp({ port })().then(client => {
//     t.notOk(client, 'should not succeed')
//   }).catch(err => t.ok(err, 'throws an error'))
// })

test('socket() connects via UDP4', t => {
  t.plan(4)
  const port = 43424
  const server = dgram.createSocket('udp4')
  server.bind(port, () => {
    udp(port)()
      .then(client => {
        t.ok(
          client instanceof dgram.Socket,
          'callback receives socket instance'
        )
        client.on('close', () => {
          t.ok(true, 'client socket closed')
          t.throws(() => client.close(), 'socket already closed')
        })
        server.close(() => {
          t.ok(true, 'server socket closed')
        })
      })
      .catch(err => t.notOk(err, 'should not error'))
  })
})

test('udp() detects udp4 from a dotted-quad address', t => {
  t.plan(1)
  const server = dgram.createSocket('udp4')
  server.bind(0, '127.0.0.1', () => {
    const { port } = server.address()
    udp(port, '127.0.0.1')()
      .then(client => {
        t.ok(client instanceof dgram.Socket, 'client connected via udp4')
        server.close()
      })
      .catch(err => t.notOk(err, 'should not error'))
  })
})

test('udp() detects udp6 from an address containing a colon', t => {
  t.plan(1)
  const server = dgram.createSocket('udp6')
  server.bind(0, '::1', () => {
    const { port } = server.address()
    udp(port, '::1')()
      .then(client => {
        t.ok(client instanceof dgram.Socket, 'client connected via udp6')
        server.close()
      })
      .catch(err => t.notOk(err, 'should not error'))
  })
})

test('udp() falls back to udp4 for hostnames', t => {
  t.plan(1)
  const server = dgram.createSocket('udp4')
  server.bind(0, '127.0.0.1', () => {
    const { port } = server.address()
    udp(port, 'localhost')()
      .then(client => {
        t.ok(client instanceof dgram.Socket, 'client connected via hostname')
        server.close()
      })
      .catch(err => t.notOk(err, 'should not error'))
  })
})

test('udp() tolerates checkOk closing the socket itself', t => {
  t.plan(2)
  const server = dgram.createSocket('udp4')
  server.bind(0, '127.0.0.1', () => {
    const { port } = server.address()
    udp(port, '127.0.0.1', {
      checkOk: client => {
        client.close()
        t.ok(true, 'checkOk closed the socket')
      },
    })()
      .then(client => {
        t.ok(client instanceof dgram.Socket, 'still resolves with the socket')
        server.close()
      })
      .catch(err => t.notOk(err, 'should not error'))
  })
})

// test('socket() connects via UDP6', t => {
//   t.plan(2)
//   const port = 43424
//   const server = dgram.createSocket('udp6')
//   server.bind(() => {
//     const { address, port } = server.address()
//     console.log({ address, port })
//     server.close()
//     // socket('udp:' + port)().then(client => {
//     //   t.ok(client)
//     //   server.close()
//     // })
//   })
// })
