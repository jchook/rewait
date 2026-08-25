# v2.0.0

See [MIGRATION.md](./MIGRATION.md) for a complete 1.x upgrade guide.

## ✨ Major improvements

- Rewritten in TypeScript! 🎉
- **100% test coverage** 🎉

## ⬆️ Minor improvements

- Detailed API docs
- More example usage
- `retry()` now throws a `MultiError` on timeout, instead of a simple `Error`
- `http()` now has `connectTimeout` and `baseUrl` options
- `retry()` and `sequence()` results are now typed position-wise, e.g.
  `retry([http('...'), file('...')])` resolves to `[IncomingMessage, fs.Stats]`
- `udp()` is now a public export (it existed in 1.x but was not exported)
- Subpath imports for bundle-size-conscious users, e.g.
  `require('rewait/http')` or `import retry from 'rewait/retry'`. The 1.x-era
  deep require paths (`require('rewait/src/http')`) still work and now return
  the check function directly, as they did in 1.x

## 🐛 Bug Fixes

- `retry()` now properly supports non-promise return values in check functions
- `http()` no longer double-encodes auth info
- `socket()` fixed a subtle URL parsing issue, a la `host` vs `hostname`

## 💣 Breaking Changes

- `http()` previously accepted `https.createRequest()` options mixed in with its
  own options; now they are separated into `{requestOptions}`. Similarly,
  `socket()` now has `{socketConnectOpts}`. See API docs for more info.

- `http()`'s automatically-encoded `auth` option still exists, but has changed
  from `{user, pass}` to `{username, password}` to conform with the WHATWG URL
  spec naming conventions.

- Optional `checkOk` functions now must throw an Error to indicate a not-ok
  state. Previously these could return false. This applies to `http()`,
  `file()`, `socket()`, and the newly-exported `udp()`.

- `url()` has been removed. Call `http()`, `socket()`, or `file()` directly
  instead of dispatching on the URL protocol.

- `retry()`'s `verbose` option has been removed and is now ignored.

- `http()`'s default response timeout increased from 1 second to 60 seconds.
  Pass `{ timeout }` (total response time) or `{ connectTimeout }` to tune it.

- `http()` now requires a `string` or WHATWG `URL` as its first argument.
  Objects from the legacy `url.parse()` are no longer accepted, and relative
  URLs now resolve against the `baseUrl` option (default `http://localhost/`).

- Error message texts have changed, notably the `retry()` timeout message and
  the default `http()` failure message. Match on `MultiError` and its `errors`
  property rather than message strings.

- Node.js >= 14.18 is now required (was v8+).

## Migration Example

This example demonstrates the changes you'll want to make to upgrade to 2.x:

```javascript
// v1.x.x
http('http://localhost:8080/', {
  auth: { user: 'd00d', pass: 'dog' },
  checkOk: res => {
    return isExpectedResponse(res) ? true : false
  },
  method: 'HEAD',
})
```

Changes to:

```javascript
// v2.0.0
http('http://localhost:8080/', {
  // Renamed to { username, password } to match WHATWG URL spec
  auth: { username: 'd00d', password: 'dog' },

  // Optional checkOk functions must throw an Error in fail cases
  checkOk: res => {
    if (!isExpectedResponse(res)) {
      throw new Error('Failed with code: ' + res.statusCode)
    }
  },

  // http.createRequest() options go here now
  requestOptions: {
    method: 'HEAD',
  },
})
```

---

# v1.1.2

- Improved error messages
- Improved JSDoc types
- Better tests for retry()

# v1.1.1

- Refactored to work with Node v8+
- Fixes bugs with `file()`
- Adds tests

# v1.1.0

- Adds `bail`, `onRequest`, and `onResponse` to `http()`
