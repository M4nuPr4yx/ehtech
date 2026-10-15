const { test } = require('node:test')
const assert = require('node:assert/strict')
const { validateAddress, lookupCep, addressFingerprint } = require('../backend/addresses')
const { normalizeItems, shippingOptions, chooseShipping, requireReady } = require('../backend/checkout')

const address = { destinatario: 'Pessoa de Teste', telefone: '(11) 99999-1234', identificacao: 'Casa', cep: '01001-000', uf: 'SP', cidade: 'São Paulo', bairro: 'Sé', logradouro: 'Praça da Sé', numero: '10', complemento: '', referencia: '', instrucoes: '', salvar: true, principal: true, sem_numero: false }

test('endereço valida todos os obrigatórios, CEP, DDD, UF e sem número', () => {
  const result = validateAddress(address)
  assert.equal(result.valid, true)
  assert.equal(result.value.cep, '01001000')
  assert.equal(result.value.telefone, '11999991234')
  for (const field of ['destinatario', 'telefone', 'cep', 'uf', 'cidade', 'bairro', 'logradouro', 'identificacao', 'numero']) {
    assert.ok(validateAddress({ ...address, [field]: '' }).errors[field], field)
  }
  assert.equal(validateAddress({ ...address, numero: '', sem_numero: true }).valid, true)
  assert.ok(validateAddress({ ...address, uf: 'XX' }).errors.uf)
  assert.ok(validateAddress({ ...address, cep: '00000-000' }).errors.cep)
  assert.ok(validateAddress({ ...address, telefone: '999999999' }).errors.telefone)
  assert.equal(validateAddress({ ...address, salvar: false }).value.principal, false)
  assert.equal(addressFingerprint(result.value), addressFingerprint(validateAddress({ ...address, principal: false }).value))
})

test('CEP: válido, inválido, inexistente, sem bairro e indisponibilidade', async () => {
  let calls = 0
  await assert.rejects(lookupCep('123', () => { calls++; }), { status: 400 })
  assert.equal(calls, 0)
  const result = await lookupCep('01001000', async url => {
    assert.equal(url, 'https://viacep.com.br/ws/01001000/json/')
    return { ok: true, json: async () => ({ uf: 'SP', localidade: 'São Paulo', logradouro: 'Praça da Sé' }) }
  })
  assert.equal(result.bairro, '')
  assert.equal(result.cidade, 'São Paulo')
  await assert.rejects(lookupCep('99999999', async () => ({ ok: true, json: async () => ({ erro: true }) })), { status: 404 })
  await assert.rejects(lookupCep('01001000', async () => { throw new Error('offline') }), { status: 503 })
})

test('frete real por vendedor, faixa de CEP, UF e ausência de cobertura', () => {
  const cart = { items: [{ product: { vendedor_id: 1, vendedor: 'Loja A', exige_entrega: true } }, { product: { vendedor_id: 2, vendedor: 'Loja B', exige_entrega: true } }, { product: { vendedor_id: 3, vendedor: 'Digital', exige_entrega: false } }] }
  const rules = JSON.stringify([{ vendedor_id: 1, id: 'local', nome: 'Local', valor: 10, ufs: ['SP'], cep_inicio: '01000000', cep_fim: '01999999', dias_min: 1, dias_max: 2 }, { vendedor_id: 2, id: 'gratis', nome: 'Grátis', valor: 0 }])
  const groups = shippingOptions(cart, validateAddress(address).value, rules)
  assert.equal(groups.length, 2)
  assert.equal(chooseShipping(groups, [{ vendedor_id: 1, id: 'local' }, { vendedor_id: 2, id: 'gratis' }]).reduce((sum, option) => sum + option.valor, 0), 10)
  assert.throws(() => chooseShipping(groups, [{ vendedor_id: 1, id: 'local' }]), { status: 400 })
  assert.throws(() => chooseShipping(groups, [null, null]), { status: 400 })
  assert.throws(() => chooseShipping(groups, [{ vendedor_id: 1, id: 'inventada' }, { vendedor_id: 2, id: 'gratis' }]), { status: 409 })
  assert.equal(shippingOptions(cart, { cep: '20000000', uf: 'RJ' }, rules)[0].opcoes.length, 0)
  assert.equal(shippingOptions(cart, address, '[]')[0].opcoes.length, 0)
  assert.equal(shippingOptions(cart, address, 'invalid')[0].opcoes.length, 0)
  assert.equal(shippingOptions(cart, address, '[null]')[0].opcoes.length, 0)
  assert.throws(() => requireReady({ confirmed: false }), { status: 409 })
  assert.throws(() => requireReady({ confirmed: true, ready: false }), { status: 409 })
})

test('carrinho rejeita IDs repetidos, fracionários e quantidades indevidas', () => {
  assert.throws(() => normalizeItems([{ produto_id: 1, quantidade: 1.5 }]), { status: 400 })
  assert.throws(() => normalizeItems([{ produto_id: 1, quantidade: 0 }]), { status: 400 })
  assert.throws(() => normalizeItems([{ produto_id: 1, quantidade: 1 }, { produto_id: 1, quantidade: 2 }]), { status: 400 })
  assert.deepEqual(normalizeItems([{ produto_id: 3, quantidade: 2 }]), [{ produto_id: 3, quantidade: 2 }])
})
