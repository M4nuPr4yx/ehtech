const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

const root = path.join(__dirname, '..')
const destination = path.join(root, 'backend/.env')
const template = fs.readFileSync(path.join(root, 'backend/.env.example'), 'utf8')
const content = template.replace(/^API_SEGREDO=.*$/m, `API_SEGREDO=${crypto.randomBytes(32).toString('hex')}`)
try {
  fs.writeFileSync(destination, content, { flag: 'wx', mode: 0o600 })
  console.log('backend/.env criado com chave exclusiva. Banco configurado para o Docker local na porta 3307.')
} catch (error) {
  if (error.code !== 'EEXIST') throw error
  console.log('backend/.env já existe e foi preservado. Confira a conexão antes de iniciar.')
}
console.log('Próximos passos: npm run db:up (ou use seu MySQL), npm run db:init e npm run dev.')
