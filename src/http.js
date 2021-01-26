const http = require('http')
const https = require('https')
const url = require('url')

const DEFAULT_RESPONSE_TIMEOUT = 60000 // ms

module.exports = checkHttp

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
    const httpModule = options.protocol === 'http:' ? http : https
    const req = httpModule.request(options)
    let responseTimeout

    // Timeout normally only applies to connections
    // If you want to simply connect and get a status code, use `{ bail: true }`
    if (options.timeout !== false) {
      responseTimeout = setTimeout(() => {
        req.destroy()
        reject(new Error('HTTP timeout'))
      }, options.timeout || DEFAULT_RESPONSE_TIMEOUT)
    }

    // Fail fast on errors
    req.on('error', err => {
      clearTimeout(responseTimeout)
      reject(err)
      req.destroy()
    })

    // User callback to add event handlers or store a reference to req
    if (options.onRequest) {
      options.onRequest(req, options)
    }

    // Response received -- I *think* this fires at the first TCP data packet
    req.on('response', res => {
      if (typeof options.onResponse === 'function') {
        options.onResponse(res)
      }

      // Bail as early as possible?
      if (options.bail) {
        clearTimeout(responseTimeout)
        resolve(res)
        res.destroy()
        req.destroy()
        return
      }

      // Switch on "flowing mode" by default so the response is downloaded,
      // otherwise the request may never complete.
      if (options.flowingMode !== false) {
        res.resume()
      }

      // Once all data is received, resolve
      res.on('end', () => {
        clearTimeout(responseTimeout)
        resolve(res)
        res.destroy()
        req.destroy()
      })
    })

    // Write data?
    if (options.data) {
      req.write(options.data)
    }

    // Close the outbound pipe
    req.end()
  })
}

function checkOk(res) {
  return res && res.statusCode >= 200 && res.statusCode < 400
}

function checkHttp(userUrl, userOptions) {
  const urlOptions =
    typeof userUrl === 'string' ? filterNull(url.parse(userUrl)) : userUrl
  const options = {
    checkOk: checkOk,
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
        `http ${options.method} ${safeUrl} failed with status ${res.statusCode}`
      )
    }
    return res
  }
}
