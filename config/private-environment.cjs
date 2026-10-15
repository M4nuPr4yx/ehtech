'use strict'

// NEXT_PUBLIC_* é incorporado ao JavaScript enviado ao navegador pelo Next.
function assertPrivateEnvironment(env = process.env) {
  const exposed = Object.keys(env).filter(name => name.startsWith('NEXT_PUBLIC_') && env[name] && /API_?KEY|SECRET|SEGREDO|PASSWORD|SMTP_PASS|DATABASE_URL|POSTGRES_URL|MYSQL_URL|PRIVATE_KEY|TOKEN/i.test(name))
  if (exposed.length) {
    // Somente nomes: nunca incluir valores de credenciais no erro.
    throw new Error(`Credenciais devem permanecer no servidor. Remova as variáveis públicas: ${exposed.join(', ')}`)
  }
}

module.exports = { assertPrivateEnvironment }
