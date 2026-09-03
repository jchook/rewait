import net from 'node:net'
import parseAddress from './parseAddress.ts'

export {
  type CheckSocketResponseOptions,
  default as checkSocketResponse,
} from './checkSocketResponse.ts'

/**
 * Promisify net.connect()
 */
function netConnect(options: net.SocketConnectOpts) {
  return new Promise<net.Socket>((resolve, reject) => {
    const client = net.connect(options, () => {
      resolve(client)
    })
    client.once('error', reject)
  })
}

function parseUrl(
  opts: number | string | net.SocketConnectOpts
): net.SocketConnectOpts {
  if (typeof opts === 'string') {
    return parseAddress(opts)
  }
  if (opts && typeof opts === 'object') {
    return opts
  }
  if (typeof opts === 'number') {
    return { port: opts }
  }
  throw new Error(
    'Invalid value passed into checkSocket(): expected SocketConnectOpts, string, or number, but received ' +
      typeof opts
  )
}

export interface CheckSocketOptions {
  checkOk: (client: net.Socket, opts: CheckSocketOptions) => unknown
  close: boolean
  socketConnectOpts: net.SocketConnectOpts
}

/**
 * Check that a TCP or IPC socket is listening.
 *
 * Pass a port number, an object of the form { host, port } or { path }, or
 * a string address:
 *
 * - tcp://host:port, tcp://[::1]:port, or http://host (default port) for TCP
 * - unix:///path/to.sock, unix:/path/to.sock, or a plain path for IPC sockets
 *
 * For relative paths, write unix:rel.sock or ./rel.sock rather than
 * unix://rel.sock.
 */
export default function checkSocket(
  dest: number | string | net.SocketConnectOpts,
  userOpts: Partial<CheckSocketOptions> = {}
) {
  const socketConnectOpts = parseUrl(dest)
  const opts: CheckSocketOptions = {
    close: true,
    checkOk: () => {},
    socketConnectOpts,
    ...userOpts,
  }
  return async () => {
    let client: net.Socket | undefined
    try {
      client = await netConnect(socketConnectOpts)
      await opts.checkOk(client, opts)
      return client
    } finally {
      if (client && opts.close) {
        client.end()
      }
    }
  }
}
