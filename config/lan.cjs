const { networkInterfaces } = require('node:os')

function getLanHosts() {
  return [...new Set(['localhost', '127.0.0.1', ...Object.values(networkInterfaces())
    .flat()
    .filter((entry) => entry && entry.family === 'IPv4' && !entry.internal)
    .map((entry) => entry.address)])]
}

module.exports = { getLanHosts }
