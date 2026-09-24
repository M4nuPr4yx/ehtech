const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

function loadAdapter(env, dependencies) {
  const context = { module: { exports: {} }, process: { env }, console: { log() {} }, require(name) {
    if (name === './env') return {}
    if (Object.hasOwn(dependencies, name)) return dependencies[name]
    throw new Error(`Dependência inesperada: ${name}`)
  } }
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../backend/db.js'), 'utf8'), context)
  return context.module.exports
}

test('PostgreSQL mantém consultas e transações na conexão adquirida', async () => {
  const calls = []
  const client = { query: async (sql, params) => { calls.push({ sql, params }); return { rows: /^SELECT/.test(sql) ? [{ total: 3 }] : [], rowCount: 0 } }, release: () => calls.push({ sql: 'RELEASE' }) }
  class Pool {
    async connect() { return client }
    async query() { throw new Error('Uma consulta de transação não pode usar outra conexão do pool') }
  }
  const pool = loadAdapter({ DATABASE_URL: 'postgresql://test.invalid/test' }, { pg: { Pool }, 'mysql2/promise': {} })
  const connection = await pool.getConnection()
  await connection.beginTransaction()
  const [rows] = await connection.execute('SELECT COUNT(*) AS total FROM produtos WHERE vendedor_id = ?', [7])
  assert.equal(rows[0].total, 3)
  await connection.commit()
  await connection.rollback()
  connection.release()
  assert.deepEqual(calls.map(call => call.sql), ['BEGIN', 'SELECT COUNT(*) AS total FROM produtos WHERE vendedor_id = $1', 'COMMIT', 'ROLLBACK', 'RELEASE'])
})

test('PostgreSQL preserva IDs de avaliação e converte upsert com os parâmetros corretos', async () => {
  const calls = []
  class Pool {
    async query(sql, params) { calls.push({ sql, params }); return { rows: [{ id_avaliacao: 42 }], rowCount: 1 } }
  }
  const pool = loadAdapter({ DATABASE_URL: 'postgresql://test.invalid/test' }, { pg: { Pool }, 'mysql2/promise': {} })
  const [result] = await pool.execute('INSERT INTO avaliacoes_servico (nota) VALUES (?)', [5])
  assert.equal(result.insertId, 42)
  await pool.execute('INSERT INTO avaliacoes (produto_id, avaliador_id, nota, comentario) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE nota = ?, comentario = ?', [1, 2, 5, 'Ótimo', 5, 'Ótimo'])
  assert.match(calls[1].sql, /ON CONFLICT \(produto_id, avaliador_id\) DO UPDATE/)
  assert.equal(calls[1].params.length, 4)
})

test('MySQL com URL conserva opções de conexão e SSL configuradas', () => {
  let received
  loadAdapter({ MYSQL_URL: 'mysql://localhost/test', DB_SSL: 'false' }, { 'mysql2/promise': { createPool(config) { received = config; return {} } } })
  assert.equal(received.uri, 'mysql://localhost/test')
  assert.equal(received.ssl, false)
  assert.equal(received.connectionLimit, 10)
  assert.equal(received.enableKeepAlive, true)
})
