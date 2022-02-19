import test from 'tape'
import retry from './retry'

interface FnCall {
  args: any[]
  at: Date
}

function createChecker(numCalls = 3, lag = 10) {
  const calls: FnCall[] = []
  const check = (...args: any[]) => {
    return new Promise((resolve, reject) => {
      calls.push({ args, at: new Date() })
      if (calls.length >= numCalls) {
        setTimeout(resolve, lag)
      } else {
        setTimeout(reject, lag)
      }
    })
  }
  const reset = () => {
    calls.length = 0
  }
  return { calls, check, reset }
}

test('retry until success', async t => {
  t.plan(1)
  const checker = createChecker(3, 10)
  await retry(checker.check)
  t.ok(checker.calls.length === 3, 'called 3 times')
})

test('retry timeout', async t => {
  t.plan(2)
  const checker = createChecker(3, 150)
  try {
    await retry(checker.check, {
      interval: 10,
      timeout: 250,
    })
  } catch (err) {
    t.ok(err, 'check timed out')
    t.equal(checker.calls.length, 2)
  }
})

test('retry interval', async t => {
  t.plan(2)
  const checker = createChecker(3, 10)
  try {
    await retry(checker.check, {
      interval: 25,
      timeout: 50,
    })
  } catch (err) {
    t.ok(err, 'check timed out')
    t.equal(checker.calls.length, 2)
  }
})

test('staggered retry', async t => {
  const slow = createChecker(5, 100)
  const fast = createChecker(5, 10)
  try {
    await retry([slow.check, fast.check], {
      interval: 25,
      timeout: 200,
    })
  } catch (err) {
    t.ok(err, 'timeout')
    t.equal(slow.calls.length, 2, 'only called slow checker 2x in 200ms')
    t.equal(fast.calls.length, 5, 'called fast checker 5x in 200ms')
    t.ok(
      slow.calls[1].at.getTime() - slow.calls[0].at.getTime() >= 100,
      'retry waited patiently to retry slow check'
    )
  }
})
