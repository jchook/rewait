[**rewait**](../README.md)

***

[rewait](../README.md) / socket

# Function: socket()

> **socket**(`dest`, `userOpts?`): () => `Promise`\<`Socket`\>

Check that a TCP or IPC socket is listening.

Pass a port number, an object of the form { host, port } or { path }, or
a string address:

- tcp://host:port, tcp://[::1]:port, or http://host (default port) for TCP
- unix:///path/to.sock, unix:/path/to.sock, or a plain path for IPC sockets

For relative paths, write unix:rel.sock or ./rel.sock rather than
unix://rel.sock.

## Parameters

### dest

`string` \| `number` \| `SocketConnectOpts`

### userOpts?

`Partial`\<[`CheckSocketOptions`](../interfaces/CheckSocketOptions.md)\> = `{}`

## Returns

() => `Promise`\<`Socket`\>
