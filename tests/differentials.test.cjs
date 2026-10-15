const { test } = require('node:test')
const assert = require('node:assert/strict')
const { CHECKS, MISSIONS, validId, fingerprint, checklistResult, certificateStatus, recommend, comboView } = require('../backend/differentials')

test('certificado exige checklist completo e falhas impedem selo', () => {
  const checks = Object.fromEntries(Object.keys(CHECKS).map(key => [key, 'aprovado']))
  assert.equal(checklistResult(checks), 'emitido')
  assert.equal(checklistResult({ ...checks, bateria: 'nao_aplicavel' }), 'emitido')
  assert.equal(checklistResult({ ...checks, funcionamento: 'nao_aplicavel' }), null)
  assert.equal(checklistResult({ ...checks, integridade: 'reprovado' }), 'reprovado')
  assert.equal(checklistResult({ ...checks, extra: 'aprovado' }), null)
  assert.equal(checklistResult({}), null)
  assert.equal(checklistResult(null), null)
  assert.equal(checklistResult([]), null)
})
test('selo expira e é invalidado por mudança de ficha, anúncio, dono ou aprovação', () => {
  const passport = { id: 1, proprietario_id: 3, nome: 'Notebook', tipo: 'Notebook', modelo: 'Teste', componentes: '[]' }
  const product = { id_produto: 2, vendedor_id: 3, nome: 'Notebook usado', descricao: 'Equipamento', imagem: 'foto.png', categoria: 'notebooks', status_aprovacao: 'aprovado' }
  const now = Date.parse('2026-10-01T00:00:00Z')
  const certificate = { status: 'emitido', ficha_hash: fingerprint(passport, product), expira_em: '2026-10-02T00:00:00Z' }
  assert.equal(certificateStatus(certificate, passport, product, now), 'emitido')
  assert.equal(certificateStatus(certificate, passport, { ...product, preco: 999, estoque: 0 }, now), 'emitido')
  for (const changed of [{ modelo: 'Mudou' }, { proprietario_id: 8 }, { componentes: '[{}]' }]) assert.equal(certificateStatus(certificate, { ...passport, ...changed }, product, now), 'desatualizado')
  for (const changed of [{ descricao: 'Mudou' }, { imagem: 'outra.png' }, { vendedor_id: 8 }, { status_aprovacao: 'pendente' }]) assert.equal(certificateStatus(certificate, passport, { ...product, ...changed }, now), 'desatualizado')
  assert.equal(certificateStatus(certificate, passport, product, now + 86400000), 'expirado')
  assert.equal(certificateStatus({ ...certificate, status: 'revogado' }, passport, product, now), 'revogado')
  assert.equal(certificateStatus(certificate, null, product, now), 'desatualizado')
})
test('missões geram três faixas determinísticas com centavos, lacunas e sem desempenho inventado', () => {
  const categories = new Set(['notebooks', 'acessorios', 'audio', 'redes'])
  assert.ok(MISSIONS.every(mission => mission.categorias.every(category => categories.has(category))))
  const products = [500, 1100, 1800].map((preco, index) => ({ id_produto: index + 1, categoria: 'notebooks', preco, estoque: 1 }))
  const services = [{ id_servico: 1, categoria: 'suporte', preco_base: '100.10' }]
  const tiers = recommend(MISSIONS[0], 2000.10, products, services)
  assert.equal(tiers.length, 3)
  assert.deepEqual(tiers.map(tier => tier.total_estimado), [600.1, 600.1, 1900.1])
  assert.ok(tiers.every(tier => tier.completo && tier.total_estimado <= 2000.10 && tier.consumo_estimado === null))
  assert.deepEqual(tiers, recommend(MISSIONS[0], 2000.10, products, services))
  const empty = recommend(MISSIONS[1], 10, [], [])
  assert.ok(empty.every(tier => !tier.completo && tier.produtos.length === 0 && tier.faltantes.length === 3 && tier.servico === null))
  assert.ok(recommend(MISSIONS[0], 10, products, services).every(tier => !tier.completo))
  assert.ok(recommend(MISSIONS[0], 1000, products, [{ ...services[0], preco_base: null }]).every(tier => !tier.completo && tier.servico === null))
})
test('combos somam centavos sem transformar preço desconhecido em gratuito; IDs são estritos', () => {
  assert.equal(comboView({ produto_preco: '0.10', preco_base: '0.20' }).total_estimado, 0.3)
  assert.equal(comboView({ produto_preco: '10', preco_base: null }).total_estimado, null)
  for (const id of ['1x', '1 OR 1=1', 0, -1, 1.1, Number.MAX_SAFE_INTEGER + 1]) assert.equal(validId(id), false)
  assert.equal(validId('12'), true)
})
