const fs = require('fs')

module.exports = checkFile

/**
 * Promisify fs.stat() (support for node pre v10)
 */
function fsStat(path, options) {
  return new Promise((resolve, reject) => {
    fs.stat(path, options, (err, stats) => {
      if (err) {
        reject(err)
      } else {
        resolve(stats)
      }
    })
  })
}

function checkFile(path, options) {
  options = {
    bigint: false,
    checkOk: x => x,
    ...options,
  }
  return async () => {
    const stats = await fsStat(path, options)
    const ok = await options.checkOk(stats, options)
    if (!ok) {
      throw new Error(`File ${path} failed checkOk()`)
    }
    return stats
  }
}
