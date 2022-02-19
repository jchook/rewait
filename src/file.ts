import fs from 'fs'

/**
 * Promisify fs.stat() (support for node pre v10)
 * The options argument was not added until v10.5.0
 */
function fsStat(path: string) {
  return new Promise<fs.Stats>((resolve, reject) => {
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

export interface CheckFileOptions {
  checkOk: (stats: fs.Stats, opts: CheckFileOptions) => void | Promise<any>
}

/**
 * Check for a file.
 *
 * The default `checkOk` option only checks for the file's existence, but you
 * can pass in a different `checkOk` to examine other features such as the mode,
 * size, or owner/group.
 */
export default function checkFile(
  path: string,
  userOpts: Partial<CheckFileOptions> = {}
) {
  const opts: CheckFileOptions = {
    checkOk: stats => {
      if (!stats) {
        throw new Error(`File ${path} failed checkOk()`)
      }
    },
    ...userOpts,
  }
  return async () => {
    const stats = await fsStat(path)
    await opts.checkOk(stats, opts)
    return stats
  }
}
