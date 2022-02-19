import net from 'net'

export function getAddrInfo(server: net.Server): net.AddressInfo {
  const addr = server.address()
  if (!addr || typeof addr === 'string') {
    throw new Error('Unable to get address info from server')
  }
  return addr
}

export function pause(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}
