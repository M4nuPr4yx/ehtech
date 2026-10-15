const { test } = require('node:test')
const assert = require('node:assert/strict')
const { shippingOptions, chooseShipping, freightSummary, orderView, inspectCheckout, checkoutView } = require('../backend/checkout')
const { validateAddress } = require('../backend/addresses')

const address = validateAddress({ destinatario: 'Pessoa Teste', telefone: '11999991234', identificacao: 'Destino', cep: '01001000', uf: 'SP', cidade: 'São Paulo', bairro: 'Sé', logradouro: 'Praça da Sé', numero: '1' }).value
const product = { id_produto: 1, nome: 'Produto teste', preco: 100, estoque: 5, vendedor_id: 2, vendedor: 'Loja teste', exige_entrega: true, origem_snapshot: JSON.stringify({ ...address, cep: '01002000', numero: '20' }) }
const cart = { items: [{ produto_id: 1, quantidade: 1, product }] }

test('endereços próximos sem tabela oferecem negociação explícita, não frete zero', () => {
  const groups = shippingOptions(cart, address, '[]')
  assert.equal(groups[0].origem.cidade, address.cidade)
  const delivery = chooseShipping(groups, [{ grupo_id: groups[0].grupo_id, vendedor_id: 2, id: 'a-combinar', valor: 0, tipo: 'gratis' }])
  assert.equal(delivery[0].valor, null)
  assert.equal(delivery[0].tipo, 'a_combinar')
  assert.deepEqual(freightSummary(delivery), { pending: true, known: 0 })
  assert.throws(() => chooseShipping(groups, []), { status: 400 })
  assert.equal(shippingOptions({ items: [{ ...cart.items[0], product: { ...product, origem_snapshot: null } }] }, address, '[]')[0].opcoes.length, 0)
})

test('tarifa configurada é preservada; vários vendedores mantêm conhecidos e pendentes separados', () => {
  const mixed = { items: [...cart.items, { produto_id: 2, product: { ...product, vendedor_id: 3 } }] }
  const groups = shippingOptions(mixed, address, JSON.stringify([{ vendedor_id: 2, id: 'taxa', nome: 'Entrega', valor: 15 }]))
  assert.equal(groups[0].opcoes[0].valor, 15)
  assert.equal(groups[0].opcoes.length, 1)
  const delivery = chooseShipping(groups, groups.map(group => ({ grupo_id: group.grupo_id, vendedor_id: group.vendedor_id, id: group.opcoes[0].id })))
  assert.deepEqual(freightSummary(delivery), { pending: true, known: 15 })
  const order = orderView({ total: '215.00', frete: '15.00', entrega: JSON.stringify(delivery) })
  assert.equal(order.total, null); assert.equal(order.total_parcial, 215)
  assert.equal(order.frete, null); assert.equal(order.frete_conhecido, 15); assert.equal(order.frete_pendente, true)
  const quoted = orderView({ total: '115.00', frete: '15.00', entrega: JSON.stringify([delivery[0]]) })
  assert.equal(quoted.total, 115); assert.equal(quoted.frete, 15); assert.equal(quoted.frete_pendente, false)
})

test('checkout aceita negociação selecionada, mantém endereço confirmado e não retorna total final', async () => {
  const { loadCart } = require('../backend/checkout')
  const row = { ...address, id: 1, usuario_id: 1, versao: 1, confirmado_em: new Date() }
  const pool = { async execute(sql) { return [/FROM produtos/.test(sql) ? [product] : [row]] } }
  const loaded = await loadCart(pool, 1, [{ produto_id: 1, quantidade: 1 }])
  const groups = shippingOptions(loaded, address, '[]')
  const selected = chooseShipping(groups, [{ grupo_id: groups[0].grupo_id, vendedor_id: 2, id: 'a-combinar' }])
  const session = { id: 'test-session', itens: JSON.stringify([{ produto_id: 1, quantidade: 1 }]), carrinho_hash: loaded.fingerprint, endereco_id: 1, endereco_versao: 1, confirmado_em: new Date(), entrega: JSON.stringify(selected) }
  const previous = process.env.SHIPPING_RULES_JSON
  process.env.SHIPPING_RULES_JSON = '[]'
  try {
    const state = await inspectCheckout(pool, session, 1)
    const view = checkoutView(session, state)
    assert.equal(view.pronto, true); assert.equal(view.frete_pendente, true)
    assert.equal(view.total, null); assert.equal(view.frete, null); assert.equal(view.total_parcial, 100)
    const unconfirmed = await inspectCheckout(pool, { ...session, confirmado_em: null }, 1)
    assert.equal(unconfirmed.ready, false); assert.equal(unconfirmed.confirmed, false)
    process.env.SHIPPING_RULES_JSON = JSON.stringify([{ vendedor_id: 2, id: 'nova-tarifa', nome: 'Entrega', valor: 20 }])
    assert.equal((await inspectCheckout(pool, session, 1)).ready, false)
  } finally { if (previous === undefined) delete process.env.SHIPPING_RULES_JSON; else process.env.SHIPPING_RULES_JSON = previous }
})

test('interface não formata frete pendente como grátis e restaura seleção por grupo', async () => {
  const { freightLabel, deliverySelections } = await import('../src/lib/shipping.js')
  assert.equal(freightLabel({ valor: null }), 'Valor a combinar')
  assert.match(freightLabel({ valor: 0 }), /0,00/)
  assert.deepEqual(deliverySelections([{ grupo_id: '2:1', vendedor_id: 2, id: 'local' }, { grupo_id: '2:2', vendedor_id: 2, id: 'a-combinar' }]), { '2:1': 'local', '2:2': 'a-combinar' })
})

test('contrato permite total pendente sem tornar subtotal ou tarifas conhecidas nulos', () => {
  const { extendSpecification } = require('../backend/docs/additional-routes')
  const schemas = extendSpecification(require('../backend/docs/openapi.json')).components.schemas
  assert.equal(schemas.DocCheckout.properties.total.nullable, true)
  assert.equal(schemas.DocPedido.properties.frete.nullable, true)
  assert.notEqual(schemas.DocCheckout.properties.subtotal.nullable, true)
  assert.notEqual(schemas.DocCheckout.properties.total_parcial.nullable, true)
  assert.equal(schemas.DocEntrega.properties.opcoes.items.properties.valor.nullable, true)
})
