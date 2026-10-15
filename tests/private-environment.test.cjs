const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { assertPrivateEnvironment } = require('../config/private-environment.cjs')

test('credenciais públicas impedem build/inicialização sem expor seus valores', () => {
  assert.doesNotThrow(() => assertPrivateEnvironment({ NEXT_PUBLIC_API_URL: '/api', GEMINI_API_KEY: 'segredo-ficticio' }))
  for (const name of ['GEMINI_API_KEY', 'GROQ_API_KEY', 'API_SEGREDO', 'DATABASE_URL', 'SMTP_PASS', 'DB_PASSWORD', 'ACCESS_TOKEN']) {
    assert.throws(() => assertPrivateEnvironment({ ['NEXT_PUBLIC_' + name]: 'segredo-ficticio' }), error => error.message.includes(name) && !error.message.includes('segredo-ficticio'))
  }
})

test('produção ignora configuração privada local e variáveis do processo têm prioridade', () => {
  const source = fs.readFileSync(path.join(__dirname, '../backend/env.js'), 'utf8')
  function load(initial) {
    const env = { ...initial }, calls = []
    vm.runInNewContext(source, { __dirname: '/backend', process: { env }, require(name) {
      if (name === 'node:path') return path
      if (name === '../config/private-environment.cjs') return { assertPrivateEnvironment: () => assertPrivateEnvironment(env) }
      if (name !== 'dotenv') throw Error('Import inesperado')
      return { config(options) {
        calls.push(path.basename(options.path))
        const data = options.path.endsWith('.env.ai') ? { COMPAT_AI_PROVIDER: 'gemini', GEMINI_API_KEY: 'chave-local-ficticia' } : { COMPAT_AI_PROVIDER: 'disabled', DB_PASSWORD: 'senha-local-ficticia' }
        for (const [key, value] of Object.entries(data)) if (!(key in env)) env[key] = value
      } }
    } })
    return { env, calls }
  }
  const local = load({})
  assert.equal(local.env.COMPAT_AI_PROVIDER, 'gemini'); assert.deepEqual(local.calls, ['.env.ai', '.env'])
  for (const initial of [{ NODE_ENV: 'production' }, { VERCEL: '1' }]) {
    const hosted = load({ ...initial, COMPAT_AI_PROVIDER: 'gemini', GEMINI_API_KEY: 'chave-hospedagem-ficticia' })
    assert.deepEqual(hosted.calls, ['.env'])
    assert.equal(hosted.env.GEMINI_API_KEY, 'chave-hospedagem-ficticia')
  }
  assert.equal(load({ COMPAT_AI_PROVIDER: 'groq' }).env.COMPAT_AI_PROVIDER, 'groq')
})

test('Git e publicação CLI ignoram arquivos privados e o navegador não importa integração de IA', () => {
  const root = path.join(__dirname, '..')
  assert.match(fs.readFileSync(path.join(root, '.gitignore'), 'utf8'), /^\.env\*$/m)
  assert.match(fs.readFileSync(path.join(root, '.vercelignore'), 'utf8'), /^\*\*\/\.env\*$/m)
  const client = fs.readFileSync(path.join(root, 'src/app/compatibilidade/CompatibilityAI.js'), 'utf8')
  assert.doesNotMatch(client, /GEMINI_API_KEY|GROQ_API_KEY|backend\/components|generativelanguage\.googleapis/)
})
