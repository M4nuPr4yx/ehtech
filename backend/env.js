const path = require('node:path')
const dotenv = require('dotenv')

// O ambiente da hospedagem sempre tem prioridade. Arquivo da IA só em desenvolvimento.
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  dotenv.config({ path: path.join(__dirname, '.env.ai'), quiet: true })
}
// Resolve a configuração a partir do backend, mesmo quando npm é executado na raiz.
dotenv.config({ path: path.join(__dirname, '.env'), quiet: true })
require('../config/private-environment.cjs').assertPrivateEnvironment()
