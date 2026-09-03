import {
  type CheckKind,
  displayFlag,
  type FlagSpec,
  findFlag,
} from './flags.ts'

/**
 * Thrown for any problem with the command line. Reported with exit code 2.
 */
export class UsageError extends Error {}

export type FlagValues = Record<string, string | string[] | true>

export interface ParsedCheck {
  /**
   * The check's target as written on the command line
   */
  target: string
  kind: CheckKind
  flags: FlagValues
}

export interface ParsedArgs {
  global: FlagValues
  checks: ParsedCheck[]
}

const kindsByScheme: Record<string, CheckKind> = {
  http: 'http',
  https: 'http',
  tcp: 'socket',
  unix: 'socket',
  udp: 'udp',
  file: 'file',
}

export const kindNames: Record<CheckKind, string> = {
  http: 'HTTP',
  socket: 'TCP or Unix socket',
  udp: 'UDP',
  file: 'file',
}

/**
 * Decide what kind of check a target describes, from its URL scheme. Targets
 * without a scheme are file paths.
 */
export function classify(target: string): CheckKind {
  const match = target.match(/^([a-z][a-z0-9+.-]*):\/\//i)
  if (!match) {
    return 'file'
  }
  const kind = kindsByScheme[match[1].toLowerCase()]
  if (!kind) {
    throw new UsageError(`Unsupported scheme "${match[1]}:" in ${target}`)
  }
  return kind
}

function assign(values: FlagValues, spec: FlagSpec, value: string | true) {
  if (spec.repeat) {
    const list = (values[spec.name] as string[] | undefined) || []
    list.push(value as string)
    values[spec.name] = list
  } else {
    values[spec.name] = value
  }
}

/**
 * Parse the command line. Global options may appear anywhere. Every other
 * option applies to the most recent check, which must accept it.
 */
export function parseArgs(argv: string[]): ParsedArgs {
  const global: FlagValues = {}
  const checks: ParsedCheck[] = []
  let current: ParsedCheck | undefined
  let onlyTargets = false

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]

    if (onlyTargets || !token.startsWith('-') || token === '-') {
      current = { target: token, kind: classify(token), flags: {} }
      checks.push(current)
      continue
    }

    if (token === '--') {
      onlyTargets = true
      continue
    }

    let name: string
    let inline: string | undefined
    if (token.startsWith('--')) {
      const eq = token.indexOf('=')
      name = eq === -1 ? token.slice(2) : token.slice(2, eq)
      inline = eq === -1 ? undefined : token.slice(eq + 1)
    } else {
      name = token.slice(1)
    }

    const spec = findFlag(name)
    if (!spec || (!token.startsWith('--') && name.length !== 1)) {
      throw new UsageError(`Unknown option: ${token}`)
    }

    let value: string | true = true
    if (spec.arg) {
      if (inline !== undefined) {
        value = inline
      } else if (i + 1 < argv.length) {
        i++
        value = argv[i]
      } else {
        throw new UsageError(`Option ${displayFlag(spec)} requires a value`)
      }
    } else if (inline !== undefined) {
      throw new UsageError(`Option --${spec.name} does not take a value`)
    }

    if (spec.scopes.includes('global')) {
      assign(global, spec, value)
    } else if (!current) {
      throw new UsageError(`Option ${displayFlag(spec)} must follow a check`)
    } else if (!spec.scopes.includes(current.kind)) {
      throw new UsageError(
        `Option ${displayFlag(spec)} does not apply to ${kindNames[current.kind]} checks`
      )
    } else {
      assign(current.flags, spec, value)
    }
  }

  return { global, checks }
}
