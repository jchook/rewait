const { retry, http } = require('../src')

;(async function () {
  try {
    await retry(http('http://localhost:8080'))
  } catch (err) {
    console.error(err)
  }
})()
