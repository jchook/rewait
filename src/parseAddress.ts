import type net from 'node:net'

/**
 * Ports implied by URL schemes that the WHATWG URL parser strips
 */
const DEFAULT_PORTS: Record<string, number> = {
  'ftp:': 21,
  'http:': 80,
  'https:': 443,
  'ws:': 80,
  'wss:': 443,
}

const EXPECTED = 'expected e.g. tcp://host:port, host:port or /path/to.sock'

function invalid(address: string): Error {
  return new Error(`Invalid socket address: ${address} (${EXPECTED})`)
}

function parsePort(port: string, address: string): number {
  const num = Number(port)
  if (!Number.isInteger(num) || num < 0 || num > 65535) {
    throw invalid(address)
  }
  return num
}

/**
 * Parse a string socket address into net.connect() options.
 *
 * Accepts URLs such as tcp://host:port, tcp://[::1]:port, http://host (using
 * the scheme's default port) and unix:///path/to.sock; the shorter host:port,
 * [::1]:port, tcp:host:port and tcp::port forms; and plain paths to IPC
 * sockets. Throws when the address is a URL that names neither a port nor a
 * path, or that cannot be parsed.
 */
export default function parseAddress(address: string): net.SocketConnectOpts {
  // host:port, [ipv6]:port, scheme:host:port, scheme::port
  const hostPort = address.match(
    /^(?:[a-z][a-z0-9+.-]*:(?!\/\/))?(?:\[([^\]]*)\]|([^:/[\]]*)):(\d+)$/i
  )
  if (hostPort) {
    return {
      port: parsePort(hostPort[3], address),
      host: hostPort[1] || hostPort[2] || undefined,
    }
  }
  let url: URL
  try {
    url = new URL(address)
  } catch {
    if (!address || address.includes('://')) {
      throw invalid(address)
    }
    return { path: address }
  }
  const port = url.port || DEFAULT_PORTS[url.protocol]
  if (port) {
    return {
      port: parsePort(String(port), address),
      host: url.hostname.replace(/^\[(.*)\]$/, '$1'),
    }
  }
  if (url.pathname) {
    return { path: url.pathname }
  }
  throw invalid(address)
}
