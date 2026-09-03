import type dgram from 'node:dgram'
import type net from 'node:net'
import { StringDecoder } from 'node:string_decoder'
import {
  bodyMismatch,
  hasBodyMatch,
  type MatchBodyOptions,
} from './matchBody.ts'

const DEFAULT_RESPONSE_TIMEOUT = 5000 // ms

/**
 * Declarative checks for use as the `checkOk` option of `socket()` and
 * `udp()`.
 *
 * `send` is written to the socket first, if given. When any body check is
 * given, incoming data is accumulated until every check passes, at which
 * point the check succeeds. If the socket closes or `timeout` elapses before
 * that, the check fails.
 */
export interface CheckSocketResponseOptions extends MatchBodyOptions {
  /**
   * Data to send once connected. Strings are encoded using `encoding`.
   */
  send?: string | Buffer

  /**
   * How long to wait for a matching response, in milliseconds.
   * Defaults to 5000. Pass Infinity to wait until the socket closes.
   */
  timeout?: number
}

type AnySocket = net.Socket | dgram.Socket

function isDgram(socket: AnySocket): socket is dgram.Socket {
  return typeof (socket as net.Socket).write !== 'function'
}

function send(socket: AnySocket, data: Buffer) {
  if (isDgram(socket)) {
    socket.send(data)
  } else {
    socket.write(data)
  }
}

/**
 * Build a `checkOk` function for `socket()` or `udp()` that optionally sends
 * a payload and then waits for a response matching the given body checks.
 *
 * ```ts
 * socket('tcp://localhost:6379', {
 *   checkOk: checkSocketResponse({ send: 'PING\r\n', bodyRegex: /^\+PONG/ }),
 * })
 * ```
 */
export default function checkSocketResponse(
  opts: CheckSocketResponseOptions = {}
) {
  const encoding = opts.encoding || 'utf8'
  const timeout = opts.timeout ?? DEFAULT_RESPONSE_TIMEOUT
  return (socket: AnySocket) =>
    new Promise<void>((resolve, reject) => {
      if (opts.send !== undefined) {
        send(
          socket,
          Buffer.isBuffer(opts.send)
            ? opts.send
            : Buffer.from(opts.send, encoding)
        )
      }
      if (!hasBodyMatch(opts)) {
        resolve()
        return
      }

      let body = ''
      // Decode across chunk boundaries so split multibyte characters survive
      const decoder = new StringDecoder(encoding)
      const dataEvent = isDgram(socket) ? 'message' : 'data'
      const cleanup = () => {
        clearTimeout(timer)
        socket.removeListener(dataEvent, onData)
        socket.removeListener('close', onClose)
        socket.removeListener('error', onError)
      }
      const fail = (message: string) => {
        cleanup()
        reject(new Error(message))
      }
      const onData = (chunk: Buffer) => {
        body += decoder.write(chunk)
        if (!bodyMismatch(body, opts)) {
          cleanup()
          resolve()
        }
      }
      const onClose = () => {
        fail(
          `Socket closed before a matching response: ${bodyMismatch(body, opts)}`
        )
      }
      const onError = (err: Error) => {
        cleanup()
        reject(err)
      }
      let timer: NodeJS.Timeout | undefined
      if (Number.isFinite(timeout)) {
        timer = setTimeout(() => {
          fail(
            `Timed out after ${timeout}ms waiting for a matching response: ${bodyMismatch(
              body,
              opts
            )}`
          )
        }, timeout)
      }

      socket.on(dataEvent, onData)
      socket.once('close', onClose)
      socket.once('error', onError)
    })
}
