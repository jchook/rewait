Rewait
======

![Version 2.0.0](https://img.shields.io/badge/v-2.0.0-blue)
![License MIT](https://img.shields.io/badge/license-MIT-brightgreen)
![Test Coverage 100%](https://img.shields.io/badge/test%20coverage-100%25-brightgreen)

A NodeJS library to await promises, then retry or timeout.

- files
- sockets
- http/https
- custom functions

For example, you may wish to wait for a database or message queue to become
available before starting your HTTP server. Rewait does that.


Why use rewait?
---------------

- No dependencies
- Very tiny (~400 logical lines of code)
- Good test coverage
- Free and open source
- Written in TypeScript
- Extensible


Example
-------

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


Usage
=====

For detailed usage info, [read the API documentation here](./docs).


Custom function
----------------

If you need custom functionality, you can pass-in your own custom checks.

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
