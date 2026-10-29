const { Client } = require('pg')
async function isolatedDatabase(prefix = 'ehtech_test') {
  if (!['ehtech_test', 'ehtech_e2e'].includes(prefix)) throw Error('Prefixo de base temporária inválido.')
  const driver = process.env.TEST_DB_DRIVER || 'mysql'
  if (!['mysql', 'postgres'].includes(driver)) throw Error('TEST_DB_DRIVER deve ser mysql ou postgres.')
  const database = `${prefix}_${process.pid}_${Date.now()}`
  if (!/^ehtech_(test|e2e)_\d+_\d+$/.test(database)) throw Error('Nome de base temporária inválido.')
  const config = driver === 'mysql' ? require('./mysql-config.cjs').mysqlTestConfig() : {
    host: process.env.TEST_PG_HOST || '127.0.0.1', port: Number(process.env.TEST_PG_PORT || 5432),
    user: process.env.TEST_PG_USER || 'postgres', password: process.env.TEST_PG_PASSWORD || '',
    database: process.env.TEST_PG_ADMIN_DATABASE || 'postgres', ssl: false
  }
  const admin = driver === 'mysql' ? await require('mysql2/promise').createConnection(config) : new Client(config)
  if (driver === 'postgres') await admin.connect()
  const create = driver === 'mysql' ? `CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4` : `CREATE DATABASE "${database}" ENCODING 'UTF8' TEMPLATE template0`
  try { await admin.query(create) } catch (error) { await admin.end(); throw error }
  return { driver, database, config, environment: { DB_DRIVER: driver, DB_HOST: config.host, DB_PORT: String(config.port), DB_USER: config.user, DB_PASSWORD: config.password, DB_DATABASE: database, DB_SSL: 'false' },
    async cleanup() {
      try { await admin.query(driver === 'mysql' ? `DROP DATABASE IF EXISTS \`${database}\`` : `DROP DATABASE IF EXISTS "${database}"`) }
      finally { await admin.end() }
    }
  }
}
module.exports = { isolatedDatabase }
