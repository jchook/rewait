import { CheckFunction } from './fn'
import MultiError from './MultiError'

/**
 * Each retried function MUST be in one of three states.
 */
export enum RetryState {
  NOT_READY = 'NOT_READY',
  READY = 'READY',
  WORKING = 'WORKING',
}

export interface RetryOptions {
  interval: number
  timeout: number
  timeoutError: (errors: any[]) => Error
}

/**
 * Default config
 */
const defaultOptions: RetryOptions = {
  interval: 250,
  timeout: Infinity,
  // TODO: pass more state information into this function
  timeoutError: (errors: any[]) => {
    const err = new MultiError('Timeout while waiting for remote resources')
    err.errors = errors
    return err
  },
}

/**
 * Wait for resources to become available, retrying at set invervals.
 *
 * Note that retry() will not retry a given async check function until it
 * resolves. If it resolves faster than the interval, retry() will wait for
 * the balance of the interval time before retrying. The interval defaults to
 * 250ms.
 *
 * The timeout controller throws an `Error` immediately after the duration,
 * even with an async processes still in progress. It defaults to Infinity.
 *
 * The returned `Promise` only resolves once all supplied check functions pass.
 * It returns the result of all the check functions. If you passed in a single
 * function (not an array), it will return the result of that single function.
 */
export default async function retry(
  fn: CheckFunction | CheckFunction[],
  userOptions: Partial<RetryOptions> = {}
) {
  const opts: RetryOptions = {
    ...defaultOptions,
    ...userOptions,
  }

  // Single wait or multiple?
  const singular = typeof fn === 'function'
  const fns: CheckFunction[] = singular ? [fn] : fn

  // Keep track of active promises, results, and status
  const promises: Promise<void>[] = []
  const status: RetryState[] = fns.map(() => RetryState.NOT_READY)
  const results: any[] = [] // TODO: want to type this somehow
  const errors: any[] = []

  // Absolute timeout
  // Everything races against this
  let timeout: NodeJS.Timeout | undefined
  const timeoutPromise = new Promise((_resolve, reject) => {
    if (opts.timeout && opts.timeout !== Infinity) {
      timeout = setTimeout(
        () => reject(opts.timeoutError(errors)),
        opts.timeout
      )
    }
  })

  // Retry until ready (or timeout)
  let notReady = true

  do {
    // Wait until ready or interval (or timeout)
    await Promise.race([
      timeoutPromise,

      // Wait until ready or interval
      new Promise<void>((resolve, reject) => {
        if (opts.interval) {
          setTimeout(resolve, opts.interval)
        }

        // Trigger any NOT_READY checks
        Promise.allSettled(
          fns.map((fn, idx) => {
            // Don't retry READY or WORKING fns
            if (status[idx] !== RetryState.NOT_READY) {
              return promises[idx]
            }

            try {
              // [Re]try!
              const promise = fn()

              // Handle promises
              if (promise && typeof promise.then === 'function') {
                status[idx] = RetryState.WORKING
                return (promises[idx] = promise.then(
                  (result: any) => {
                    delete promises[idx]
                    results[idx] = result
                    status[idx] = RetryState.READY
                  },
                  (err: any) => {
                    delete promises[idx]
                    status[idx] = RetryState.NOT_READY
                    errors[idx] = err
                  }
                ))
              }

              // Non-promise OK
              status[idx] = RetryState.READY
              results[idx] = promise
              return promise
            } catch (err) {
              // Non-promise error
              errors[idx] = err
            }
          })
        )
          // Only resolve if everything is ready
          .then(() => {
            notReady = status.some(x => x !== RetryState.READY)
            if (!notReady) {
              resolve()
            }
          })

          // Forward any structural errors...
          // I don't expect this code will ever execute
          .catch(reject)
      }),
    ])
  } while (notReady)

  // Ok we're done then
  if (timeout) {
    clearTimeout(timeout)
  }

  // Return either a single result or array of results
  return singular ? results[0] : results
}
