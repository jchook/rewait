import dgram from 'dgram'
import test from 'tape'
import udp from '../src/udp'

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
    udp(port)().then(client => {
      t.ok(client instanceof dgram.Socket, 'callback receives socket instance')
      client.on('close', () => {
        t.ok(true, 'client socket closed')
        t.throws(() => client.close(), 'socket already closed')
      })
      server.close(() => {
        t.ok(true, 'server socket closed')
      })
    }).catch(err => t.notOk(err, 'should not error'))
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
