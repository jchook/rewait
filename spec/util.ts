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

function getUsernamePassword(req: http.IncomingMessage): AuthCredentials {
  const header = req.headers.authorization || '' // get the auth header
  const token = header.split(/\s+/).pop() || '' // and the encoded auth token
  const auth = Buffer.from(token, 'base64').toString() // convert from base64
  const parts = auth.split(/:/, 2) // split on colon
  const username = decodeURIComponent(parts.shift() || '') // username is first
  const password = decodeURIComponent(parts.shift() || '')
  return { username, password }
}

