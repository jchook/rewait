import fs from 'node:fs'
import type https from 'node:https'
import { fileURLToPath } from 'node:url'
import checkHttpResponse, {
  type CheckHttpResponseOptions,
} from '../checkHttpResponse.ts'
import checkSocketResponse, {
  type CheckSocketResponseOptions,
} from '../checkSocketResponse.ts'
import file from '../file.ts'
import type { CheckFunction } from '../fn.ts'
import http, { type CheckHttpOptions } from '../http.ts'
import type { MatchBodyOptions } from '../matchBody.ts'
import parseAddress from '../parseAddress.ts'
import socket from '../socket.ts'
import udp from '../udp.ts'
import { type FlagValues, type ParsedCheck, UsageError } from './parse.ts'

export interface BuiltCheck {
  label: string
  check: CheckFunction
}

/**
 * Parse a duration such as 500ms, 5s, 2m or 1h into milliseconds. A bare
 * number is taken as milliseconds. Every duration flag treats 0 as "no limit",
 * so callers should map 0 to whatever disables the limit in question.
 */
export function parseDuration(value: string, flag: string): number {
  const match = value.match(/^(\d+(?:\.\d+)?)(ms|s|m|h)?$/)
  if (!match) {
    throw new UsageError(
      `Invalid duration for ${flag}: "${value}" (expected e.g. 500ms, 5s or 2m)`
    )
  }
  const units = { ms: 1, s: 1000, m: 60000, h: 3600000 }
  return parseFloat(match[1]) * units[(match[2] || 'ms') as keyof typeof units]
}

function str(flags: FlagValues, name: string): string | undefined {
  return flags[name] as string | undefined
}

function list(flags: FlagValues, name: string): string[] {
  return (flags[name] as string[] | undefined) || []
}

function duration(flags: FlagValues, name: string): number | undefined {
  const value = str(flags, name)
  return value === undefined ? undefined : parseDuration(value, `--${name}`)
}

/**
 * Resolve a data argument, reading it from a file when it starts with @
 */
function data(value: string, flag: string): string | Buffer {
  if (!value.startsWith('@')) {
    return value
  }
  return readFile(value.slice(1), flag)
}

function readFile(path: string, flag: string): Buffer {
  try {
    return fs.readFileSync(path)
  } catch (err) {
    throw new UsageError(
      `Cannot read file for ${flag}: ${(err as Error).message}`
    )
  }
}

function parseStatus(value: string): number | number[] {
  const codes = value.split(',').map(code => {
    if (!/^\d{3}$/.test(code.trim())) {
      throw new UsageError(
        `Invalid status for --status: "${value}" (expected e.g. 200 or 200,204)`
      )
    }
    return parseInt(code, 10)
  })
  return codes.length === 1 ? codes[0] : codes
}

function parseStatusRange(value: string): [number, number] {
  const match = value.match(/^(\d{3})-(\d{3})$/)
  if (!match) {
    throw new UsageError(
      `Invalid range for --status-range: "${value}" (expected e.g. 200-299)`
    )
  }
  return [parseInt(match[1], 10), parseInt(match[2], 10)]
}

function parseRegex(value: string): RegExp {
  const match = value.match(/^\/(.*)\/([a-z]*)$/s)
  try {
    return match ? new RegExp(match[1], match[2]) : new RegExp(value)
  } catch (err) {
    throw new UsageError(
      `Invalid pattern for --body-regex: ${(err as Error).message}`
    )
  }
}

function bodyOptions(flags: FlagValues): MatchBodyOptions {
  const opts: MatchBodyOptions = {}
  const substring = str(flags, 'body-substring')
  const regex = str(flags, 'body-regex')
  const exact = str(flags, 'body-exact')
  const encoding = str(flags, 'encoding')
  if (substring !== undefined) {
    opts.bodySubstring = substring
  }
  if (regex !== undefined) {
    opts.bodyRegex = parseRegex(regex)
  }
  if (exact !== undefined) {
    opts.bodyExact = exact
  }
  if (encoding !== undefined) {
    if (!Buffer.isEncoding(encoding)) {
      throw new UsageError(`Unknown encoding for --encoding: "${encoding}"`)
    }
    opts.encoding = encoding
  }
  return opts
}

function buildHttp({ target, flags }: ParsedCheck): CheckFunction {
  const requestOptions: https.RequestOptions = {}
  const opts: Partial<CheckHttpOptions> = { requestOptions }

  const headers: Record<string, string> = {}
  for (const header of list(flags, 'header')) {
    const idx = header.indexOf(':')
    if (idx === -1) {
      throw new UsageError(
        `Invalid header for --header: "${header}" (expected "Name: value")`
      )
    }
    headers[header.slice(0, idx).trim()] = header.slice(idx + 1).trim()
  }
  if (Object.keys(headers).length > 0) {
    requestOptions.headers = headers
  }

  const body = str(flags, 'data')
  if (body !== undefined) {
    opts.data = data(body, '--data')
    requestOptions.method = 'POST'
  }
  const method = str(flags, 'request')
  if (method !== undefined) {
    requestOptions.method = method.toUpperCase()
  }

  const user = str(flags, 'user')
  if (user !== undefined) {
    const idx = user.indexOf(':')
    opts.auth =
      idx === -1
        ? { username: user, password: '' }
        : { username: user.slice(0, idx), password: user.slice(idx + 1) }
  }

  if (flags.insecure) {
    requestOptions.rejectUnauthorized = false
  }
  const cacert = str(flags, 'cacert')
  if (cacert !== undefined) {
    requestOptions.ca = readFile(cacert, '--cacert')
  }

  const connectTimeout = duration(flags, 'connect-timeout')
  if (connectTimeout !== undefined) {
    opts.connectTimeout = connectTimeout
  }
  const maxTime = duration(flags, 'max-time')
  if (maxTime !== undefined) {
    opts.timeout = maxTime || Infinity
  }
  if (flags.bail) {
    opts.bail = true
  }

  const response: CheckHttpResponseOptions = bodyOptions(flags)
  const status = str(flags, 'status')
  if (status !== undefined) {
    response.status = parseStatus(status)
  }
  const statusRange = str(flags, 'status-range')
  if (statusRange !== undefined) {
    response.statusRange = parseStatusRange(statusRange)
  }
  if (Object.keys(response).length > 0) {
    opts.checkOk = checkHttpResponse(response)
  }

  try {
    return http(target, opts)
  } catch {
    throw new UsageError(`Invalid URL: ${target}`)
  }
}

function socketResponse(flags: FlagValues) {
  const opts: CheckSocketResponseOptions = bodyOptions(flags)
  const send = str(flags, 'send')
  if (send !== undefined) {
    opts.send = data(send, '--send')
  }
  const timeout = duration(flags, 'response-timeout')
  if (timeout !== undefined) {
    opts.timeout = timeout || Infinity
  }
  return Object.keys(opts).length > 0 ? checkSocketResponse(opts) : undefined
}

function buildSocket({ target, flags }: ParsedCheck): CheckFunction {
  const checkOk = socketResponse(flags)
  try {
    return socket(target, checkOk ? { checkOk } : {})
  } catch (err) {
    throw new UsageError((err as Error).message)
  }
}

function buildUdp({ target, flags }: ParsedCheck): CheckFunction {
  let address: ReturnType<typeof parseAddress> | undefined
  try {
    address = parseAddress(target)
  } catch {
    address = undefined
  }
  if (!address || !('port' in address)) {
    throw new UsageError(
      `Invalid UDP address: ${target} (expected udp://host:port)`
    )
  }
  const checkOk = socketResponse(flags)
  return udp(address.port, address.host, checkOk ? { checkOk } : {})
}

function buildFile({ target, flags }: ParsedCheck): CheckFunction {
  const path = target.startsWith('file://') ? fileURLToPath(target) : target
  const minSize = str(flags, 'min-size')
  if (minSize === undefined) {
    return file(path)
  }
  if (!/^\d+$/.test(minSize)) {
    throw new UsageError(
      `Invalid size for --min-size: "${minSize}" (expected a number of bytes)`
    )
  }
  const bytes = parseInt(minSize, 10)
  return file(path, {
    checkOk: stats => {
      if (stats.size < bytes) {
        throw new Error(
          `Expected a file of at least ${bytes} bytes but it is ${stats.size} bytes`
        )
      }
    },
  })
}

const builders = {
  http: buildHttp,
  socket: buildSocket,
  udp: buildUdp,
  file: buildFile,
}

/**
 * Turn parsed checks into rewait check functions
 */
export function buildChecks(checks: ParsedCheck[]): BuiltCheck[] {
  return checks.map(check => ({
    label: check.target,
    check: builders[check.kind](check),
  }))
}
