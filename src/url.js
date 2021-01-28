const url = require('url')
const http = require('./http')
const file = require('./file')
const socket = require('./socket')

module.exports = checkUrl

function checkUrl(uu, options) {
  uu = typeof uu === 'string' ? url.parse(uu) : (uu || {})
  switch (uu.protocol) {
    case 'file:':
      return file(uu.pathname, options)
    case 'tcp:':
      return socket({
        ...uu,
        ...(options || {})
      })
    case 'http:':
    case 'https:':
      return http(uu, options)
  }
}
