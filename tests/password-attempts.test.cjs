const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createPasswordAttempts } = require('../backend/password-attempts')

function fixture(failures, code, attempts = 0) {
  const counts = { transactions: 0, commits: 0, rollbacks: 0, releases: 0, updates: 0 }
  const pool = {
    execute: async () => [{}],
    getConnection: async () => ({
      beginTransaction: async () => { counts.transactions++ },
      commit: async () => { counts.commits++ },
      rollback: async () => { counts.rollbacks++ },
      release: () => { counts.releases++ },
      execute: async (sql, params) => {
        if (sql.startsWith('SELECT')) {
          if (counts.transactions <= failures) throw Object.assign(new Error('Conflito de teste'), { code })
          return [params.map(chave => ({ chave, janela: Math.floor(Date.now() / 900000), tentativas: attempts }))]
        }
        if (sql.startsWith('UPDATE')) counts.updates++
        return [{}]
      }
    })
  }
  return { counts, reserve: createPasswordAttempts(pool, 'segredo-exclusivo-de-teste') }
}
const req = { ip: '192.0.2.10' }, email = 'conta@example.test'

test('reserva recupera deadlock MySQL e conflitos PostgreSQL sem duplicar a contagem', async () => {
  for (const code of ['ER_LOCK_DEADLOCK', '40P01', '40001']) {
    const { reserve, counts } = fixture(1, code)
    await reserve(req, email)
    assert.deepEqual(counts, { transactions: 2, commits: 1, rollbacks: 1, releases: 2, updates: 2 })
  }
})

test('conflito persistente encerra após cinco transações e mantém acesso bloqueado', async () => {
  const { reserve, counts } = fixture(Infinity, 'ER_LOCK_DEADLOCK')
  await assert.rejects(reserve(req, email), error => error.status === 503)
  assert.deepEqual(counts, { transactions: 5, commits: 0, rollbacks: 5, releases: 5, updates: 0 })
})

test('limite excedido e erros de conexão não repetem nem liberam a reserva', async () => {
  const limited = fixture(0, null, 100)
  await assert.rejects(limited.reserve(req, email), error => error.status === 429 && error.retryAfter > 0)
  assert.equal(limited.counts.transactions, 1)
  assert.equal(limited.counts.updates, 0)
  const unavailable = fixture(1, 'ECONNRESET')
  await assert.rejects(unavailable.reserve(req, email), error => error.code === 'ECONNRESET')
  assert.equal(unavailable.counts.transactions, 1)
  assert.equal(unavailable.counts.commits, 0)
})
