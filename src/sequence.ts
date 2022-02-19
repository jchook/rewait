import { CheckFunction } from './fn'

/**
 * Perform a set of checks in sequence instead of in parallel.
 */
export default function sequence<T extends CheckFunction[]>(...fns: T) {
  return async function () {
    const results = []
    for (let idx = 0; idx < fns.length; idx++) {
      results.push(await fns[idx]())
    }
    return results
  }
}
