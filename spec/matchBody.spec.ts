import test from 'tape'
import { bodyMismatch, matchBody } from '../src/matchBody.ts'

test('bodyMismatch() with a global regex is not stateful', t => {
  const opts = { bodyRegex: /ok/g }
  t.equal(bodyMismatch('ok', opts), undefined, 'first call')
  t.equal(bodyMismatch('ok', opts), undefined, 'second call')
  t.equal(bodyMismatch('ok', opts), undefined, 'third call')
  t.match(bodyMismatch('no', opts) || '', /^Expected response body to match/)
  t.end()
})

test('matchBody() throws on the first failing check', t => {
  t.doesNotThrow(() => matchBody('hello', { bodySubstring: 'ell' }))
  t.throws(
    () => matchBody('hello', { bodyExact: 'hello', bodySubstring: 'x' }),
    /Expected response body to contain "x"/
  )
  t.end()
})
