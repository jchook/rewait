import { Fn } from './fn'
export const NOT_READY = Symbol('NOT_READY')
export const READY = Symbol('READY')
export const WORKING = Symbol('WORKING')

/**
 * Each retried function MUST be in one of three states.
 *
 * Cannot use an enum for symbols yet, though this probably does not need
 * symbols anyway
 *
 * @link https://github.com/microsoft/TypeScript/issues/18408
 */
export type State = typeof NOT_READY | typeof READY | typeof WORKING

export interface RetryOptions {
  interval: number
  timeout: number
  timeoutError: () => Error
  verbose: false
}

/**
 * Default config
 */
const defaultOptions: RetryOptions = {
  interval: 250,
  timeout: Infinity,
  // TODO: pass state information into this function
  timeoutError: () => new Error('Timeout while waiting for remote resources'),
  verbose: false,

  // TODO: allow for injected "debug" function?
}

/**
 * Wait for resources to become available, retrying at set invervals.
 *
 * Note that retry() will not retry a given async check function until it
 * resolves. If it resolves faster than the interval, retry() will wait for
 * the balance of the interval time before retrying. The interval defaults to
 * 250ms.
 *
 * The timeout value throws an `Error` immediately after the given duration,
 * even if it has async processes still in progress. Defaults to Infinity.
 *
 * The returned `Promise` only resolves once all supplied check functions pass.
 * It returns the result of all the check functions. If you passed in a single
 * function (not an array), it will return the result of that single function.
 */
export default async function retry(
  fn: Fn | Fn[],
  userOptions: Partial<RetryOptions> = {}
) {
  const opts: RetryOptions = {
    ...defaultOptions,
    ...userOptions,
  }
  const debug = createDebug(opts.verbose)

  // Single wait or multiple?
  const singular = typeof fn === 'function'
  const fns = singular ? [fn] : fn

  // Absolute timeout
  // Everything races against this
  let timeout
  const timeoutPromise = new Promise((_resolve, reject) => {
    if (opts.timeout && opts.timeout !== Infinity) {
      timeout = setTimeout(() => reject(opts.timeoutError()), opts.timeout)
    }
  })

  // Keep track of active promises, results, and status
  const promises: Promise<void>[] = []
  const status: State[] = fns.map(() => NOT_READY)
  const results: any[] = [] // TODO: need to type this somehow

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
            if (status[idx] !== NOT_READY) {
              return promises[idx]
            }

            // [Re]try!
            const promise = fn()

            // Handle promises
            if (promise && promise.then && promise.catch) {
              status[idx] = WORKING
              return (promises[idx] = promise.then(result => {
                delete promises[idx]
                results[idx] = result
                status[idx] = READY
              })).catch(err => {
                // TODO: expose errors in a better way than console.warn
                debug(err)
                delete promises[idx]
                status[idx] = NOT_READY
              })
            }
            return promise
          })
        )
          // Only resolve if everything is ready
          .then(() => {
            notReady = status.some(x => x !== READY)
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
  clearTimeout(timeout)

  // Return either a single result or array of results
  return singular ? results[0] : results
}

function createDebug(verbose?: boolean) {
  if (verbose) {
    return (...args: any[]) => console.warn(...args)
  } else {
    return (..._args: any[]) => {}
  }
}
