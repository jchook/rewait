import type { CheckFunction } from './fn'
import type { CheckResults } from './retry'

/**
 * Perform a set of checks in sequence instead of in parallel.
 */
export default function sequence<T extends readonly CheckFunction[]>(
  ...fns: T
) {
  return async (): Promise<CheckResults<T>> => {
    const results = []
    for (let idx = 0; idx < fns.length; idx++) {
      results.push(await fns[idx]())
    }
    return results as CheckResults<T>
  }
}
