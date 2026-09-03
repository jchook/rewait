import test from 'tape'
import { classify, parseArgs, UsageError } from '../../src/cli/parse.ts'

function usage(t: test.Test, argv: string[], message: string) {
  t.throws(
    () => parseArgs(argv),
    (err: unknown) => err instanceof UsageError && err.message === message,
    `${JSON.stringify(argv)} -> ${message}`
  )
}

test('classify() picks the check kind from the scheme', t => {
  t.equal(classify('http://x'), 'http')
  t.equal(classify('HTTPS://x'), 'http')
  t.equal(classify('tcp://x:1'), 'socket')
  t.equal(classify('unix:///x.sock'), 'socket')
  t.equal(classify('udp://x:1'), 'udp')
  t.equal(classify('file:///x'), 'file')
  t.equal(classify('/x'), 'file')
  t.equal(classify('./x'), 'file')
  t.equal(classify('C:\\x'), 'file')
  t.throws(
    () => classify('ftp://x'),
    /Unsupported scheme "ftp:" in ftp:\/\/x/,
    'unsupported scheme'
  )
  t.end()
})

test('parseArgs() scopes options to the preceding check', t => {
  const parsed = parseArgs([
    '-t',
    '5s',
    'http://a',
    '-X',
    'POST',
    '-H',
    'A: 1',
    '--header=B: 2',
    '--bail',
    'tcp://b:1',
    '--send',
    'x',
    '--interval=10',
    '/c',
    '--min-size',
    '3',
    '-v',
  ])
  t.deepEqual(parsed.global, { timeout: '5s', interval: '10', verbose: true })
  t.deepEqual(parsed.checks, [
    {
      target: 'http://a',
      kind: 'http',
      flags: { request: 'POST', header: ['A: 1', 'B: 2'], bail: true },
    },
    { target: 'tcp://b:1', kind: 'socket', flags: { send: 'x' } },
    { target: '/c', kind: 'file', flags: { 'min-size': '3' } },
  ])
  t.end()
})

test('parseArgs() last value wins for non-repeatable options', t => {
  const parsed = parseArgs(['http://a', '-X', 'PUT', '-X', 'POST'])
  t.equal(parsed.checks[0].flags.request, 'POST')
  t.end()
})

test('parseArgs() treats everything after -- as a check', t => {
  const parsed = parseArgs(['--once', '--', '-weird', '--file'])
  t.deepEqual(parsed.global, { once: true })
  t.deepEqual(
    parsed.checks.map(c => c.target),
    ['-weird', '--file']
  )
  t.equal(parseArgs(['-']).checks[0].target, '-', 'lone dash is a target')
  t.end()
})

test('parseArgs() usage errors', t => {
  usage(t, ['--nope'], 'Unknown option: --nope')
  usage(t, ['-z'], 'Unknown option: -z')
  usage(t, ['-tv'], 'Unknown option: -tv')
  t.deepEqual(parseArgs(['--']), { global: {}, checks: [] }, 'bare -- is fine')
  usage(t, ['---'], 'Unknown option: ---')
  usage(t, ['-t'], 'Option -t, --timeout requires a value')
  usage(t, ['--once=yes'], 'Option --once does not take a value')
  usage(t, ['--status', '200'], 'Option --status must follow a check')
  usage(
    t,
    ['tcp://a:1', '--status', '200'],
    'Option --status does not apply to TCP or Unix socket checks'
  )
  usage(t, ['/a', '--send', 'x'], 'Option --send does not apply to file checks')
  usage(
    t,
    ['udp://a:1', '-X', 'GET'],
    'Option -X, --request does not apply to UDP checks'
  )
  usage(
    t,
    ['http://a', '--min-size', '1'],
    'Option --min-size does not apply to HTTP checks'
  )
  t.end()
})
