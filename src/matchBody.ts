/**
 * Declarative checks against a decoded response body. Every check given must
 * pass.
 */
export interface MatchBodyOptions {
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

/**
 * Whether any body check was requested
 */
export function hasBodyMatch(opts: MatchBodyOptions) {
  return (
    opts.bodyExact !== undefined ||
    opts.bodySubstring !== undefined ||
    opts.bodyRegex !== undefined
  )
}

function preview(body: string) {
  if (body.length <= BODY_PREVIEW_LENGTH) {
    return JSON.stringify(body)
  }
  return `${JSON.stringify(body.slice(0, BODY_PREVIEW_LENGTH))}...`
}

/**
 * Returns a description of the first failing body check, or undefined when
 * every check passes.
 */
export function bodyMismatch(
  body: string,
  opts: MatchBodyOptions
): string | undefined {
  if (opts.bodyExact !== undefined && body !== opts.bodyExact) {
    return `Expected response body to equal ${JSON.stringify(
      opts.bodyExact
    )} but received ${preview(body)}`
  }
  if (opts.bodySubstring !== undefined && !body.includes(opts.bodySubstring)) {
    return `Expected response body to contain ${JSON.stringify(
      opts.bodySubstring
    )} but received ${preview(body)}`
  }
  if (opts.bodyRegex !== undefined && !opts.bodyRegex.test(body)) {
    return `Expected response body to match ${opts.bodyRegex} but received ${preview(
      body
    )}`
  }
}

/**
 * Throw unless every body check passes
 */
export function matchBody(body: string, opts: MatchBodyOptions) {
  const mismatch = bodyMismatch(body, opts)
  if (mismatch) {
    throw new Error(mismatch)
  }
}
