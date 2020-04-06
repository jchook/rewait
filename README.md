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
    http('https://localhost:3001/path/to/thing.txt'),
    socket('/var/run/app.sock'),
  ],
  {
    interval: 500, // check (at most) every 1/2 second
    timeout: 60000, // timeout after 60 seconds (on the dot)
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
  - `interval`: Number (default: 250)
  - `timeout`: Number (default: Infinity)
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
  - `checkOk`:
    Function&lt;[net.Socket](https://nodejs.org/api/net.html#net_class_net_socket)&gt;:
    Boolean
  - ...options from
    [socket.connect()](https://nodejs.IncomingMessageorg/api/net.html#net_socket_connect_options_connectlistener)

## `file(path, [options])`

Check a file.

You can easily verify the file using the `checkOk` option. For example, to check
if the file is writable...

```javascript
file('/path/to/file.txt', {
  checkOk: stats => stats.isFile() && stats.mode & 0700,
})
```

- `path`: string
- `options`: Object | null
  - `checkOk`:
    Function&lt;[fs.Stats](https://nodejs.org/api/fs.html#fs_class_fs_stats)&gt;:
    Boolean
  - ...options from
    [fs.stat()](https://nodejs.org/api/fs.html#fs_fs_stat_path_options_callback)

## Custom function

Simply throw an Error when "not ready".

Example:

```javascript
function customCheck(options = {}) {
  return async () => {
    if (options.neverReady) {
      throw new Error('Never ready!')
    }
    if (options.waitUntil) {
      if (+new Date() < options.waitUntil) {
        throw new Error('Not ready!')
      }
    }
    // Ready, simply by not throwing
  }
}
```
