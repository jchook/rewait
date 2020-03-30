const fs = require('fs')
const http = require('http')
const https = require('https')
const net = require('net')
const url = require('url')

const NOT_READY = Symbol('NOT_READY')
const READY = Symbol('READY')
const WORKING = Symbol('WORKING')

const globalConfig = {
  interval: 250,
  timeout: 0,
  verbose: false,
}

module.exports = {
  retry,
  file: checkFile,
  http: checkHttp,
  socket: checkSocket,
}

/**
 * Wait for stuff
 * @param {Array} waits async callbacks
 * @param {Object|null} userConfig
 */
async function retry(waits, userConfig) {
  const config = Object.assign({}, globalConfig, userConfig)
  const debug = createDebug(config.verbose)

  // Single wait or multiple?
  const singular = typeof waits === 'function'
  if (singular) {
    waits = [waits]
  }

  // Global timeout
  const timeout = new Promise((resolve, reject) => {
    if (config.timeout) {
      setTimeout(() => reject('Timeout'), config.timeout)
    }
  })

  // Wait until timeout or all systems go
  const promises = waits.map(() => {})
  const results = waits.map(() => {})
  const status = waits.map(() => NOT_READY)
  let notReady = true
  do {
    await Promise.race([
      timeout,
      new Promise((resolve, reject) => {
        if (config.interval) {
          setTimeout(resolve, config.interval)
        }
        Promise.allSettled(
          waits.map((fn, idx) => {
            switch (status[idx]) {
              case READY:
                return
              case WORKING:
                return promises[idx]
              case NOT_READY:
                break
            }
            const promise = fn()
            if (promise.then && promise.catch) {
              status[idx] = WORKING
              return (promises[idx] = promise.then(result => {
                promises[idx] = null
                results[idx] = result
                status[idx] = READY
              })).catch(err => {
                debug(err)
                promises[idx] = null
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
    return (...args) => console.log(...args)
  } else {
    return () => {}
  }
}

/**
 * Convenience conversion of a few option formats
 */
function parseHttpOptions(userOpt) {
  const opt = {}
  if (userOpt && typeof userOpt === 'object') {
    Object.assign(opt, userOpt)
  }
  if (opt.auth && opt.auth.user) {
    const encode = encodeURIComponent
    opt.auth = `${encode(opt.auth.user)}:${encode(opt.auth.pass)}`
  }
  if (typeof opt.protocol === 'string') {
    if (opt.protocol.substr(-1) !== ':') {
      opt.protocol = opt.protocol + ':'
    }
  }
  return opt
}

/**
 * Remove object keys assigned to null or undefined
 */
function filterNull(opt) {
  const next = {}
  Object.keys(opt).forEach(key => {
    if (opt[key] !== null && opt[key] !== undefined) {
      next[key] = opt[key]
    }
  })
  return next
}

/**
 * Promisify http.request()
 */
function httpRequest(options) {
  return new Promise((resolve, reject) => {
    let rawData = ''
    const httpModule = options.protocol === 'http:' ? http : https
    const req = httpModule.request(options, res => {
      res.on('data', chunk => (rawData += chunk))
      res.on('end', () => {
        res.data = rawData
        resolve(res)
      })
    })
    req.on('error', err => reject(err))
    if (options.data) {
      req.write(options.data)
    }
    req.end()
  })
}

function checkHttp(userUrl, userOptions) {
  const urlOptions =
    typeof userUrl === 'string' ? filterNull(url.parse(userUrl)) : userUrl
  const options = {
    checkOk: res => res.statusCode >= 200 && res.statusCode < 400,
    timeout: 1000,
    ...parseHttpOptions(urlOptions),
    ...parseHttpOptions(userOptions),
  }
  const safeUrl = (options.safeUrl = url.format({
    ...options,
    auth: null,
  }))
  return async () => {
    const res = await httpRequest(options)
    const ok = await options.checkOk(res, options)
    if (!ok) {
      throw new Error(
        `${options.method} ${safeUrl} failed with status ${res.statusCode}`
      )
    }
    return res
  }
}

function parseSocketOptions(str) {
  // Options object
  if (!str || typeof str !== 'string') {
    return str || {}
  }
  // UNIX socket path
  if (str[0] === '/') {
    return { path: str }
  }
  // host:port
  if (str.indexOf(':') > -1) {
    const [host, port] = str.split(':')
    return { host, port: parseInt(port) }
  }
  // port
  return { port: parseInt(str) }
}

/**
 * Promisify net.connect()
 */
function netConnect(options) {
  return new Promise((resolve, reject) => {
    const client = net.connect(options, () => resolve(client))
    client.on('error', reject)
  })
}

function checkSocket(path, options) {
  options = {
    close: true,
    checkOk: () => true,
    ...parseSocketOptions(path),
    ...parseSocketOptions(options),
  }
  return async () => {
    const client = await netConnect(options)
    const ok = await options.checkOk(client, options)
    if (options.close) {
      client.end()
    }
    if (!ok) {
      throw new Error(`Connection to ${url.format(options)} failed checkOk()`)
    }
    return client
  }
}

/**
 * Promisify fs.stat()
 */
function fsStat(path, options) {
  new Promise((resolve, reject) => {
    fs.stat(path, options, (err, stats) => {
      if (err) {
        reject(err)
      } else {
        resolve(stats)
      }
    })
  })
}

function checkFile(path, options) {
  options = {
    bigint: false,
    checkOk: x => x,
    ...options,
  }
  return async () => {
    const stats = await fsStat(path, options)
    const ok = await options.checkOk(stats, options)
    if (!ok) {
      new Error(`File ${path} failed checkOk()`)
    }
    return stats
  }
}
