import net from 'net'
import url from 'url'

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

export type SocketConnectSpec = number | string | net.SocketConnectOpts

function parseUrl(
  opts: SocketConnectSpec
): net.SocketConnectOpts {
  if (typeof opts === 'string') {
    const parsed = url.parse(opts)
    if (parsed.port) {
      return { port: parseInt(parsed.port), host: parsed.hostname || undefined }
    }
    if (parsed.pathname) {
      return { path: parsed.pathname }
    }
  }
  if (typeof opts === 'object') {
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
  checkOk: (client: net.Socket, opts: CheckSocketOptions) => void | Promise<any>
  close: boolean
  socketConnectOpts: net.SocketConnectOpts
}

/**
 * Check that a socket is listening.
 *
 * You can specify a full url (e.g. tcp://localhost:3000), a port number,
 * or an object of the form { host, port }. For IPC (Unix) sockets you can
 * pass a path to the socket.
 */
export default function checkSocket(
  dest: SocketConnectSpec,
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
    let client
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
