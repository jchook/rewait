Rewait
======

[![npm version](https://img.shields.io/npm/v/rewait)](https://www.npmjs.com/package/rewait)
![License MIT](https://img.shields.io/badge/license-MIT-brightgreen)
[![CI](https://github.com/jchook/rewait/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/jchook/rewait/actions/workflows/ci.yml)
[![Coverage Status](https://coveralls.io/repos/github/jchook/rewait/badge.svg?branch=main)](https://coveralls.io/github/jchook/rewait?branch=main)

A NodeJS library to wait for external resources to become available:

- files
- sockets
- http/https
- custom functions

For example, you may wish to wait for a database or message queue to become
available before starting your HTTP server. Rewait does that.


Install
-------

Easily install with the following NPM command, or [download a
release](https://github.com/jchook/rewait/releases).

```sh
npm i rewait
```


Upgrading from 1.x? See [MIGRATION.md](./MIGRATION.md).


Why use rewait?
---------------

- Simple
- Easy to use, familiar
- No dependencies
- Full TypeScript type safety
- 100% test coverage
- Permissive FOSS license
- Used in major production evironments
- Extensible


Usage
=====

For detailed usage info, [see the API documentation here](./docs).


Example
--------

See [more examples here](examples).

```javascript
const { retry, http, socket } = require('rewait')

retry(
  [
    http('http://localhost:3000'),
    http('https://localhost:3001/path/to/thing.txt'),
    socket('/var/run/app.sock'),
  ],
  {
    interval: 250, // check (at most) every 1/4 second
    timeout: 60000, // timeout after 60 seconds (on the dot)
  }
).then(() => {
  console.log('Ready!')
})
```


Checking the response
---------------------

By default `http()` accepts any 2xx or 3xx response. Use `checkHttpResponse()`
to be more specific about the status code, or to inspect the body.

```javascript
const { retry, http, checkHttpResponse } = require('rewait')

retry(
  http('http://localhost:9200/_cluster/health', {
    checkOk: checkHttpResponse({
      status: 200,
      bodyRegex: /"status":"(green|yellow)"/,
    }),
  })
)
```

Or write your own `checkOk`. It receives the response as soon as the headers
arrive, with the body still unread, so you can consume the stream yourself.

`socket()` and `udp()` have a matching `checkSocketResponse()`, which can send a
payload first and then wait for a reply that matches:

```javascript
const { retry, socket, checkSocketResponse } = require('rewait')

retry(
  socket('tcp://localhost:6379', {
    checkOk: checkSocketResponse({ send: 'PING\r\n', bodyRegex: /^\+PONG/ }),
  })
)
```


Custom checks
-------------

If you need custom functionality, you can easily write your own custom checks.

Simply throw an Error when "not ready".

Example:

```javascript
function customCheck(options = {}) {
  return new Promise(function() {
    if (options.neverReady) {
      throw new Error('Never ready!')
    }
    if (options.waitUntil) {
      if (+new Date() < options.waitUntil) {
        throw new Error('Not ready!')
      }
    }
    // Ready, simply by not throwing
  })
}

retry(customCheck)
```


Command line
============

The `rewait` command covers the common cases without writing any code, which
makes it handy in Docker entrypoints and health checks:

```sh
npm i -g rewait

# Wait up to 90s for Postgres and an HTTP health endpoint, then start the app
rewait -t 90s tcp://db:5432 http://api:8080/healthz --body-substring '"ok"' \
  && exec node server.js
```

HTTP checks take curl-style options (`-X`, `-H`, `-d`, `-u`), TCP and UDP checks
can `--send` a payload and match the reply, and `--once` fits Docker's
`HEALTHCHECK`. See the [CLI documentation](./docs/cli.md) for everything it
can do.
