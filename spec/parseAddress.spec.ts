import test from 'tape'
import parseAddress from '../src/parseAddress.ts'

test('parseAddress() URL forms', t => {
  t.deepEqual(parseAddress('tcp://h:3000'), { port: 3000, host: 'h' })
  t.deepEqual(parseAddress('tcp://[::1]:3000'), { port: 3000, host: '::1' })
  t.deepEqual(parseAddress('http://h'), { port: 80, host: 'h' }, 'http default')
  t.deepEqual(parseAddress('http://h:80'), { port: 80, host: 'h' })
  t.deepEqual(parseAddress('https://h'), { port: 443, host: 'h' })
  t.deepEqual(parseAddress('unix:///tmp/x.sock'), { path: '/tmp/x.sock' })
  t.deepEqual(parseAddress('tcp:///tmp/x.sock'), { path: '/tmp/x.sock' })
  t.end()
})

test('parseAddress() short forms', t => {
  t.deepEqual(parseAddress('h:3000'), { port: 3000, host: 'h' })
  t.deepEqual(parseAddress('127.0.0.1:3000'), { port: 3000, host: '127.0.0.1' })
  t.deepEqual(parseAddress('[::1]:3000'), { port: 3000, host: '::1' })
  t.deepEqual(parseAddress('tcp:h:3000'), { port: 3000, host: 'h' })
  t.deepEqual(parseAddress('tcp::3000'), { port: 3000, host: undefined })
  t.deepEqual(parseAddress('tcp:[::1]:3000'), { port: 3000, host: '::1' })
  t.deepEqual(parseAddress('/tmp/x.sock'), { path: '/tmp/x.sock' })
  t.deepEqual(parseAddress('x.sock'), { path: 'x.sock' }, 'relative path')
  t.end()
})

test('parseAddress() rejects what it cannot use', t => {
  const invalid = /Invalid socket address: /
  t.throws(() => parseAddress(''), invalid, 'empty')
  t.throws(() => parseAddress('tcp://h'), invalid, 'no port or path')
  t.throws(() => parseAddress('tcp://h:99999'), invalid, 'port out of range')
  t.throws(() => parseAddress('tcp:h:99999'), invalid, 'port out of range')
  t.throws(() => parseAddress('h:65536'), invalid, 'port out of range')
  t.throws(() => parseAddress('tcp://h:nope'), invalid, 'port not a number')
  t.throws(() => parseAddress('tcp://['), invalid, 'unparseable URL')
  t.end()
})
