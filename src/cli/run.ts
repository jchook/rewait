import retry, { type RetryOptions } from '../retry.ts'
import sequence from '../sequence.ts'
import { buildChecks, parseDuration } from './build.ts'
import { renderHelp, usage } from './help.ts'
import { parseArgs, UsageError } from './parse.ts'

const DEFAULT_TIMEOUT = 60000 // ms

export interface RunIO {
  stdout: (text: string) => void
  stderr: (text: string) => void
  version: string
}

/**
 * Describe an error in one line. AggregateErrors from failed connection
 * attempts often have an empty message of their own.
 */
export function describeError(err: unknown): string {
  if (err instanceof Error) {
    if (err.message) {
      return err.message
    }
    const errors = (err as { errors?: unknown[] }).errors
    if (Array.isArray(errors) && errors.length > 0) {
      return errors.map(describeError).join(', ')
    }
  }
  return String(err)
}

function formatDuration(ms: number) {
  return ms < 1000 ? `${ms}ms` : `${ms / 1000}s`
}

function usageError(io: RunIO, err: Error) {
  io.stderr(
    `rewait: ${err.message}\n${usage}\nTry 'rewait --help' for more information.\n`
  )
  return 2
}

/**
 * Run the CLI. Resolves with the process exit code.
 */
export async function run(argv: string[], io: RunIO): Promise<number> {
  let parsed: ReturnType<typeof parseArgs>
  let built: ReturnType<typeof buildChecks>
  const retryOptions: Partial<RetryOptions> = {}
  try {
    parsed = parseArgs(argv)
    if (parsed.global.help) {
      io.stdout(renderHelp())
      return 0
    }
    if (parsed.global.version) {
      io.stdout(`${io.version}\n`)
      return 0
    }
    if (parsed.checks.length === 0) {
      throw new UsageError('No checks given')
    }
    built = buildChecks(parsed.checks)
    const timeout = parsed.global.timeout
    retryOptions.timeout =
      timeout === undefined
        ? DEFAULT_TIMEOUT
        : parseDuration(timeout as string, '--timeout') || Infinity
    const interval = parsed.global.interval
    if (interval !== undefined) {
      retryOptions.interval = parseDuration(interval as string, '--interval')
    }
  } catch (err) {
    return usageError(io, err as Error)
  }

  const { quiet, verbose, once, sequential } = parsed.global
  const start = Date.now()
  // Indexed like `built`: labels are not unique
  const outcome: (Error | 'ok' | undefined)[] = built.map(() => undefined)

  const log = (message: string) => {
    if (verbose) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(3)
      io.stderr(`[${elapsed}s] ${message}\n`)
    }
  }

  const checks = built.map(({ label, check }, idx) => {
    // Remember a pass so --sequential does not re-run earlier checks on
    // every attempt
    let passed: { result: unknown } | undefined
    return async () => {
      if (passed) {
        return passed.result
      }
      try {
        const result = await check()
        passed = { result }
        outcome[idx] = 'ok'
        log(`${label}: ok`)
        return result
      } catch (err) {
        outcome[idx] = err as Error
        log(`${label}: ${describeError(err)}`)
        throw err
      }
    }
  })

  const report = (headline: string) => {
    if (quiet) {
      return
    }
    const lines = [`rewait: ${headline}`]
    built.forEach(({ label }, idx) => {
      const result = outcome[idx]
      if (result === undefined) {
        lines.push(`  ${label}: not attempted`)
      } else if (result !== 'ok') {
        lines.push(`  ${label}: ${describeError(result)}`)
      }
    })
    io.stderr(`${lines.join('\n')}\n`)
  }

  const combined = sequential ? [sequence(...checks)] : checks

  if (once) {
    const results = await Promise.allSettled(combined.map(check => check()))
    const failed = results.filter(r => r.status === 'rejected').length
    if (failed > 0) {
      report(
        `${outcome.filter(r => r instanceof Error).length} of ${built.length} checks failed`
      )
      return 1
    }
    return 0
  }

  try {
    await retry(combined, retryOptions)
    return 0
  } catch {
    report(`timed out after ${formatDuration(retryOptions.timeout as number)}`)
    return 1
  }
}
