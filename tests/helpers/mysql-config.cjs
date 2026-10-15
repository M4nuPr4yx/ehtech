const fs = require('node:fs')
const path = require('node:path')

// TEST_DB_* permite testar com CREATE/DROP DATABASE sem usar a conta da aplicação.
function mysqlTestConfig() {
  const file = path.join(__dirname, '../../backend/.env')
  const config = { ...(fs.existsSync(file) ? require('dotenv').parse(fs.readFileSync(file)) : {}), ...process.env }
  return {
    host: config.TEST_DB_HOST || config.DB_HOST || config.DB_LOCAL || '127.0.0.1',
    port: Number(config.TEST_DB_PORT || config.DB_PORT || config.DB_PORTA) || 3306,
    user: config.TEST_DB_USER || config.DB_USER || 'root',
    password: config.TEST_DB_PASSWORD ?? config.DB_PASSWORD ?? '',
  }
}

module.exports = { mysqlTestConfig }
