import type http from 'node:http'
import { hasBodyMatch, type MatchBodyOptions, matchBody } from './matchBody.ts'

/**
 * Declarative response checks for use as the `checkOk` option of `http()`.
 *
 * A response is accepted when its status code matches `status` or falls
 * within `statusRange`. When neither is given, any 2xx or 3xx status is
 * accepted. Body checks are only applied once the status check passes, and
 * every body check given must pass.
 */
export interface CheckHttpResponseOptions extends MatchBodyOptions {
  /**
   * Accept these exact status codes
   */
  status?: number | number[]

  /**
   * Accept status codes in this inclusive [min, max] range
   */
  statusRange?: [number, number]
}

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
    if (hasBodyMatch(opts)) {
      matchBody(await readBody(res, opts.encoding || 'utf8'), opts)
    }
  }
}
