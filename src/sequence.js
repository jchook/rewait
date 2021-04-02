/**
 * @typedef {() => any} Check
 */

/**
 * Perform a set of checks in sequence instead of in parallel.
 *
 * @param {Check[]} fns functions to call in sequence
 * @return {Array} array of the return values of called functions
 */
module.exports = function sequence(...fns) {
  return async function () {
    const results = []
    for (let idx = 0; idx < fns.length; idx++) {
      results.push(await fns[idx]())
    }
    return results
  }
}
