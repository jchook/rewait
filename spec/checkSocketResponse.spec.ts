import dgram from 'node:dgram'
import net from 'node:net'
import test from 'tape'
import checkSocketResponse from '../src/checkSocketResponse.ts'
import socket from '../src/socket.ts'
import udp from '../src/udp.ts'
import { getAddrInfo } from './util.ts'

async function rejection(promise: Promise<unknown>): Promise<Error> {
  try {
    await promise
  } catch (err) {
    return err as Error
  }
  throw new Error('Expected promise to reject')
}

function tcpServer(onData: (data: string, sock: net.Socket) => void) {
  const server = net.createServer(sock => {
    sock.on('data', data => onData(String(data), sock))
  })
  server.listen()
  return { server, port: getAddrInfo(server).port }
}

test('checkSocketResponse() sends and matches over TCP', async t => {
  const { server, port } = tcpServer((data, sock) => {
    if (data === 'PING\r\n') {
      sock.write('+PONG\r\n')
    }
  })
  const client = await socket(`tcp://127.0.0.1:${port}`, {
    checkOk: checkSocketResponse({ send: 'PING\r\n', bodyRegex: /^\+PONG/ }),
  })()
  t.ok(client instanceof net.Socket, 'resolves with the socket')
  server.close()
  t.end()
})

test('checkSocketResponse() accumulates chunks until the body matches', async t => {
  const { server, port } = tcpServer((_data, sock) => {
    sock.write('hel')
    setTimeout(() => sock.write('lo'), 20)
  })
  await socket(`tcp://127.0.0.1:${port}`, {
    checkOk: checkSocketResponse({ send: 'x', bodyExact: 'hello' }),
  })()
  t.pass('matched across two chunks')
  server.close()
  t.end()
})

test('checkSocketResponse() decodes multibyte characters split across chunks', async t => {
  const bytes = Buffer.from('café')
  const { server, port } = tcpServer((_data, sock) => {
    sock.write(bytes.subarray(0, 4))
    setTimeout(() => sock.write(bytes.subarray(4)), 20)
  })
  await socket(`tcp://127.0.0.1:${port}`, {
    checkOk: checkSocketResponse({ send: 'x', bodyExact: 'café' }),
  })()
  t.pass('matched a character split across two chunks')
  server.close()
  t.end()
})

test('checkSocketResponse() with timeout Infinity waits for the socket', async t => {
  const { server, port } = tcpServer((_data, sock) => {
    setTimeout(() => sock.end('nope'), 20)
  })
  const err = await rejection(
    socket(`tcp://127.0.0.1:${port}`, {
      checkOk: checkSocketResponse({
        send: 'x',
        bodySubstring: 'yes',
        timeout: Infinity,
      }),
    })()
  )
  t.match(err.message, /^Socket closed before a matching response/)
  server.close()
  t.end()
})

test('checkSocketResponse() resolves immediately without body checks', async t => {
  let received = ''
  const { server, port } = tcpServer(data => {
    received += data
  })
  await socket(`tcp://127.0.0.1:${port}`, {
    checkOk: checkSocketResponse({ send: Buffer.from('hi') }),
  })()
  await socket(`tcp://127.0.0.1:${port}`, { checkOk: checkSocketResponse() })()
  await new Promise(resolve => setTimeout(resolve, 20))
  t.equal(received, 'hi', 'payload was sent')
  server.close()
  t.end()
})

test('checkSocketResponse() times out waiting for a match', async t => {
  const { server, port } = tcpServer((_data, sock) => sock.write('nope'))
  const err = await rejection(
    socket(`tcp://127.0.0.1:${port}`, {
      checkOk: checkSocketResponse({
        send: 'x',
        bodySubstring: 'yes',
        timeout: 50,
      }),
    })()
  )
  t.equal(
    err.message,
    'Timed out after 50ms waiting for a matching response: Expected response body to contain "yes" but received "nope"'
  )
  server.close()
  t.end()
})

test('checkSocketResponse() fails when the socket closes first', async t => {
  const { server, port } = tcpServer((_data, sock) => sock.end('nope'))
  const err = await rejection(
    socket(`tcp://127.0.0.1:${port}`, {
      checkOk: checkSocketResponse({ send: 'x', bodySubstring: 'yes' }),
    })()
  )
  t.equal(
    err.message,
    'Socket closed before a matching response: Expected response body to contain "yes" but received "nope"'
  )
  server.close()
  t.end()
})

test('checkSocketResponse() rejects on socket error', async t => {
  const { server, port } = tcpServer(() => {})
  const err = await rejection(
    socket(`tcp://127.0.0.1:${port}`, {
      checkOk: client => {
        const pending = checkSocketResponse({ bodySubstring: 'x' })(client)
        client.destroy(new Error('boom'))
        return pending
      },
    })()
  )
  t.equal(err.message, 'boom')
  server.close()
  t.end()
})

test('checkSocketResponse() encoding applies to send and receive', async t => {
  let received: Buffer | undefined
  const server = net.createServer(sock => {
    sock.on('data', data => {
      received = data
      sock.write(Buffer.from([0xca, 0xfe]))
    })
  })
  server.listen()
  await socket(`tcp://127.0.0.1:${getAddrInfo(server).port}`, {
    checkOk: checkSocketResponse({
      send: 'beef',
      bodyExact: 'cafe',
      encoding: 'hex',
    }),
  })()
  t.deepEqual([...(received || [])], [0xbe, 0xef], 'send was hex-decoded')
  server.close()
  t.end()
})

test('checkSocketResponse() works over UDP', async t => {
  const server = dgram.createSocket('udp4')
  server.on('message', (msg, rinfo) => {
    server.send(`ok:${msg}`, rinfo.port, rinfo.address)
  })
  await new Promise<void>(resolve => server.bind(0, '127.0.0.1', resolve))
  const client = await udp(server.address().port, '127.0.0.1', {
    checkOk: checkSocketResponse({
      send: 'health',
      bodySubstring: 'ok:health',
    }),
  })()
  t.ok(client instanceof dgram.Socket, 'resolves with the socket')
  server.close()
  t.end()
})
