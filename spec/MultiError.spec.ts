import test from 'tape'
import MultiError from '../src/MultiError'

test('MultiError', t => {
  const message = 'test message'
  const subErrorMessage = 'sub error'
  const subErr = new Error(subErrorMessage)
  const err = new MultiError(message, [subErr, 33])
  t.deepEqual(err.errors, [subErr, 33])

  const nextErr = new MultiError(message)
  t.deepEqual(nextErr.errors, [])
  nextErr.errors = [subErr, 42]
  t.deepEqual(nextErr.errors, [subErr, 42])
  t.equal(nextErr.message, message)
  t.end()
})

