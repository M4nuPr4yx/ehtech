const { requestPath } = require('./request-path')
const PUBLIC_STATELESS = new Set(['GET /componentes/catalogo', 'GET /componentes/catalogo/status', 'GET /componentes/ia/status', 'POST /componentes/ia/analisar', 'POST /componentes/verificar-basico'])

function createHandler(app) {
  return async (req, res) => {
    if (PUBLIC_STATELESS.has(`${req.method} ${requestPath(req.url)}`)) return app(req, res)
    try {
      await app.initDatabaseTables()
    } catch {
      console.error('[EHtech API] Falha ao inicializar o banco. Confira DATABASE_URL e a disponibilidade do banco no ambiente da hospedagem.')
      res.setHeader('Cache-Control', 'no-store')
      return res.status(503).json({ mensagem: 'Banco de dados temporariamente indisponível. Tente novamente em instantes.', codigo: 'banco_indisponivel' })
    }
    return app(req, res)
  }
}

module.exports = { createHandler }
