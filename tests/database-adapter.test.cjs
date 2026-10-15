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

test('PostgreSQL traduz migração de endereços e checkout com booleanos e snapshots', async () => {
  const queries = []
  class Pool {
    async query(sql) { queries.push(sql); return { rows: [], rowCount: 0 } }
  }
  const pool = loadAdapter({ DATABASE_URL: 'postgresql://test.invalid/test' }, { pg: { Pool }, 'mysql2/promise': {} })
  await require('../backend/database/addresses').initializeAddresses(pool)
  assert.equal(queries.length, 8)
  assert.match(queries[0], /id SERIAL PRIMARY KEY/)
  assert.match(queries[0], /confirmado_em TIMESTAMP NULL/)
  assert.match(queries[1], /id VARCHAR\(36\) PRIMARY KEY/)
  assert.match(queries[1], /endereco_versao INT/)
  assert.match(queries[2], /exige_entrega BOOLEAN NOT NULL DEFAULT TRUE/)
  for (const sql of queries) assert.doesNotMatch(sql, /AUTO_INCREMENT|INDEX idx_/)
})

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

test('PostgreSQL traduz tabelas do passaporte e mantém vínculos em cascata', async () => {
  const calls = []
  class Pool {
    async query(sql, params) { calls.push({ sql, params }); return { rows: [], rowCount: 0 } }
  }
  const pool = loadAdapter({ DATABASE_URL: 'postgresql://test.invalid/test' }, { pg: { Pool }, 'mysql2/promise': {} })
  await require('../backend/database/passports').initializePassports(pool)
  assert.equal(calls.length, 2)
  for (const { sql } of calls) {
    assert.match(sql, /id SERIAL PRIMARY KEY/)
    assert.match(sql, /FOREIGN KEY.*REFERENCES.*ON DELETE CASCADE/)
    assert.doesNotMatch(sql, /AUTO_INCREMENT|INDEX idx_/)
  }
  await pool.execute('SELECT id FROM passaportes WHERE transferencia_hash = ? AND destinatario_id = ? AND transferencia_expira_em > CURRENT_TIMESTAMP FOR UPDATE', ['test-hash', 7])
  assert.match(calls[2].sql, /transferencia_hash = \$1 AND destinatario_id = \$2/)
  assert.match(calls[2].sql, /FOR UPDATE$/)
})

test('PostgreSQL migra catálogo e preserva revisões existentes ao carregar os modelos iniciais', async () => {
  const calls = []
  class Pool { async query(sql, params) { calls.push({ sql, params }); return { rows: [], rowCount: 0 } } }
  const pool = loadAdapter({ DATABASE_URL: 'postgresql://test.invalid/test' }, { pg: { Pool }, 'mysql2/promise': {} })
  await require('../backend/database/components').initializeComponents(pool)
  assert.match(calls[0].sql, /id SERIAL PRIMARY KEY/)
  assert.doesNotMatch(calls[0].sql, /AUTO_INCREMENT|INDEX idx_/)
  assert.match(calls[1].sql, /ALTER TABLE produtos ADD COLUMN componente_id INT NULL/)
  assert.equal(calls.length, 8)
  for (const call of calls.slice(2)) {
    assert.match(call.sql, /ON CONFLICT DO NOTHING/)
    assert.doesNotMatch(call.sql, /UPDATE|IGNORE/)
  }
})
