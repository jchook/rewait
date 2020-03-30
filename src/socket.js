const net = require('net')
const url = require('url')

module.exports = checkSocket

function parseSocketOptions(str) {
  // Options object
  if (!str || typeof str !== 'string') {
    return str || {}
  }
  // UNIX socket path
  if (str[0] === '/') {
    return { path: str }
  }
  // host:port
  if (str.indexOf(':') > -1) {
    const [host, port] = str.split(':')
    return { host, port: parseInt(port) }
  }
  // port
  return { port: parseInt(str) }
}

/**
 * Promisify net.connect()
 */
function netConnect(options) {
  return new Promise((resolve, reject) => {
    const client = net.connect(options, () => resolve(client))
    client.on('error', reject)
  })
}

function checkSocket(path, options) {
  options = {
    close: true,
    checkOk: () => true,
    ...parseSocketOptions(path),
    ...parseSocketOptions(options),
  }
  return async () => {
    const client = await netConnect(options)
    const ok = await options.checkOk(client, options)
    if (options.close) {
      client.end()
    }
    if (!ok) {
      throw new Error(`Connection to ${url.format(options)} failed checkOk()`)
    }
    return client
  }
}
