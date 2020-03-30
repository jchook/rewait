const NOT_READY = Symbol('NOT_READY')
const READY = Symbol('READY')
const WORKING = Symbol('WORKING')

const globalConfig = {
  interval: 250,
  timeout: 0,
  verbose: false,
}

module.exports = retry

/**
 * Wait for stuff
 * @param {Array} fns async callbacks
 * @param {Object|null} userConfig
 */
async function retry(fns, userConfig) {
  const config = Object.assign({}, globalConfig, userConfig)
  const debug = createDebug(config.verbose)

  // Single wait or multiple?
  const singular = typeof fns === 'function'
  if (singular) {
    fns = [fns]
  }

  // Absolute timeout
  // Everything races against this
  let timeout
  const timeoutPromise = new Promise((resolve, reject) => {
    if (config.timeout) {
      timeout = setTimeout(() => reject('Timeout'), config.timeout)
    }
  })

  // Keep track of active promises, results, and status
  const promises = fns.map(() => {})
  const results = fns.map(() => {})
  const status = fns.map(() => NOT_READY)

  // Wait until all systems go (or error with timeout)
  let notReady = true
  do {
    // Wait until interval or all systems go (or error with timeout)
    await Promise.race([
      timeoutPromise,

      // Wait until interval or all systems go
      new Promise((resolve, reject) => {
        if (config.interval) {
          setTimeout(resolve, config.interval)
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
            if (promise.then && promise.catch) {
              status[idx] = WORKING
              return (promises[idx] = promise.then(result => {
                promises[idx] = undefined
                results[idx] = result
                status[idx] = READY
              })).catch(err => {
                debug(err)
                promises[idx] = undefined
                status[idx] = NOT_READY
              })
            }
            return promise
          })
        )
          // Only resolve if everything is A-OK
          .then(() => {
            notReady = status.some(x => x !== READY)
            if (!notReady) {
              resolve()
            }
          })

          // Just in case...
          // I don't expec this code will ever execute
          .catch(reject)
      }),
    ])
  } while (notReady)

  // Ok we're done then
  clearTimeout(timeout)

  // Return either a single result or array of results
  return singular ? results[0] : results
}

function createDebug(verbose) {
  if (verbose) {
    return (...args) => console.warn(...args)
  } else {
    return () => {}
  }
}
