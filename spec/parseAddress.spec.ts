import test from 'tape'
import parseAddress from '../src/parseAddress.ts'

test('parseAddress() plain paths', t => {
  t.deepEqual(parseAddress('/tmp/x.sock'), { path: '/tmp/x.sock' })
  t.deepEqual(parseAddress('/tmp/a:b.sock'), { path: '/tmp/a:b.sock' })
  t.deepEqual(parseAddress('./a:b.sock'), { path: './a:b.sock' })
  t.deepEqual(parseAddress('x.sock'), { path: 'x.sock' })
  t.deepEqual(parseAddress('\\\\.\\pipe\\x'), { path: '\\\\.\\pipe\\x' })
  t.end()
})

test('parseAddress() unix: URLs', t => {
  t.deepEqual(parseAddress('unix:///tmp/x.sock'), { path: '/tmp/x.sock' })
  t.deepEqual(parseAddress('unix:/tmp/x.sock'), { path: '/tmp/x.sock' })
  t.deepEqual(parseAddress('unix:/path/to:thing:with:colons'), {
    path: '/path/to:thing:with:colons',
  })
  t.deepEqual(parseAddress('unix:rel:a.sock'), { path: 'rel:a.sock' })
  t.deepEqual(parseAddress('unix:./rel.sock'), { path: './rel.sock' })
  t.deepEqual(
    parseAddress('unix:///tmp/my%20sock'),
    { path: '/tmp/my sock' },
    'percent-decoded'
  )
  t.deepEqual(parseAddress('tcp:///tmp/a:b.sock'), { path: '/tmp/a:b.sock' })
  t.end()
})

test('parseAddress() host and port URLs', t => {
  t.deepEqual(parseAddress('tcp://h:3000'), { port: 3000, host: 'h' })
  t.deepEqual(parseAddress('tcp://[::1]:3000'), { port: 3000, host: '::1' })
  t.deepEqual(parseAddress('redis://h:6379'), { port: 6379, host: 'h' })
  t.deepEqual(parseAddress('http://h'), { port: 80, host: 'h' })
  t.deepEqual(parseAddress('http://h:80'), { port: 80, host: 'h' })
  t.deepEqual(parseAddress('https://h'), { port: 443, host: 'h' })
  t.deepEqual(parseAddress('tcp:h:3000'), { port: 3000, host: 'h' })
  t.deepEqual(parseAddress('tcp:[::1]:3000'), { port: 3000, host: '::1' })
  t.deepEqual(parseAddress('tcp::3000'), { port: 3000, host: 'localhost' })
  t.end()
})

test('parseAddress() rejects what it cannot use', t => {
  const invalid = /Invalid socket address: /
  t.throws(() => parseAddress(''), invalid, 'empty')
  t.throws(() => parseAddress('tcp://h'), invalid, 'no port')
  t.throws(() => parseAddress('tcp://h:99999'), invalid, 'port out of range')
  t.throws(() => parseAddress('tcp:h:99999'), invalid, 'port out of range')
  t.throws(() => parseAddress('tcp://h:nope'), invalid, 'port not a number')
  t.throws(() => parseAddress('tcp://['), invalid, 'unparseable URL')
  t.throws(() => parseAddress('tcp:'), invalid, 'nothing after the scheme')
  t.throws(() => parseAddress('unix:'), invalid, 'no path')
  t.throws(() => parseAddress('unix:///a%zz'), invalid, 'bad percent-encoding')
  t.throws(
    () => parseAddress('unix://rel.sock'),
    /for a relative path write unix:rel.sock/,
    'relative path in the host slot'
  )
  t.throws(
    () => parseAddress('a:b.sock'),
    /write \.\/path or unix:path/,
    'relative path that looks like a scheme'
  )
  t.end()
})
