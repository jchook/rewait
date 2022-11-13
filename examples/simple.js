// Import from rewait
// Replace '../src' with 'rewait'
const { retry, http } = require('../src')

// Poll a Web service until it responds
retry(http('http://localhost:8080')).then(() => {
  console.log('Service is ready')
}).catch(err => {
  console.log('Error: ' + err)
})
