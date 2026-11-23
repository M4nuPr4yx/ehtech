const { test } = require('node:test')
const assert = require('node:assert/strict')
const { specificationFields, normalizeSpecifications, readSpecifications } = require('../shared/product-specs.cjs')
const { publicProduct } = require('../backend/product-origins')
const { initializeProductSpecifications } = require('../backend/database/product-specifications')

test('ficha aceita campos válidos da categoria e rejeita dados fora do contrato', () => {
  assert.ok(specificationFields(' Notebooks ').some(([field]) => field === 'memoria_ram'))
  assert.ok(specificationFields('Áudio').some(([field]) => field === 'conexao'))
  assert.deepEqual(normalizeSpecifications('notebooks', { memoria_ram: ' 16 GB ', modelo: ' ' }, true), { memoria_ram: '16 GB' })
  for (const invalid of [[], { memoria_ram: 16 }, { memoria_ram: '16\nGB' }, { marca: 'x'.repeat(81) }, { padrao_wifi: 'Wi-Fi 6' }]) {
    assert.equal(normalizeSpecifications('notebooks', invalid, true), null)
  }
  assert.deepEqual(normalizeSpecifications('games', { marca: 'Marca X', memoria_ram: '16 GB' }), { marca: 'Marca X' })
})

test('detalhe público carrega a ficha armazenada e preserva anúncios antigos', () => {
  assert.deepEqual(publicProduct({ categoria: 'notebooks', origem_snapshot: 'privado', especificacoes: '{"memoria_ram":"8 GB"}' }), {
    categoria: 'notebooks', especificacoes: { memoria_ram: '8 GB' },
  })
  assert.deepEqual(publicProduct({ categoria: 'notebooks' }).especificacoes, {})
  assert.deepEqual(readSpecifications('notebooks', 'dado legado inválido'), {})
})

test('migração aceita coluna preexistente no MySQL e PostgreSQL e propaga outros erros', async () => {
  const queries = []
  await initializeProductSpecifications({ async execute(sql) { queries.push(sql) } })
  assert.deepEqual(queries, ['ALTER TABLE produtos ADD COLUMN especificacoes TEXT NULL'])
  for (const code of ['ER_DUP_FIELDNAME', '42701']) {
    await initializeProductSpecifications({ async execute() { throw Object.assign(Error(), { code }) } })
  }
  await assert.rejects(initializeProductSpecifications({ async execute() { throw Error('sem acesso') } }), /sem acesso/)
})
