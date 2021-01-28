const net = require('net')
const url = require('url')

module.exports = checkSocket

/**
 * Promisify net.connect()
 */
function netConnect(options) {
  return new Promise((resolve, reject) => {
    const client = net.connect(options, () => {
      resolve(client)
    })
    client.once('error', reject)
  })
}

function parseUrl(destUrl) {
  if (typeof destUrl === 'string') {
    const parsed = url.parse(destUrl)
    if (parsed.port) {
      return { port: parsed.port, host: parsed.hostname }
    }
    if (parsed.path) {
      return { path: parsed.path }
    }
  }
  if (typeof destUrl === 'object') {
    return destUrl
  }
  if (typeof destUrl === 'number') {
    return { port: destUrl }
  }
  return undefined
}

function checkSocket(destUrl, options) {
  const urlOptions = parseUrl(destUrl) || {}
  const { checkOk, close, ...opt } = {
    close: true,
    checkOk: () => true,
    ...urlOptions,
    ...options,
  }
  return async () => {
    let client, ok
    try {
      client = await netConnect(opt)
      ok = await checkOk(client, options)
      if (!ok) {
        throw new Error(`Connection to ${url.format(options)} failed checkOk()`)
      }
      return client
    } finally {
      if (client && close) {
        try {
          client.end()
        } catch (err) {
          // TODO: what to do here?
          // we cannot throw
        }
      }
    }
  }
}
