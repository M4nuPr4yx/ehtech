// Entry point para Vercel Serverless Functions
const app = require('../backend/index.js');

module.exports = async (req, res) => {
  try {
    await app.initDatabaseTables();
    return app(req, res);
  } catch (error) {
    console.error('[EHtech API] Banco indisponível:', error.message);
    return res.status(503).json({ mensagem: 'Banco de dados temporariamente indisponível.' });
  }
};
