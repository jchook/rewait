import dgram from 'dgram'

function getUdpType(host?: string) {
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
function dgramConnect(port: number, address: string | undefined, opts: dgram.SocketOptions) {
  return new Promise<dgram.Socket>((resolve) => {
    // TODO: use dns.lookup() to determine address family?
    const socket = dgram.createSocket(opts)
    socket.connect(port, address, () => {
      resolve(socket)
    })
  })
}

export interface CheckUdpOptions {
  checkOk: (socket: dgram.Socket, opts: CheckUdpOptions) => any | Promise<any>
  close: boolean
  socketOptions: dgram.SocketOptions
}

export default function checkUdp(port: number, address?: string, userOpts?: Partial<CheckUdpOptions>) {
  const opts: CheckUdpOptions = {
    close: true,
    checkOk: () => true,
    socketOptions: {
      type: getUdpType(address) || 'udp4',
      ...userOpts?.socketOptions,
    },
    ...userOpts,
  }
  return async () => {
    let client: dgram.Socket | undefined = undefined
    let open: boolean = false
    try {
      client = await dgramConnect(port, address, opts.socketOptions)
      open = true
      const ok = await opts.checkOk(client, opts)
      if (!ok) {
        throw new Error(`UDP connection to ${address}:${port} failed checkOk()`)
      }
      return client
    } finally {
      if (client && open && opts.close) {
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
