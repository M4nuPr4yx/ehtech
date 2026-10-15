const { test } = require('node:test')
const assert = require('node:assert/strict')
const { catalogQuery, dateFilter } = require('../backend/product-catalog')
const { selectOrigin, publicProduct, productOrigin } = require('../backend/product-origins')
const { shippingOptions, chooseShipping, loadCart } = require('../backend/checkout')
const { validateAddress } = require('../backend/addresses')
const address = validateAddress({ destinatario: 'Pessoa Teste', telefone: '11999991234', identificacao: 'Origem', cep: '01001000', uf: 'SP', cidade: 'São Paulo', bairro: 'Sé', logradouro: 'Praça da Sé', numero: '1', complemento: '', referencia: '', instrucoes: '', salvar: true }).value

test('origem exige endereço salvo, próprio, confirmado e com a versão atual', async () => {
  const row = { ...address, id: 2, usuario_id: 1, versao: 3, confirmado_em: new Date() }
  const pool = { execute: async (sql, values) => { assert.match(sql, /usuario_id = \?/); assert.match(sql, /salvar = TRUE/); assert.deepEqual(values, [2, 1]); return [[row]] } }
  const origin = await selectOrigin(pool, 1, 2, 3)
  assert.equal(origin.uf, 'SP')
  assert.equal(JSON.parse(origin.snapshot).cep, address.cep)
  await assert.rejects(selectOrigin(pool, 1, 2, 2), { status: 409 })
  await assert.rejects(selectOrigin(pool, 1, null, 3), { status: 400 })
  await assert.rejects(selectOrigin({ execute: async () => [[]] }, 8, 2, 3), { status: 404 })
  row.confirmado_em = null
  await assert.rejects(selectOrigin(pool, 1, 2, 3), { status: 409 })
  const safe = publicProduct({ nome: 'Produto', origem_uf: 'SP', origem_endereco_id: 2, origem_snapshot: origin.snapshot })
  assert.deepEqual(safe, { nome: 'Produto', origem_uf: 'SP' })
  assert.equal(productOrigin({ origem_snapshot: '{broken' }), null)
})
test('catálogo filtra região, datas inclusivas e busca literal; relevância usa parâmetros', () => {
  const query = catalogQuery({ search: 'SSD_100%', uf: 'sp', cidade: 'São Paulo', dataInicio: '2026-10-01', dataFim: '2026-10-15', ordenacao: 'relevancia', page: '2', limit: '12' })
  assert.match(query.where, /origem_uf = \?/)
  assert.match(query.where, /LOWER\(origem_cidade\) = \?/)
  assert.ok(query.params.includes('2026-10-16 00:00:00'))
  assert.ok(query.params.includes('%ssd!_100!%%'))
  assert.ok(!query.where.includes('ssd'))
  assert.equal(query.orderParams[0], 'ssd_100%')
  assert.match(query.order, /CASE WHEN LOWER\(nome\)/)
  assert.match(catalogQuery({ ordenacao: 'antigos' }).order, /data_criacao ASC/)
  assert.match(catalogQuery({ ordenacao: '__proto__' }).order, /data_criacao DESC/)
  assert.throws(() => catalogQuery({ uf: 'XX' }), { status: 400 })
  assert.throws(() => dateFilter('2026-02-30'), { status: 400 })
  assert.throws(() => catalogQuery({ dataInicio: '2026-11-01', dataFim: '2026-10-01' }), { status: 400 })
})
test('frete separa origens do mesmo vendedor e não vaza endereço completo', () => {
  const product = { vendedor_id: 1, vendedor: 'Loja teste', exige_entrega: true, origem_snapshot: JSON.stringify(address) }
  const second = { ...product, origem_snapshot: JSON.stringify({ ...address, cep: '20040002', uf: 'RJ', cidade: 'Rio de Janeiro' }) }
  const cart = { items: [{ produto_id: 1, product }, { produto_id: 2, product: second }] }
  const rules = JSON.stringify([{ vendedor_id: 1, id: 'sp', nome: 'Origem SP', origem_ufs: ['SP'], origem_cep_inicio: '01000000', origem_cep_fim: '01999999', ufs: ['SP'], valor: 10 }, { vendedor_id: 1, id: 'rj', nome: 'Origem RJ', origem_ufs: ['RJ'], valor: 20 }])
  const groups = shippingOptions(cart, address, rules)
  assert.equal(groups.length, 2)
  assert.deepEqual(groups.map(group => group.opcoes[0].id), ['sp', 'rj'])
  assert.ok(!JSON.stringify(groups).includes('Praça da Sé'))
  assert.ok(!JSON.stringify(groups).includes('11999991234'))
  assert.throws(() => chooseShipping(groups, groups.map(group => ({ vendedor_id: 1, id: group.opcoes[0].id }))), { status: 400 })
  const delivery = chooseShipping(groups, groups.map(group => ({ grupo_id: group.grupo_id, vendedor_id: 1, id: group.opcoes[0].id })))
  assert.equal(delivery.reduce((sum, option) => sum + option.valor, 0), 30)
  const legacy = shippingOptions({ items: [{ product: { ...product, origem_snapshot: null } }] }, address, rules)
  assert.equal(legacy[0].opcoes.length, 0)
  assert.match(legacy[0].motivo, /origem/)
})
test('alterar a origem do anúncio invalida o fingerprint do carrinho', async () => {
  const product = { id_produto: 1, nome: 'Produto', preco: 10, estoque: 2, vendedor_id: 2, exige_entrega: true, origem_snapshot: JSON.stringify(address) }
  const pool = { execute: async () => [[product]] }
  const first = await loadCart(pool, 1, [{ produto_id: 1, quantidade: 1 }])
  product.origem_snapshot = JSON.stringify({ ...address, numero: '200' })
  const second = await loadCart(pool, 1, [{ produto_id: 1, quantidade: 1 }])
  assert.notEqual(first.fingerprint, second.fingerprint)
})
