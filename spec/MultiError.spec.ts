import test from 'tape'
import MultiError from '../src/MultiError'

test('MultiError', t => {
  const message = 'test message'
  const subErrorMessage = 'sub error'
  const err = new MultiError(message)
  const subErr = new Error(subErrorMessage)
  err.errors = [subErr, 33]
  t.deepEqual(err.errors, [subErr, 33])
  t.end()
})

