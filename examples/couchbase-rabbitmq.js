const { retry, http, socket } = require('../src')

;(async function () {
  try {
    // Config for Couchbase REST API
    const couchbase = {
      auth: {
        user: 'admin',
        pass: 'changeme',
      },
      protocol: 'http:',
      host: 'localhost',
      port: 8091,
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
          port: 8093,
          method: 'POST',
          data: 'select * from system:indexes;',
        }),

        // Check RabbitMQ
        socket('localhost:15672'),
      ],
      {
        timeout: 15000,
        verbose: true,
        interval: 500,
      }
    )

    console.log('Ready!')
  } catch (err) {
    console.error(err)
  }
})()
