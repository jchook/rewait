const { all, http, socket } = require('./index.js')

;(async function () {
  try {
    await all(
      [
        http('http://localhost:8091', {
          auth: { user: 'admin', pass: 'changeme' },
        }),
        socket('localhost:8091'),
      ],
      {
        timeout: 1000,
        verbose: true,
        interval: 500,
      }
    )
  } catch (err) {
    console.error(err)
  }
})()
