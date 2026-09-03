import type http from 'node:http'

/**
 * Declarative response checks for use as the `checkOk` option of `http()`.
 *
 * A response is accepted when its status code matches `status` or falls
 * within `statusRange`. When neither is given, any 2xx or 3xx status is
 * accepted. Body checks are only applied once the status check passes, and
 * every body check given must pass.
 */
export interface CheckHttpResponseOptions {
  /**
   * Accept these exact status codes
   */
  status?: number | number[]

  /**
   * Accept status codes in this inclusive [min, max] range
   */
  statusRange?: [number, number]

  /**
   * The body must equal this string exactly
   */
  bodyExact?: string

  /**
   * The body must match this regular expression
   */
  bodyRegex?: RegExp

  /**
   * The body must contain this substring
   */
  bodySubstring?: string

  /**
   * Encoding used to decode the body. Defaults to utf8.
   */
  encoding?: BufferEncoding
}

const BODY_PREVIEW_LENGTH = 100

function describeStatus(opts: CheckHttpResponseOptions) {
  const parts: string[] = []
  if (typeof opts.status === 'number') {
    parts.push(String(opts.status))
  } else if (Array.isArray(opts.status)) {
    parts.push(...opts.status.map(String))
  }
  if (opts.statusRange) {
    parts.push(`${opts.statusRange[0]}-${opts.statusRange[1]}`)
  }
  return parts.join(' or ')
}

function checkStatus(code: number | undefined, opts: CheckHttpResponseOptions) {
  const custom = opts.status !== undefined || opts.statusRange !== undefined
  if (!custom) {
    if (!code || code < 200 || code >= 400) {
      throw new Error(`Received HTTP error code: ${code}`)
    }
    return
  }
  const ok =
    code !== undefined &&
    ((typeof opts.status === 'number' && code === opts.status) ||
      (Array.isArray(opts.status) && opts.status.includes(code)) ||
      (opts.statusRange !== undefined &&
        code >= opts.statusRange[0] &&
        code <= opts.statusRange[1]))
  if (!ok) {
    throw new Error(
      `Expected HTTP status ${describeStatus(opts)} but received ${code}`
    )
  }
}

function preview(body: string) {
  if (body.length <= BODY_PREVIEW_LENGTH) {
    return JSON.stringify(body)
  }
  return `${JSON.stringify(body.slice(0, BODY_PREVIEW_LENGTH))}...`
}

function checkBody(body: string, opts: CheckHttpResponseOptions) {
  if (opts.bodyExact !== undefined && body !== opts.bodyExact) {
    throw new Error(
      `Expected response body to equal ${JSON.stringify(
        opts.bodyExact
      )} but received ${preview(body)}`
    )
  }
  if (opts.bodySubstring !== undefined && !body.includes(opts.bodySubstring)) {
    throw new Error(
      `Expected response body to contain ${JSON.stringify(
        opts.bodySubstring
      )} but received ${preview(body)}`
    )
  }
  if (opts.bodyRegex !== undefined && !opts.bodyRegex.test(body)) {
    throw new Error(
      `Expected response body to match ${opts.bodyRegex} but received ${preview(
        body
      )}`
    )
  }
}

function needsBody(opts: CheckHttpResponseOptions) {
  return (
    opts.bodyExact !== undefined ||
    opts.bodySubstring !== undefined ||
    opts.bodyRegex !== undefined
  )
}

/**
 * Read the entire response body as a string
 */
function readBody(res: http.IncomingMessage, encoding: BufferEncoding) {
  return new Promise<string>((resolve, reject) => {
    if (res.readableEnded || res.destroyed) {
      reject(new Error('Response body is no longer readable'))
      return
    }
    const chunks: Buffer[] = []
    res.on('data', chunk => chunks.push(chunk))
    res.once('error', reject)
    res.once('end', () => resolve(Buffer.concat(chunks).toString(encoding)))
  })
}

/**
 * Build a `checkOk` function for `http()` that verifies the response status
 * code and, optionally, the response body.
 *
 * ```ts
 * http('http://localhost:8080/healthz', {
 *   checkOk: checkHttpResponse({ status: 200, bodySubstring: 'OK' }),
 * })
 * ```
 */
export default function checkHttpResponse(opts: CheckHttpResponseOptions = {}) {
  return async (res: http.IncomingMessage) => {
    checkStatus(res.statusCode, opts)
    if (needsBody(opts)) {
      checkBody(await readBody(res, opts.encoding || 'utf8'), opts)
    }
  }
}
