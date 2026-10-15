const app = require('../backend/index')
const pool = require('../backend/db')

app.initDatabaseTables()
  .catch(error => {
    console.error(`[db:init] Não foi possível inicializar o banco (${error.code || 'erro'}). Confira backend/.env e se o banco está ativo e criado.`)
    process.exitCode = 1
  })
  .finally(() => pool.end())
