const http = require('http')
const https = require('https')
const net = require('net')

const globalConfig = {
  interval: 250,
  timeout: 0,
  verbose: false,
}

module.exports = {
  all: waitAll,
  http: waitHttp,
  socket: waitSocket,
}

/**
 * Wait for stuff
 * @param {Array} waits async callbacks
 * @param {Object|null} userConfig
 */
async function waitAll(waits, userConfig) {
  const config = Object.assign({}, globalConfig, userConfig)
  const debug = createDebug(config)

  // Global timeout
  let timeout = new Promise((resolve, reject) => {
    if (config.timeout) {
      setTimeout(() => reject('Timeout'), config.timeout)
    }
  })

  // Presume nothing is ready by default
  let ready = waits.map(() => false)
  do {
    // Check all the waits
    await Promise.race([
      timeout,
      Promise.all(
        waits.map((fn, idx) => {
          if (ready[idx]) {
            return true
          }
          const promise = fn()
          if (promise.then && promise.catch) {
            return promise
              .catch(err => {
                debug(err)
                return false
              })
              .then(result => {
                ready[idx] = result
              })
          }
          return promise
        })
      ),
    ])

    // Wait a sec
    await Promise.race([timeout, pause(config.interval)])
  } while (ready.some(x => !x))
}

function pause(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function createDebug(config) {
  if (config.verbose) {
    return (...args) => console.log(...args)
  } else {
    return () => {}
  }
}

function parseHttpOptions(userOpt) {
  const opt = {}
  if (userOpt && (typeof userOpt === 'object')) {
    Object.assign(opt, userOpt)
  }
  if (opt.auth && opt.auth.user) {
    const encode = encodeURIComponent
    opt.auth = `${encode(opt.auth.user)}:${encode(opt.auth.pass)}`
  }
  return opt
}

function waitHttp(url, userOptions) {
  const options = {
    checkOk: res => res.statusCode >= 200 && res.statusCode < 400,
    timeout: 1000,
    ...parseHttpOptions(userOptions),
  }
  const httpModule = url.match(/^https:\/\//) ? https : http
  return () =>
    new Promise((resolve, reject) => {
      const req = httpModule.request(url, options, res => {
        if (options.checkOk(res)) {
          resolve(res)
        } else {
          reject(res)
        }
        res.on('error', err => reject(err))
      })
      req.on('error', err => reject(err))
      if (options.data) {
        req.write(options.data)
      }
      req.end()
    })
}

function parseSocketString(str) {
  // Options object
  if (!str || typeof str === 'object') {
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
  return parseInt(str)
}

function waitSocket(options) {
  options = parseSocketString(options)
  return () =>
    new Promise((resolve, reject) => {
      const conn = net.connect(options, resolve)
      conn.on('error', reject)
    })
}
