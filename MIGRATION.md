Migrating from 1.x to 2.0
=========================

Rewait 2.0 is a full TypeScript rewrite. The core mental model is unchanged --
you build check functions and pass them to `retry()` -- and most simple call
sites work as-is. This guide covers everything that changed, roughly in order
of how likely it is to affect you.

Requirements
------------

Node.js **14.18 or newer** is required (1.x supported Node 8+).

`checkOk` callbacks must throw
------------------------------

This is the most important change. In 1.x, a custom `checkOk` callback
indicated failure by returning a falsy value. In 2.0 the return value of
`checkOk` is **ignored** -- the only way to fail a check is to throw an Error
(or return a rejecting promise). This applies to `http()`, `file()`,
`socket()`, and `udp()`.

```javascript
// 1.x -- returning false marked the check as failed
http('http://localhost:8080/', {
  checkOk: res => res.statusCode === 200,
})

// 2.0 -- throw to mark the check as failed
http('http://localhost:8080/', {
  checkOk: res => {
    if (res.statusCode !== 200) {
      throw new Error(`Expected 200, got ${res.statusCode}`)
    }
  },
})
```

Beware: the old pattern fails *silently* in 2.0 -- a `checkOk` that returns
`false` simply passes, since the return value is never inspected. Audit your
`checkOk` callbacks when upgrading; this is the one change that will not
announce itself with an error.

`http()` option changes
-----------------------

**Request options moved into `requestOptions`.** In 1.x, Node
`http.request()` options (`method`, `headers`, etc.) were mixed directly into
the options object. In 2.0 they live under `requestOptions`:

```javascript
// 1.x
http('http://localhost:8080/', { method: 'HEAD' })

// 2.0
http('http://localhost:8080/', { requestOptions: { method: 'HEAD' } })
```

**`auth` renamed its fields** from `{ user, pass }` to
`{ username, password }`, following WHATWG URL naming:

```javascript
// 1.x
http('http://localhost:8080/', { auth: { user: 'd00d', pass: 'dog' } })

// 2.0
http('http://localhost:8080/', { auth: { username: 'd00d', password: 'dog' } })
```

**The first argument must be a `string` or WHATWG `URL`.** Objects from the
legacy `url.parse()` are no longer accepted. Relative URLs resolve against the
new `baseUrl` option, which defaults to `http://localhost/`.

**The default response timeout is now 60 seconds** (was 1 second in 1.x).
Tune it with `timeout` (total response time, in ms) or the new
`connectTimeout` (connection establishment only):

```javascript
http('http://localhost:8080/', { timeout: 1000, connectTimeout: 250 })
```

`socket()` option changes
-------------------------

Like `http()`, the Node `net.connect()` options are no longer mixed into the
top-level options object -- pass them as the first argument, or under
`socketConnectOpts`:

```javascript
// 1.x
socket('tcp://localhost', { port: 5432 })

// 2.0
socket({ host: 'localhost', port: 5432 })
```

`url()` was removed
-------------------

The 1.x `url()` helper dispatched to `http()`, `socket()`, or `file()` based
on the URL protocol. Call the specific check directly:

```javascript
// 1.x
url('https://localhost:8080/')
url('tcp://localhost:5432')
url('file:///tmp/ready')

// 2.0
http('https://localhost:8080/')
socket({ host: 'localhost', port: 5432 })
file('/tmp/ready')
```

`retry()` changes
-----------------

- The `verbose` option was removed and is now ignored.
- On timeout, `retry()` throws a `MultiError` instead of a plain `Error`. Its
  `errors` property holds the most recent error for each check, position-wise.
  If you were matching on the error message text, match on the class and
  `errors` instead:

```javascript
import { retry, MultiError } from 'rewait'

try {
  await retry([check1, check2], { timeout: 5000 })
} catch (err) {
  if (err instanceof MultiError) {
    console.error('Not ready:', err.errors)
  }
}
```

New in 2.0
----------

Nothing below requires migration, but it may simplify your code:

- **`udp()`** is now a public export.
- **Typed results.** `retry()` and `sequence()` results are typed
  position-wise, e.g. `retry([http('...'), file('...')])` resolves to
  `[http.IncomingMessage, fs.Stats]`, and a single check preserves its return
  type.
- **Subpath imports** for smaller bundles: `require('rewait/http')`,
  `import retry from 'rewait/retry'`, etc. The 1.x-era deep require paths
  (`require('rewait/src/http')`) still work and still return the check
  function directly.
