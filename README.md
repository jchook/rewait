Rewait
======

![Version 2.0.0](https://img.shields.io/badge/v-2.0.0-blue)
![License MIT](https://img.shields.io/badge/license-MIT-brightgreen)
![Test Coverage 100%](https://img.shields.io/badge/test%20coverage-100%25-brightgreen)

A NodeJS library to wait for external resources to become available:

- files
- sockets
- http/https
- custom functions

For example, you may wish to wait for a database or message queue to become
available before starting your HTTP server. Rewait does that.


Install
-------

You can [download a release](https://github.com/jchook/rewait/releases) or
install rewait into your project with NPM.

```sh
npm i rewait
```


Why use rewait?
---------------

- No dependencies
- Tiny footprint (~400 logical lines of code)
- 100% test coverage
- Free and open source
- Written in TypeScript
- Used in major production evironments
- Extensible


Usage
=====

For detailed usage info, [see the API documentation here](./docs).


Examples
--------

See [examples](examples) for more.

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


Custom function
----------------

If you need custom functionality, you can pass-in your own custom checks.

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
```
