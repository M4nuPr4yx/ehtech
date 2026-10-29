// Opcional: executa a integração com binários oficiais locais, sem instalar serviço.
const fs = require('node:fs'), os = require('node:os'), path = require('node:path')
const net = require('node:net'), { spawn, spawnSync } = require('node:child_process')
const { Client } = require('pg')
const e2eIndex = process.argv.indexOf('--e2e')
const demoIndex = process.argv.indexOf('--demo')
const bin = path.resolve(process.env.TEST_POSTGRES_BIN || (e2eIndex === -1 && demoIndex === -1 ? process.argv[2] : null) || 'scratch/postgresql-portable/pgsql/bin')
const executable = name => path.join(bin, name + (process.platform === 'win32' ? '.exe' : ''))
async function main() {
  if (!fs.existsSync(executable('initdb'))) throw Error('Informe TEST_POSTGRES_BIN com os binários oficiais de PostgreSQL. Veja docs/DESENVOLVIMENTO.md.')
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ehtech-postgres-'))
  let server
  try {
    const initialized = spawnSync(executable('initdb'), ['-D', directory, '-U', 'postgres', '-A', 'trust', '-E', 'UTF8', '--no-locale'], { windowsHide: true, encoding: 'utf8' })
    if (initialized.status !== 0) throw Error(initialized.stderr || initialized.error?.message || 'Falha ao iniciar cluster temporário.')
    const probe = net.createServer()
    await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve))
    const port = probe.address().port
    await new Promise(resolve => probe.close(resolve))
    server = spawn(executable('postgres'), ['-D', directory, '-h', '127.0.0.1', '-p', String(port)], { windowsHide: true, stdio: ['ignore', 'ignore', 'ignore'] })
    let ready = false
    for (let attempt = 0; attempt < 100; attempt++) {
      const client = new Client({ host: '127.0.0.1', port, user: 'postgres', database: 'postgres', connectionTimeoutMillis: 500, ssl: false })
      try { await client.connect(); ready = true; break } catch {} finally { await client.end() }
      await new Promise(resolve => setTimeout(resolve, 200))
    }
    if (!ready) throw Error('PostgreSQL temporário não ficou pronto.')
    console.log('[PostgreSQL] Instância descartável disponível somente em loopback.')
    const runner = demoIndex !== -1 ? 'run-demo-catalog.cjs' : e2eIndex === -1 ? 'run-integration.cjs' : 'run-e2e.cjs'
    const result = spawnSync(process.execPath, [path.join(__dirname, runner), '--postgres', ...(e2eIndex === -1 ? [] : process.argv.slice(e2eIndex + 1))], { stdio: 'inherit', windowsHide: true, env: { ...process.env, TEST_PG_HOST: '127.0.0.1', TEST_PG_PORT: String(port), TEST_PG_USER: 'postgres', TEST_PG_PASSWORD: '' } })
    process.exitCode = result.status ?? 1
  } finally {
    if (server?.pid) {
      spawnSync(executable('pg_ctl'), ['-D', directory, 'stop', '-m', 'fast', '-w'], { windowsHide: true, stdio: 'ignore' })
      if (server.exitCode === null) server.kill()
    }
    if (path.dirname(directory) !== os.tmpdir() || !path.basename(directory).startsWith('ehtech-postgres-')) throw Error('Diretório temporário inválido.')
    fs.rmSync(directory, { recursive: true, force: true })
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
