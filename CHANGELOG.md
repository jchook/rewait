# v2.0.0

## ✨ Major improvements

- Rewritten in TypeScript! 🎉
- **100% test coverage** 🎉

## ⬆️ Minor improvements

- Generated API docs
- `retry()` now throws a `MultiError` on timeout, instead of a simple `Error`
- `http()` now has `connectTimeout` and `baseUrl` options

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
  state. Previously these could return a false.

## Migration Example

This example demonstrates the changes that you need to make to upgrade to 2.x:

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
  // Renamed to { username, password } to match WHATWG
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

# v1.1.1

- Refactored to work with Node v8+
- Fixes bugs with `file()`
- Adds tests

# v1.1.0

- Adds `bail`, `onRequest`, and `onResponse` to `http()`
