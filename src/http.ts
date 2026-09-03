import http from 'node:http'
import https from 'node:https'

export {
  type CheckHttpResponseOptions,
  default as checkHttpResponse,
} from './checkHttpResponse.ts'

const DEFAULT_RESPONSE_TIMEOUT = 60000 // ms
const encode = encodeURIComponent
const defaultBaseUrl = new URL('http://localhost/')

/**
 * Authentication credentials
 */
export interface AuthCredentials {
  username: string
  password: string
}

/**
 * Options for the checkHttp() function
 */
export interface CheckHttpOptions {
  /**
   * Automatically encodes supplied credentials and attaches them to
   * requestOptions.
   */
  auth?: AuthCredentials

  /**
   * Destroy the request as soon as `checkOk` has run, without waiting for the
   * rest of the response body. This can save time when the response is large
   * or takes time to send.
   */
  bail?: boolean

  /**
   * The "base URL" to use when constructing the URL (2nd arg to new URL())
   */
  baseUrl?: URL

  /**
   * Check whether a response is OK. Throw an Error to indicate a not-ok state.
   *
   * Called as soon as response headers arrive, with the body still unread, so
   * the check may consume the stream, e.g. via {@link checkHttpResponse}.
   * Whatever is left of the body is drained after the check returns.
   */
  checkOk: (
    res: http.IncomingMessage,
    opts: CheckHttpOptions
  ) => any | Promise<any>

  /**
   * Alias for requestOptions.timeout, in milliseconds.
   */
  connectTimeout?: number

  /**
   * Data to write to the HTTP(S) request stream
   */
  data?: any

  /**
   * Whether to drain the response stream automatically after `checkOk` runs.
   * If you set this to false you must consume the stream yourself, e.g. in
   * `checkOk` or `onResponse`, or the check will hang until it times out.
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
  requestOptions: https.RequestOptions

  /**
   * Total request time timeout, in milliseconds. Covers connecting, waiting for
   * headers, running `checkOk`, and receiving the rest of the body.
   */
  timeout: number
}

/**
 * For future use
 */
export const defaultOptions: Partial<CheckHttpOptions> = {}

/**
 * Helper function for encoding the "auth" parameter of http.RequestOptions
 */
export function encodeHttpAuth(username: string, password: string): string {
  return `${encode(username)}:${encode(password)}`
}

/**
 * A deadline that rejects after `ms` milliseconds. When `ms` is not a number
 * the deadline never fires.
 */
function createDeadline(ms: unknown, onTimeout: () => void) {
  let timer: NodeJS.Timeout | undefined
  const promise = new Promise<never>((_resolve, reject) => {
    if (typeof ms === 'number') {
      timer = setTimeout(() => {
        // Reject before tearing down: Bun < 1.4 emits 'end' on the response
        // synchronously when the request is destroyed
        reject(new Error('HTTP response timeout'))
        onTimeout()
      }, ms)
    }
  })
  return {
    promise,
    clear: () => {
      if (timer) {
        clearTimeout(timer)
      }
    },
  }
}

/**
 * Send the request and resolve as soon as response headers arrive.
 */
function awaitResponse(req: http.ClientRequest, opts: CheckHttpOptions) {
  return new Promise<http.IncomingMessage>((resolve, reject) => {
    req.on('error', err => {
      if (typeof opts.onError === 'function') {
        opts.onError(err, opts)
      }
      reject(err)
    })

    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Connection timeout'))
    })

    if (opts.onRequest) {
      opts.onRequest(req, opts)
    }

    req.on('response', res => {
      if (opts.onResponse) {
        opts.onResponse(res, opts)
      }
      resolve(res)
    })

    if (opts.data) {
      req.write(opts.data)
    }

    req.end()
  })
}

/**
 * Resolve once the response body has been fully received, or reject if the
 * connection drops first.
 */
function awaitEnd(res: http.IncomingMessage) {
  return new Promise<void>((resolve, reject) => {
    const closedEarly = () => new Error('Response closed before completion')
    if (res.readableEnded) {
      resolve()
    } else if (res.destroyed) {
      reject(closedEarly())
    } else {
      res.once('end', resolve)
      res.once('error', reject)
      res.once('close', () => reject(closedEarly()))
    }
  })
}

function checkOk(res: http.IncomingMessage) {
  const ok = res?.statusCode && res.statusCode >= 200 && res.statusCode < 400
  if (!ok) {
    throw new Error(`Received HTTP error code: ${res.statusCode}`)
  }
}

function getUrlRequestOptions(url: URL): https.RequestOptions {
  const options: https.RequestOptions = {
    protocol: url.protocol,
    host: url.host,
    hostname: url.hostname,
    port: url.port,
    path: `${url.pathname}${url.search}`,
  }
  if (url.username || url.password) {
    // This is already uri-encoded
    options.auth = `${url.username}:${url.password}`
  }
  return options
}

/**
 * Exported for testing purposes only. Do not use.
 */
export function getForwardedRequestOptions(opts: Partial<CheckHttpOptions>) {
  const requestOptions: Partial<https.RequestOptions> = {}
  if (opts.auth) {
    requestOptions.auth = encodeHttpAuth(opts.auth.username, opts.auth.password)
  }
  if (typeof opts.connectTimeout === 'number') {
    requestOptions.timeout = opts.connectTimeout
  }
  return requestOptions
}

/**
 * Check to see if an HTTP resource is available
 */
export default function checkHttp(
  userUrl: string | URL,
  userOptions: Partial<CheckHttpOptions> = {}
) {
  const baseUrl = userOptions.baseUrl || defaultBaseUrl
  const url = new URL(userUrl, baseUrl)
  // const url = userUrl instanceof URL ? userUrl : new URL(userUrl, baseUrl)
  const options: CheckHttpOptions = {
    checkOk,
    timeout: DEFAULT_RESPONSE_TIMEOUT,
    ...userOptions,
    requestOptions: {
      ...getForwardedRequestOptions(userOptions),
      ...getUrlRequestOptions(url),
      ...userOptions.requestOptions,
    },
  }
  const httpModule = options.requestOptions.protocol === 'http:' ? http : https
  const check = async () => {
    const req = httpModule.request(options.requestOptions)
    const deadline = createDeadline(options.timeout, () => req.destroy())
    try {
      const res = await Promise.race([
        deadline.promise,
        awaitResponse(req, options),
      ])
      try {
        await Promise.race([deadline.promise, options.checkOk(res, options)])
        if (!options.bail) {
          if (options.flowingMode !== false) {
            res.resume()
          }
          await Promise.race([deadline.promise, awaitEnd(res)])
        }
      } finally {
        res.destroy()
      }
      return res
    } finally {
      deadline.clear()
      req.destroy()
    }
  }
  return check
}
