// Infraestrutura exclusiva de teste: nunca inicializa a base real nem usa portas 3000/3001.
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const crypto = require('node:crypto')
const net = require('node:net')
const { spawn, spawnSync } = require('node:child_process')
const mysql = require('mysql2/promise')
const root = path.join(__dirname, '..')
const database = `ehtech_e2e_${process.pid}_${Date.now()}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'ehtech-e2e-uploads-'))
const children = new Set()
let adminConnection, pool, server, cleaning = false
async function cleanup() {
  if (cleaning) return
  cleaning = true
  for (const child of children) {
    if (child.exitCode === null && child.pid) {
      if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' })
      else { child.kill('SIGTERM'); await new Promise(resolve => { child.once('exit', resolve); setTimeout(() => { child.kill('SIGKILL'); resolve() }, 3000).unref() }) }
    }
  }
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
  if (pool) await pool.end()
  if (adminConnection) {
    if (!/^ehtech_e2e_\d+_\d+$/.test(database)) throw Error('Nome de base de teste inválido.')
    await adminConnection.query(`DROP DATABASE IF EXISTS \`${database}\``)
    await adminConnection.end()
  }
  // Somente o diretório temporário recém-criado, nunca o uploads da aplicação.
  if (path.dirname(uploads) === os.tmpdir() && path.basename(uploads).startsWith('ehtech-e2e-uploads-')) fs.rmSync(uploads, { recursive: true, force: true })
}
function launch(args, env) {
  const child = spawn(process.execPath, args, { cwd: root, env, stdio: 'inherit', windowsHide: true })
  children.add(child)
  return child
}
async function unusedPort() {
  const probe = net.createServer()
  await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve) })
  const port = probe.address().port
  await new Promise(resolve => probe.close(resolve))
  return port
}
async function main() {
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') throw Error('E2E deve rodar em ambiente local/de CI de teste.')
  const config = require('./helpers/mysql-config.cjs').mysqlTestConfig()
  adminConnection = await mysql.createConnection(config)
  await adminConnection.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4`)
  for (const key of ['DATABASE_URL', 'POSTGRES_URL', 'POSTGRESQL_URL', 'MYSQL_URL', 'CLEARDB_DATABASE_URL', 'PGHOST', 'VERCEL', 'BLOB_READ_WRITE_TOKEN']) process.env[key] = ''
  Object.assign(process.env, { NODE_ENV: 'test', DB_HOST: config.host, DB_PORT: String(config.port), DB_USER: config.user, DB_PASSWORD: config.password, DB_DATABASE: database, DB_SSL: 'false', API_SEGREDO: crypto.randomBytes(32).toString('hex'), UPLOADS_DIR: uploads, COMPAT_AI_PROVIDER: 'disabled', SHIPPING_RULES_JSON: '[]' })
  // Nenhum e-mail sai durante a validação.
  require('nodemailer').createTransport = () => ({ sendMail: async () => ({ accepted: [] }) })
  // Somente a consulta externa de CEP recebe uma fixture local; a API e o banco são reais.
  require('../backend/addresses').lookupCep = async () => ({ cep: '01001-000', uf: 'SP', cidade: 'São Paulo', bairro: 'Sé', logradouro: 'Praça da Sé' })
  const app = require('../backend/index')
  pool = require('../backend/db')
  server = await app.startServer({ port: 0 })
  const backend = `http://127.0.0.1:${server.address().port}`
  const adminEmail = 'admin.e2e@gmail.com', password = 'E2e-Password-2026'
  await pool.execute("INSERT INTO usuarios (username,email,senha,role) VALUES ('admin_e2e',?,?, 'admin')", [adminEmail, await require('bcrypt').hash(password, 10)])
  // Reinicia os limitadores entre cenários através de uma chave exclusiva da fixture.
  const stores = new Set(), { MemoryStore } = require('express-rate-limit')
  const increment = MemoryStore.prototype.increment
  MemoryStore.prototype.increment = function (key) { stores.add(this); return increment.call(this, key) }
  const resetSecret = crypto.randomBytes(32).toString('hex')
  app.post('/__e2e/reset-limits', async (req, res) => {
    if (req.headers['x-e2e-key'] !== resetSecret) return res.sendStatus(404)
    for (const store of stores) await store.resetAll()
    res.json({ ok: true })
  })
  const port = await unusedPort(), frontend = `http://127.0.0.1:${port}`
  const env = { ...process.env, NODE_ENV: 'development', NEXT_TELEMETRY_DISABLED: '1', EHTECH_E2E: '1', BACKEND_URL: backend, SITE_URL: frontend, NEXT_PUBLIC_API_URL: '', E2E_BASE_URL: frontend, E2E_API_URL: backend, E2E_ADMIN_EMAIL: adminEmail, E2E_PASSWORD: password, E2E_RESET_KEY: resetSecret }
  const next = launch([require.resolve('next/dist/bin/next'), 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', String(port)], env)
  let ready = false
  for (let attempt = 0; attempt < 150; attempt++) {
    if (next.exitCode !== null) throw Error('Frontend de teste encerrou antes de iniciar.')
    try { if ((await fetch(frontend, { signal: AbortSignal.timeout(10000) })).ok) { ready = true; break } } catch {}
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  if (!ready) throw Error('Frontend de teste não ficou disponível.')
  const cli = path.join(path.dirname(require.resolve('@playwright/test/package.json')), 'cli.js')
  const tests = launch([cli, 'test', ...process.argv.slice(2)], env)
  const exitCode = await new Promise((resolve, reject) => { tests.once('error', reject); tests.once('exit', code => resolve(code ?? 1)) })
  process.exitCode = exitCode
}
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { cleanup().finally(() => process.exit(1)) })
main().catch(error => { console.error('[E2E]', error.message); process.exitCode = 1 }).finally(cleanup)
