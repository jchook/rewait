import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'tape'
import { buildChecks, parseDuration } from '../../src/cli/build.ts'
import { parseArgs, UsageError } from '../../src/cli/parse.ts'

function build(argv: string[]) {
  return buildChecks(parseArgs(argv).checks)
}

function usage(t: test.Test, argv: string[], pattern: RegExp) {
  t.throws(
    () => build(argv),
    (err: unknown) => err instanceof UsageError && pattern.test(err.message),
    `${JSON.stringify(argv)} -> ${pattern}`
  )
}

test('duration flags treat 0 as no limit', t => {
  const built = build([
    'http://a/',
    '--max-time',
    '0',
    '--connect-timeout',
    '0',
    'tcp://b:1',
    '--response-timeout',
    '0',
    '--body-substring',
    'x',
  ])
  t.equal(built.length, 2)
  t.end()
})

test('parseDuration()', t => {
  t.equal(parseDuration('250', '-t'), 250, 'bare number is ms')
  t.equal(parseDuration('500ms', '-t'), 500)
  t.equal(parseDuration('1.5s', '-t'), 1500)
  t.equal(parseDuration('2m', '-t'), 120000)
  t.equal(parseDuration('1h', '-t'), 3600000)
  t.throws(
    () => parseDuration('5 sec', '--timeout'),
    /Invalid duration for --timeout: "5 sec"/
  )
  t.end()
})

test('buildChecks() builds every kind of check', t => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rewait-'))
  const dataFile = path.join(tmp, 'body.json')
  fs.writeFileSync(dataFile, '{}')
  const ca = path.join(
    import.meta.dirname,
    '..',
    'fixtures',
    'cert',
    'rootCA.pem'
  )
  const built = build([
    'http://a/',
    '-X',
    'post',
    '-H',
    'A: 1',
    '-u',
    'user',
    '--bail',
    '--connect-timeout',
    '1s',
    '--max-time',
    '2s',
    '--status',
    '200,204',
    '--status-range',
    '200-299',
    '--body-regex',
    '/ok/i',
    '--encoding',
    'latin1',
    'https://b/',
    '-d',
    `@${dataFile}`,
    '-u',
    'user:pass',
    '-k',
    '--cacert',
    ca,
    '--body-substring',
    'x',
    '--body-exact',
    'y',
    'tcp://c:1',
    '--send',
    `@${dataFile}`,
    '--response-timeout',
    '1s',
    'unix:///tmp/x.sock',
    'udp://[::1]:2',
    '--send',
    'x',
    '--body-regex',
    'ok',
    'udp://d:3',
    'file:///tmp/x',
    '--min-size',
    '1',
    '/tmp/y',
  ])
  t.deepEqual(
    built.map(b => b.label),
    [
      'http://a/',
      'https://b/',
      'tcp://c:1',
      'unix:///tmp/x.sock',
      'udp://[::1]:2',
      'udp://d:3',
      'file:///tmp/x',
      '/tmp/y',
    ]
  )
  t.ok(
    built.every(b => typeof b.check === 'function'),
    'every check is a function'
  )
  fs.rmSync(tmp, { recursive: true })
  t.end()
})

test('buildChecks() --min-size', async t => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rewait-'))
  const file = path.join(tmp, 'f')
  fs.writeFileSync(file, 'abc')
  await build([file, '--min-size', '3'])[0].check()
  t.pass('3 bytes >= 3')
  try {
    await build([file, '--min-size', '4'])[0].check()
    t.fail('should have thrown')
  } catch (err) {
    t.equal(
      (err as Error).message,
      'Expected a file of at least 4 bytes but it is 3 bytes'
    )
  }
  fs.rmSync(tmp, { recursive: true })
  t.end()
})

test('buildChecks() usage errors', t => {
  usage(
    t,
    ['http://a', '-H', 'nocolon'],
    /Invalid header for --header: "nocolon"/
  )
  usage(
    t,
    ['http://a', '--status', '2xx'],
    /Invalid status for --status: "2xx"/
  )
  usage(t, ['http://a', '--status', '200,'], /Invalid status for --status/)
  usage(
    t,
    ['http://a', '--status-range', '200'],
    /Invalid range for --status-range: "200"/
  )
  usage(
    t,
    ['http://a', '--body-regex', '('],
    /Invalid pattern for --body-regex/
  )
  usage(
    t,
    ['http://a', '--encoding', 'klingon'],
    /Unknown encoding for --encoding/
  )
  usage(t, ['http://a', '-d', '@/nonexistent'], /Cannot read file for --data/)
  usage(
    t,
    ['http://a', '--cacert', '/nonexistent'],
    /Cannot read file for --cacert/
  )
  usage(
    t,
    ['http://a', '--connect-timeout', 'x'],
    /Invalid duration for --connect-timeout/
  )
  usage(t, ['http://'], /Invalid URL: http:\/\//)
  usage(t, ['tcp://host'], /Invalid socket address: tcp:\/\/host/)
  usage(t, ['tcp://host:99999'], /Invalid socket address: tcp:\/\/host:99999/)
  usage(t, ['udp://host'], /Invalid UDP address: udp:\/\/host/)
  usage(t, ['udp://'], /Invalid UDP address: udp:\/\//)
  usage(t, ['udp://['], /Invalid UDP address: udp:\/\/\[/)
  usage(t, ['/f', '--min-size', 'big'], /Invalid size for --min-size: "big"/)
  t.end()
})
