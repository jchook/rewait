/**
 * The kinds of check the CLI can build. Derived from the target's URL scheme.
 */
export type CheckKind = 'http' | 'socket' | 'udp' | 'file'

export type FlagScope = 'global' | CheckKind

export interface FlagSpec {
  /**
   * Long option name, without the leading dashes
   */
  name: string

  /**
   * Single-letter alias, without the leading dash
   */
  alias?: string

  /**
   * Placeholder for the option's value. Options without one are booleans.
   */
  arg?: string

  /**
   * Whether the option may be given more than once
   */
  repeat?: boolean

  /**
   * Where the option is accepted. Global options may appear anywhere; check
   * options must follow a check of one of the listed kinds.
   */
  scopes: FlagScope[]

  /**
   * Heading the option is listed under in --help
   */
  group: string

  help: string
}

const BODY: FlagScope[] = ['http', 'socket', 'udp']

/**
 * Every option the CLI understands. This table is the single source of truth
 * for parsing and for --help.
 */
export const flags: FlagSpec[] = [
  // Global
  {
    name: 'timeout',
    alias: 't',
    arg: 'duration',
    scopes: ['global'],
    group: 'Options',
    help: 'Give up after this long. 0 waits forever. Default: 60s',
  },
  {
    name: 'interval',
    alias: 'i',
    arg: 'duration',
    scopes: ['global'],
    group: 'Options',
    help: 'Minimum time between attempts of a check. Default: 250ms',
  },
  {
    name: 'once',
    scopes: ['global'],
    group: 'Options',
    help: 'Try each check once and exit, without retrying. Useful for Docker HEALTHCHECK, which does its own retrying',
  },
  {
    name: 'sequential',
    scopes: ['global'],
    group: 'Options',
    help: 'Run checks one after another instead of in parallel',
  },
  {
    name: 'verbose',
    alias: 'v',
    scopes: ['global'],
    group: 'Options',
    help: 'Report the outcome of every attempt on stderr',
  },
  {
    name: 'quiet',
    alias: 'q',
    scopes: ['global'],
    group: 'Options',
    help: 'Print nothing, even on failure',
  },
  {
    name: 'help',
    alias: 'h',
    scopes: ['global'],
    group: 'Options',
    help: 'Show this help and exit',
  },
  {
    name: 'version',
    alias: 'V',
    scopes: ['global'],
    group: 'Options',
    help: 'Print the version and exit',
  },

  // HTTP
  {
    name: 'request',
    alias: 'X',
    arg: 'method',
    scopes: ['http'],
    group: 'HTTP options',
    help: 'Request method. Default: GET, or POST when --data is given',
  },
  {
    name: 'header',
    alias: 'H',
    arg: 'header',
    repeat: true,
    scopes: ['http'],
    group: 'HTTP options',
    help: 'Add a request header, e.g. "Authorization: Bearer x". May be repeated',
  },
  {
    name: 'data',
    alias: 'd',
    arg: 'data',
    scopes: ['http'],
    group: 'HTTP options',
    help: 'Request body. @file reads the body from a file',
  },
  {
    name: 'user',
    alias: 'u',
    arg: 'user:password',
    scopes: ['http'],
    group: 'HTTP options',
    help: 'Basic auth credentials',
  },
  {
    name: 'insecure',
    alias: 'k',
    scopes: ['http'],
    group: 'HTTP options',
    help: 'Skip TLS certificate verification',
  },
  {
    name: 'cacert',
    arg: 'file',
    scopes: ['http'],
    group: 'HTTP options',
    help: 'PEM file of CA certificates to trust',
  },
  {
    name: 'connect-timeout',
    arg: 'duration',
    scopes: ['http'],
    group: 'HTTP options',
    help: 'Fail an attempt if the connection is not established in time',
  },
  {
    name: 'max-time',
    arg: 'duration',
    scopes: ['http'],
    group: 'HTTP options',
    help: 'Fail an attempt if the whole response is not received in time. Default: 60s',
  },
  {
    name: 'bail',
    scopes: ['http'],
    group: 'HTTP options',
    help: 'Close the connection as soon as the response is checked, without reading the rest of the body',
  },
  {
    name: 'status',
    arg: 'codes',
    scopes: ['http'],
    group: 'HTTP options',
    help: 'Accept only these status codes, comma separated, e.g. 200,204. Default: any 2xx or 3xx',
  },
  {
    name: 'status-range',
    arg: 'min-max',
    scopes: ['http'],
    group: 'HTTP options',
    help: 'Accept status codes in this inclusive range, e.g. 200-299. Combines with --status',
  },

  // Sockets
  {
    name: 'send',
    arg: 'data',
    scopes: ['socket', 'udp'],
    group: 'TCP, Unix socket and UDP options',
    help: "Data to send once connected. @file reads it from a file. Use $'...' shell quoting for control characters, e.g. $'PING\\r\\n'",
  },
  {
    name: 'response-timeout',
    arg: 'duration',
    scopes: ['socket', 'udp'],
    group: 'TCP, Unix socket and UDP options',
    help: 'Fail an attempt if no matching response arrives in time. Default: 5s',
  },

  // Body
  {
    name: 'body-substring',
    arg: 'text',
    scopes: BODY,
    group: 'Response body options (HTTP, TCP, Unix socket and UDP)',
    help: 'The response body must contain this text',
  },
  {
    name: 'body-regex',
    arg: 'pattern',
    scopes: BODY,
    group: 'Response body options (HTTP, TCP, Unix socket and UDP)',
    help: 'The response body must match this regular expression. Write /pattern/flags to pass flags',
  },
  {
    name: 'body-exact',
    arg: 'text',
    scopes: BODY,
    group: 'Response body options (HTTP, TCP, Unix socket and UDP)',
    help: 'The response body must equal this text exactly',
  },
  {
    name: 'encoding',
    arg: 'name',
    scopes: BODY,
    group: 'Response body options (HTTP, TCP, Unix socket and UDP)',
    help: 'Encoding used to decode the body, and to encode --send. Default: utf8',
  },

  // Files
  {
    name: 'min-size',
    arg: 'bytes',
    scopes: ['file'],
    group: 'File options',
    help: 'The file must be at least this many bytes',
  },
]

/**
 * Look up an option by long name or alias
 */
export function findFlag(name: string): FlagSpec | undefined {
  return flags.find(f => f.name === name || f.alias === name)
}

/**
 * How an option is displayed in messages, e.g. "-t, --timeout"
 */
export function displayFlag(spec: FlagSpec) {
  return spec.alias ? `-${spec.alias}, --${spec.name}` : `--${spec.name}`
}
