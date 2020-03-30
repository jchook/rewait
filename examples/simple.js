const { retry, http } = require('../src')

;(async function () {
  try {
    await retry(
      [
        http('http://localhost:8091', {
          auth: { user: 'admin', pass: 'changeme' },
        }),
      ],
      {
        timeout: 5000,
        verbose: true,
        interval: 500,
      }
    )
  } catch (err) {
    console.error(err)
  }
})()
