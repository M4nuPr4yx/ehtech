const { test } = require('node:test')
const assert = require('node:assert/strict')
const { ensureSchema, SCHEMA_VERSION } = require('../backend/database/schema-version')

test('nova instância consulta a versão concluída sem repetir DDL ou migrações', async () => {
  for (const completed of [true, 1, '1']) {
    let queries = 0
    const pool = { async execute(sql, params) {
      queries++
      assert.match(sql, /^SELECT concluida/)
      assert.deepEqual(params, [SCHEMA_VERSION])
      return [[{ concluida: completed }], []]
    } }
    for (let instance = 0; instance < 3; instance++) {
      assert.equal(await ensureSchema(pool, () => assert.fail('Migração não deve repetir')), false)
    }
    assert.equal(queries, 3)
  }
})

test('falha de conexão não é confundida com tabela ausente nem inicia migrações', async () => {
  const failure = Object.assign(new Error('offline'), { code: 'ECONNREFUSED' })
  const pool = { async execute() { throw failure } }
  await assert.rejects(ensureSchema(pool, () => assert.fail('Migração não deve iniciar')), error => error === failure)
})
