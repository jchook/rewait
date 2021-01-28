const dgram = require('dgram')
const url = require('url')

module.exports = checkUdp

function getUdpType(host) {
  if (!host || typeof host !== 'string') {
    return
  }
  if (host.match(':')) {
    return 'udp6'
  }
  if (host.match(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/)) {
    return 'udp4'
  }
}


/**
 * Promisify dgram.connect()
 */
function dgramConnect(options) {
  const { port, hostname, ...rest } = options
  return new Promise((resolve, reject) => {
    // TODO: use dns.lookup() to determine address family?
    rest.type = rest.type || getUdpType(hostname) || 'udp4'
    const socket = dgram.createSocket(rest)
    socket.connect(port, hostname, (err) => {
      if (err) {
        reject(err)
      } else {
        resolve(socket)
      }
    })
  })
}

function checkUdp(options) {
  const { checkOk, close, ...opt } = {
    close: true,
    checkOk: () => true,
    ...(options || {}),
  }
  return async () => {
    let client, open
    try {
      client = await dgramConnect(opt)
      open = true
      const ok = await checkOk(client, options)
      if (!ok) {
        throw new Error(`Connection to ${url.format(opt)} failed checkOk()`)
      }
      return client
    } finally {
      if (client && open && close) {
        try {
          client.close()
        } catch (err) {
          // TODO how to handle this? we can't re-throw
          // ERR_SOCKET_DGRAM_NOT_RUNNING
          // console.error(err)
        }
      }
    }
  }
}
