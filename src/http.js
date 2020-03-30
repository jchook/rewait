const http = require('http')
const https = require('https')
const url = require('url')

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
    let rawData = ''
    const httpModule = options.protocol === 'http:' ? http : https
    const req = httpModule.request(options, res => {
      res.on('data', chunk => (rawData += chunk))
      res.on('end', () => {
        res.data = rawData
        resolve(res)
        req.destroy()
        res.destroy()
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
