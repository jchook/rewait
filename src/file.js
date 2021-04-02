const fs = require('fs')

module.exports = checkFile

/**
 * Promisify fs.stat() (support for node pre v10)
 * The options argument was not added until v10.5.0
 *
 * @param {string} path path to a file
 * @return {Promise<fs.Stats>}
 */
function fsStat(path) {
  return new Promise((resolve, reject) => {
    fs.stat(path, (err, stats) => {
      if (err) {
        reject(err)
      } else {
        resolve(stats)
      }
    })
  })
}

/**
 * @typedef {(stats: fs.Stats) => boolean} FileCheckOkCallback
 */

/**
 * Check for a file.
 *
 * The default `checkOk` option only checks for the file's existence, but you
 * can pass in a different `checkOk` to examine other features such as the mode,
 * size, or owner/group.
 *
 * @param {string} path the filepath to check
 * @param {object} options
 * @param {FileCheckOkCallback} options.checkOk
 * @return {() => Promise<fs.Stats>}
 */
function checkFile(path, options) {
  options = {
    // Originally wanted to pass options into fs.stats() but that feature
    // was only added recently in Node v10.5.0.
    // bigint: false,
    checkOk: x => x,
    ...options,
  }
  return async () => {
    const stats = await fsStat(path)
    const ok = await options.checkOk(stats, options)
    if (!ok) {
      throw new Error(`File ${path} failed checkOk()`)
    }
    return stats
  }
}
