// Resolve a configuração a partir do backend, mesmo quando npm é executado na raiz.
require('dotenv').config({ path: require('node:path').join(__dirname, '.env') })
