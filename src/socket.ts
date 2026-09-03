import net from 'node:net'

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

/**
 * Parse a string address. Accepts URLs such as tcp://host:port,
 * tcp://[::1]:port and unix:///path/to.sock, the older tcp:host:port and
 * tcp::port forms, and plain paths to IPC sockets. Returns undefined when the
 * string is a URL that names neither a port nor a path.
 */
function parseAddress(address: string): net.SocketConnectOpts | undefined {
  const legacy = address.match(
    /^[a-z][a-z0-9+.-]*:(?!\/\/)(?:\[([^\]]*)\]|([^:/]*)):(\d+)$/i
  )
  if (legacy) {
    return {
      port: parseInt(legacy[3], 10),
      host: legacy[1] || legacy[2] || undefined,
    }
  }
  let url: URL
  try {
    url = new URL(address)
  } catch {
    return { path: address }
  }
  if (url.port) {
    return {
      port: parseInt(url.port, 10),
      host: url.hostname.replace(/^\[(.*)\]$/, '$1'),
    }
  }
  if (url.pathname) {
    return { path: url.pathname }
  }
}

function parseUrl(
  opts: number | string | net.SocketConnectOpts
): net.SocketConnectOpts {
  if (typeof opts === 'string') {
    const parsed = parseAddress(opts)
    if (parsed) {
      return parsed
    }
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
 * You can specify a full url (e.g. tcp://localhost:3000), a port number,
 * or an object of the form { host, port }. For IPC (Unix) sockets you can
 * pass a path to the socket.
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
