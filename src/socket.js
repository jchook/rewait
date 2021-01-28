const dgram = require('dgram')
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
  // proto:[host]:port
  if (str.match(/^(tcp|udp):/i)) {
    const [protocol, hostname, port] = str.split(':')
    return port
      ? { protocol, hostname, port: parseInt(port) }
      : { protocol, port: parseInt(hostname) }
  }
  // host:port
  if (str.indexOf(':') > -1) {
    const [host, port] = str.split(':')
    return { host, port: parseInt(port) }
  }
  // port
  return { port: parseInt(str) }
}

function connect(options) {
  const { protocol, ...rest } = options
  if (protocol === 'udp') {
    return dgramConnect(rest)
  } else {
    return netConnect(rest)
  }
}

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


function getIpVersion(ip) {
  if (!ip || typeof ip !== 'string') {
    return
  }
  return ip.match(':') ? 6 : 4
}


/**
 * Promisify dgram.connect()
 */
function dgramConnect(options) {
  const { port, host, type } = options
  const ipv = getIpVersion(host) || 4
  // TODO: use dns.lookup() to determine address family
  return new Promise((resolve, reject) => {
    const udpType = type || 'udp' + ipv
    const socket = dgram.createSocket(udpType)
    socket.connect(port, host, (err) => {
      if (err) {
        reject(err)
      } else {
        resolve(socket)
      }
    })
    socket.once('error', reject)
  })
}

function checkSocket(path, options) {
  const { checkOk, close, ...opt } = {
    protocol: 'tcp',
    close: true,
    checkOk: () => true,
    ...parseSocketOptions(path),
    ...parseSocketOptions(options),
  }
  return async () => {
    const client = await connect(opt)
    const ok = await checkOk(client, options)
    if (close) {
      if (client.end) {
        client.end()
      } else if (client.close) {
        // client.disconnect()
        client.close()
      }
    }
    if (!ok) {
      throw new Error(`Connection to ${url.format(options)} failed checkOk()`)
    }
    return client
  }
}
