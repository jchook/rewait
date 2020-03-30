const fs = require('fs')

module.exports = checkFile

/**
 * Promisify fs.stat()
 */
function fsStat(path, options) {
  new Promise((resolve, reject) => {
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
      new Error(`File ${path} failed checkOk()`)
    }
    return stats
  }
}
