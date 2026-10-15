const validator = require('validator')

async function main() {
  const args = process.argv.slice(2)
  if (args.length !== 2 || args[0] !== '--email' || !validator.isEmail(args[1])) {
    throw new Error('Uso: npm run admin:promote -- --email seu-email@example.com (cadastre a conta pelo site primeiro).')
  }
  const pool = require('../backend/db')
  try {
    const [users] = await pool.execute('SELECT id_usuario FROM usuarios WHERE email = ?', [args[1].trim().toLowerCase()])
    if (users.length !== 1) throw new Error('Conta não encontrada. Cadastre-se pelo site antes de promover.')
    await pool.execute("UPDATE usuarios SET role = 'admin' WHERE id_usuario = ?", [users[0].id_usuario])
    console.log('Conta promovida. Entre pelo painel /admin; serviços de exemplo serão criados na próxima inicialização da API.')
  } finally {
    await pool.end()
  }
}

main().catch(error => {
  console.error(error.code ? `[admin:promote] Falha no banco (${error.code}). Confira a configuração.` : error.message)
  process.exitCode = 1
})
