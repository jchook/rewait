const { retry, http, socket } = require('../src')

;(async function () {
  try {
    // Config for Couchbase REST API
    const couchbase = {
      auth: { username: 'admin', password: 'password' },
      baseUrl: new URL('http://localhost:8091/'),
    }

    // Retry on failures
    await retry(
      [
        // Check Couchbase pool
        http('/pools/nodes', couchbase),

        // Check Couchbase credentials
        http('/whoami', couchbase),

        // Check Couchbase query service
        http('/query/service', {
          ...couchbase,
          data: 'select * from system:indexes;',
          requestOptions: {
            port: 8093,
            method: 'POST',
          },
        }),

        // Check RabbitMQ
        socket('localhost:15672'),
      ],
      {
        timeout: 15000,
        interval: 500,
      }
    )

    console.log('Ready!')
  } catch (err) {
    console.error(err)
  }
})()
