const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const vm = require('node:vm')

test('setup em clone novo gera chave exclusiva e preserva ambiente existente', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ehtech-setup-test-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  fs.mkdirSync(path.join(root, 'backend'))
  fs.mkdirSync(path.join(root, 'scripts'))
  fs.copyFileSync(path.join(__dirname, '../scripts/setup.cjs'), path.join(root, 'scripts/setup.cjs'))
  fs.copyFileSync(path.join(__dirname, '../backend/.env.example'), path.join(root, 'backend/.env.example'))
  const run = () => {
    const result = spawnSync(process.execPath, ['scripts/setup.cjs'], { cwd: root, encoding: 'utf8' })
    assert.equal(result.status, 0, result.stderr)
    return result.stdout
  }
  const output = run()
  const environment = fs.readFileSync(path.join(root, 'backend/.env'), 'utf8')
  const secret = environment.match(/^API_SEGREDO=([a-f0-9]{64})$/m)?.[1]
  assert.ok(secret, 'Chave aleatória de 32 bytes obrigatória')
  assert.ok(!output.includes(secret), 'O setup não deve imprimir o segredo')
  const existing = `${environment}\n# Configuração personalizada preservada\n`
  fs.writeFileSync(path.join(root, 'backend/.env'), existing)
  run()
  assert.equal(fs.readFileSync(path.join(root, 'backend/.env'), 'utf8'), existing)
  fs.unlinkSync(path.join(root, 'backend/.env'))
  run()
  assert.ok(!fs.readFileSync(path.join(root, 'backend/.env'), 'utf8').includes(secret), 'Instalações novas devem usar chaves distintas')
})

function loadTestConfig(fileValues, env) {
  const loadedModule = { exports: {} }
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'helpers/mysql-config.cjs'), 'utf8'), {
    module: loadedModule, __dirname: path.join(__dirname, 'helpers'), process: { env },
    require(name) {
      if (name === 'node:fs') return { existsSync: () => fileValues !== null, readFileSync: () => '' }
      if (name === 'dotenv') return { parse: () => fileValues }
      return require(name)
    },
  })
  return loadedModule.exports.mysqlTestConfig()
}

test('integração aceita ambiente sem .env e credenciais isoladas TEST_DB_* têm prioridade', () => {
  const fromProcess = loadTestConfig(null, { DB_HOST: 'mysql', DB_PORT: '3308', DB_USER: 'ci', DB_PASSWORD: 'ficticia' })
  assert.equal(fromProcess.host, 'mysql')
  assert.equal(fromProcess.port, 3308)
  assert.equal(fromProcess.user, 'ci')
  const isolated = loadTestConfig({ DB_USER: 'app', DB_PASSWORD: 'arquivo', DB_PORTA: '3306' }, {
    DB_USER: 'processo', TEST_DB_USER: 'teste', TEST_DB_PASSWORD: '', TEST_DB_PORT: '3307',
  })
  assert.equal(isolated.user, 'teste')
  assert.equal(isolated.password, '')
  assert.equal(isolated.port, 3307)
  assert.equal(loadTestConfig({ DB_USER: 'arquivo' }, { DB_USER: 'processo' }).user, 'processo')
})
