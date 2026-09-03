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

function invalid(address: string, hint: string): Error {
  return new Error(`Invalid socket address: ${address} (${hint})`)
}

/**
 * A URL pathname is percent-encoded; the filesystem wants the real bytes
 */
function decodePath(pathname: string, address: string): string {
  try {
    return decodeURIComponent(pathname)
  } catch {
    throw invalid(address, 'malformed percent-encoding in path')
  }
}

/**
 * Host and port from a URL's authority
 */
function authority(url: URL, address: string): net.SocketConnectOpts {
  const port = url.port || DEFAULT_PORTS[url.protocol]
  if (!port) {
    throw invalid(
      address,
      'expected a port, e.g. tcp://host:port; for a relative socket path write ./path or unix:path'
    )
  }
  const host = url.hostname
  return {
    port: Number(port),
    host: host.startsWith('[') ? host.slice(1, -1) : host,
  }
}

/**
 * Parse a string socket address into net.connect() options.
 *
 * - Anything that is not a URL is a path to an IPC socket: /tmp/x.sock,
 *   ./x.sock, \\.\pipe\name
 * - unix: URLs name a path: unix:///tmp/x.sock, unix:/tmp/x.sock, unix:x.sock
 * - Any other scheme names a host and port: tcp://host:port, tcp://[::1]:port,
 *   http://host (default port), plus the older tcp:host:port and tcp::port
 *   forms
 *
 * Throws when the address cannot be parsed or names neither a port nor a
 * path.
 */
export default function parseAddress(address: string): net.SocketConnectOpts {
  let url: URL
  try {
    url = new URL(address)
  } catch {
    if (!address || address.includes('://')) {
      throw invalid(address, 'not a valid URL')
    }
    return { path: address }
  }

  if (url.protocol === 'unix:') {
    if (url.hostname) {
      throw invalid(
        address,
        `unix:// must be followed by an absolute path, e.g. unix:///tmp/x.sock; for a relative path write unix:${url.hostname}${url.pathname}`
      )
    }
    if (!url.pathname) {
      throw invalid(address, 'expected a path, e.g. unix:///tmp/x.sock')
    }
    return { path: decodePath(url.pathname, address) }
  }

  if (url.hostname) {
    return authority(url, address)
  }
  if (url.pathname.startsWith('/')) {
    // tcp:///tmp/x.sock
    return { path: decodePath(url.pathname, address) }
  }

  // An opaque path such as tcp:host:port or tcp::port is an authority
  const rest = url.pathname.startsWith(':')
    ? `localhost${url.pathname}`
    : url.pathname
  let reparsed: URL
  try {
    reparsed = new URL(`//${rest}`, 'tcp://localhost')
  } catch {
    throw invalid(address, 'expected e.g. tcp://host:port')
  }
  return authority(reparsed, address)
}
