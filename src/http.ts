import http from 'http'
import https from 'https'

const DEFAULT_RESPONSE_TIMEOUT = 60000 // ms
const encode = encodeURIComponent
const baseUrl = new URL('http://localhost/')

/**
 * Options for the checkHttp() function
 */
export interface CheckHttpOptions {
  /**
   * Instantly destroy the request as soon as it connects?
   * This can save time when the response is large or takes time to send.
   */
  bail?: boolean

  /**
   * Check whether a response is OK
   */
  checkOk: (
    res: http.IncomingMessage,
    opts: CheckHttpOptions
  ) => void | Promise<any>

  /**
   * Data to write to the HTTP(S) request stream
   */
  data?: any

  /**
   * Whether to put the response stream into "flowing mode" automatically. If
   * you set this to false, you may need to call res.resume() manually in the
   * request's response callback.
   */
  flowingMode?: boolean

  /**
   * Callback to handle request error
   */
  onError?: (err: Error, opts: CheckHttpOptions) => void

  /**
   * Callback to handle a successful request
   */
  onRequest?: (req: http.ClientRequest, opts: CheckHttpOptions) => void

  /**
   * Callback to handle a response
   */
  onResponse?: (req: http.IncomingMessage, opts: CheckHttpOptions) => void

  /**
   * Node HTTP request options.
   * Note: The `timeout` option is for connect time only.
   */
  requestOptions?: https.RequestOptions

  /**
   * Total request time timeout, in milliseconds
   */
  timeout: number
}

/**
 * For future use
 */
export const defaultOptions: CheckHttpOptions = {
  checkOk,
  timeout: DEFAULT_RESPONSE_TIMEOUT,
}

/**
 * Helper function for encoding the "auth" parameter of http.RequestOptions
 */
export function encodeHttpAuth(username: string, password: string): string {
  return `${encode(username)}:${encode(password)}`
}

export function fixHttpOptions(userOpt: https.RequestOptions) {
  const opt = { ...userOpt }
  if (typeof opt.protocol === 'string') {
    if (opt.protocol.substring(-1) !== ':') {
      opt.protocol = opt.protocol + ':'
    }
  }
  return opt
}

/**
 * Promisify http.request()
 */
function httpRequest(checkOptions: CheckHttpOptions) {
  const options = checkOptions.requestOptions || {}
  return new Promise<http.IncomingMessage>((resolve, reject) => {
    const httpModule = options.protocol === 'http:' ? http : https
    const req = httpModule.request(options)
    let responseTimeout: NodeJS.Timeout | undefined

    // Timeout normally only applies to connections
    // If you want to simply connect and get a status code, use `{ bail: true }`
    if (checkOptions.timeout) {
      responseTimeout = setTimeout(() => {
        req.destroy()
        reject(new Error('HTTP response timeout'))
      }, checkOptions.timeout || DEFAULT_RESPONSE_TIMEOUT)
    }

    // Fail fast on errors
    req.on('error', err => {
      if (responseTimeout) {
        clearTimeout(responseTimeout)
      }
      if (typeof checkOptions.onError === 'function') {
        checkOptions.onError(err, checkOptions)
      }
      reject(err)
      req.destroy()
    })

    // Connection timeouts
    req.on('timeout', () => {
      if (responseTimeout) {
        clearTimeout(responseTimeout)
      }
      req.destroy()
      reject(new Error('Connection timeout'))
    })

    // User callback to add event handlers or store a reference to req
    if (checkOptions.onRequest) {
      checkOptions.onRequest(req, checkOptions)
    }

    // Response received -- I *think* this fires at the first TCP data packet
    req.on('response', res => {
      if (checkOptions.onResponse) {
        checkOptions.onResponse(res, checkOptions)
      }

      // Bail as early as possible?
      if (checkOptions.bail) {
        if (responseTimeout) {
          clearTimeout(responseTimeout)
        }
        resolve(res)
        res.destroy()
        req.destroy()
        return
      }

      // Switch on "flowing mode" by default so the response is downloaded,
      // otherwise the request may never complete.
      if (checkOptions.flowingMode !== false) {
        res.resume()
      }

      // Once all data is received, resolve
      res.on('end', () => {
        if (responseTimeout) {
          clearTimeout(responseTimeout)
        }
        resolve(res)
        res.destroy()
        req.destroy()
      })
    })

    // Write data?
    if (checkOptions.data) {
      req.write(checkOptions.data)
    }

    // Close the outbound pipe
    req.end()
  })
}

function checkOk(res: http.IncomingMessage) {
  const ok =
    res && res.statusCode && res.statusCode >= 200 && res.statusCode < 400
  if (!ok) {
    throw new Error('Received HTTP error code: ' + res.statusCode)
  }
}

function getUrlRequestOptions(url: URL): https.RequestOptions {
  return {
    protocol: url.protocol,
    host: url.host,
    hostname: url.hostname,
    port: url.port,
    path: `${url.pathname}${url.search}`,
    // This is already encoded
    // auth: encodeHttpAuth(url.username, url.password),
    auth: `${url.username}:${url.password}`
  }
}

/**
 * Check to see if an HTTP resource is available
 */
export default function checkHttp(
  userUrl: string | URL,
  userOptions: Partial<CheckHttpOptions> = {}
) {
  const url = userUrl instanceof URL ? userUrl : new URL(userUrl, baseUrl)
  const options: CheckHttpOptions = {
    ...defaultOptions,
    ...userOptions,
    requestOptions: {
      ...getUrlRequestOptions(url),
      ...userOptions.requestOptions,
    },
  }
  const check = async () => {
    const res = await httpRequest(options)
    await options.checkOk(res, options)
    return res
  }
  return check
}
