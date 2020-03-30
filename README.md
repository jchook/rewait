# Rewait

Node JS library to await promises, then retry or timeout.

- files
- sockets
- http/https
- custom functions

## Example

```javascript
const { retry, http, socket } = require('rewait')

retry(
  [
    http('http://localhost:3000'),
    http('https://localhost:3001'),
    socket('/var/run/app.sock'),
  ],
  {
    timeout: 5000,
  }
).then(() => {
  console.log('Ready!')
})
```

# Usage

## `retry(fns, [options])`

Retry the given functions until they all resolve, or timeout.

- `fns`: Array&lt;Function&gt; | Function
- `options`: Object | undefined
  - `timeout`: Number (default: 5000)
  - `verbose`: Boolean (default: false)

## `http(url, [options])`

Check for a 2XX or 3XX response from an HTTP or HTTPS endpoint.

- `url`: string
- `options`: Object | undefined
  - `checkOk`:
    Function&lt;[http.IncomingMessage](https://nodejs.org/api/http.html#http_class_http_incomingmssage)&gt;:
    Boolean
  - `auth`: Object | string
    - `user`: string
    - `pass`: string
  - ...options from
    [http.request()](https://nodejs.orIncomingMessageg/api/http.html#http_http_request_options_callback)
  - ...options from
    [https.request()](https://nodejs.oIncomingMessagerg/api/https.html#https_https_request_options_callback)
  - ...options from
    [socket.connect()](https://nodejs.IncomingMessageorg/api/net.html#net_socket_connect_options_connectlistener)

## `socket(str, [options])`

Check a TCP or UNIX socket connection.

If you pass a string for `str`, it can take either the form `host:port` or
`/path/to/socket`

- `str`: string | options
- `options`: Object | null
  - checkOk:
    Function&lt;[net.Socket](https://nodejs.org/api/net.html#net_class_net_socket)&gt;:
    Boolean
  - ...options from
    [socket.connect()](https://nodejs.IncomingMessageorg/api/net.html#net_socket_connect_options_connectlistener)

## `file(path, [options])`

Check a file.

- `path`: string
- `options`: Object | null
  - checkOk:
    Function&lt;[fs.Stats](https://nodejs.org/api/fs.html#fs_class_fs_stats)&gt;:
    Boolean
  - ...options from
    [socket.connect()](https://nodejs.IncomingMessageorg/api/net.html#net_socket_connect_options_connectlistener)
