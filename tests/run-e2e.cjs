// Infraestrutura exclusiva de teste: nunca inicializa a base real nem usa portas 3000/3001.
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const crypto = require('node:crypto')
const net = require('node:net')
const { spawn, spawnSync } = require('node:child_process')
const root = path.join(__dirname, '..')
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'ehtech-e2e-uploads-'))
const children = new Set()
let fixture, pool, server, cleaning = false
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
  if (fixture) await fixture.cleanup()
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
  process.env.TEST_DB_DRIVER = process.argv.includes('--postgres') ? 'postgres' : 'mysql'
  fixture = await require('./helpers/database-fixture.cjs').isolatedDatabase('ehtech_e2e')
  for (const key of ['DATABASE_URL', 'POSTGRES_URL', 'POSTGRESQL_URL', 'MYSQL_URL', 'CLEARDB_DATABASE_URL', 'PGHOST', 'VERCEL', 'BLOB_READ_WRITE_TOKEN']) process.env[key] = ''
  Object.assign(process.env, { ...fixture.environment, NODE_ENV: 'test', API_SEGREDO: crypto.randomBytes(32).toString('hex'), UPLOADS_DIR: uploads, COMPAT_AI_PROVIDER: 'disabled', SHIPPING_RULES_JSON: '[]' })
  process.env.GOOGLE_CLIENT_ID = ''
  process.env.GOOGLE_CLIENT_SECRET = ''; process.env.GOOGLE_REDIRECT_URI = ''
  let googleFixture
  if (process.argv.includes('--google')) {
    googleFixture = require('./helpers/google-fixture.cjs').createGoogleFixture()
    process.env.GOOGLE_CLIENT_ID = googleFixture.clientId
    process.env.GOOGLE_CLIENT_SECRET = 'e2e-google-secret'
    const originalFetch = global.fetch
    global.fetch = (url, options) => {
      if (String(url) === 'https://www.googleapis.com/oauth2/v3/certs') return Promise.resolve(Response.json({ keys: googleFixture.keys }))
      if (String(url) === 'https://oauth2.googleapis.com/token') {
        try {
          const body = new URLSearchParams(options.body)
          const code = require('jsonwebtoken').verify(body.get('code'), crypto.createPublicKey(googleFixture.privateKey), { algorithms: ['RS256'], issuer: 'ehtech-test-authorizer', audience: googleFixture.clientId })
          if (body.get('client_secret') !== process.env.GOOGLE_CLIENT_SECRET || body.get('redirect_uri') !== process.env.GOOGLE_REDIRECT_URI || crypto.createHash('sha256').update(body.get('code_verifier') || '').digest('base64url') !== code.code_challenge) throw Error('invalid code exchange')
          return Promise.resolve(Response.json({ id_token: googleFixture.token({ nonce: code.nonce, email: code.email, sub: code.sub }) }))
        } catch { return Promise.resolve(Response.json({ error: 'invalid_grant' }, { status: 400 })) }
      }
      return originalFetch(url, options)
    }
  }
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
  // Chave efêmera de teste, gerada nesta execução; nunca é credencial de produção.
  if (googleFixture) {
    env.E2E_GOOGLE_KEY = Buffer.from(googleFixture.privateKey).toString('base64')
    process.env.GOOGLE_REDIRECT_URI = `${frontend}/api/auth/google/callback`
    env.GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI
  }
  const production = process.argv.includes('--production')
  const nextCli = require.resolve('next/dist/bin/next')
  if (production) {
    const build = launch([nextCli, 'build', '--webpack'], { ...env, NODE_ENV: 'production' })
    const code = await new Promise((resolve, reject) => { build.once('error', reject); build.once('exit', resolve) })
    if (code !== 0) throw Error('Build do frontend de teste falhou.')
  }
  const next = launch([nextCli, production ? 'start' : 'dev', ...(production ? [] : ['--webpack']), '--hostname', '127.0.0.1', '--port', String(port)], { ...env, NODE_ENV: production ? 'production' : 'development' })
  let ready = false
  for (let attempt = 0; attempt < 150; attempt++) {
    if (next.exitCode !== null) throw Error('Frontend de teste encerrou antes de iniciar.')
    try { if ((await fetch(frontend, { signal: AbortSignal.timeout(10000) })).ok) { ready = true; break } } catch {}
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  if (!ready) throw Error('Frontend de teste não ficou disponível.')
  const cli = path.join(path.dirname(require.resolve('@playwright/test/package.json')), 'cli.js')
  const tests = launch([cli, 'test', ...process.argv.slice(2).filter(arg => !['--postgres', '--production', '--google'].includes(arg))], env)
  const exitCode = await new Promise((resolve, reject) => { tests.once('error', reject); tests.once('exit', code => resolve(code ?? 1)) })
  process.exitCode = exitCode
}
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { cleanup().finally(() => process.exit(1)) })
main().catch(error => { console.error('[E2E]', error.message); process.exitCode = 1 }).finally(cleanup)
