const { test } = require('node:test')
const assert = require('node:assert/strict')
const { MISSIONS, validId, searchMissionOptions, comboView } = require('../backend/differentials')
test('missões agrupam opções disponíveis por categoria e filtram pelo orçamento por item', () => {
  const categories = new Set(['notebooks', 'acessorios', 'audio', 'redes'])
  assert.ok(MISSIONS.every(mission => mission.categorias.every(category => categories.has(category))))
  const products = [500, 1100, 1800].map((preco, index) => ({ id_produto: index + 1, categoria: 'notebooks', preco, estoque: 1 }))
  const services = [{ id_servico: 1, categoria: 'suporte', preco_base: '100.10' }]
  const options = searchMissionOptions(MISSIONS[0], 1000, products, services)
  assert.deepEqual(options.categorias.map(group => group.categoria), ['notebooks'])
  assert.deepEqual(options.categorias[0].produtos.map(item => item.id_produto), [1])
  assert.equal(options.categorias[0].produtos[0].preco, 500)
  assert.equal(options.servicos[0].preco_base, 100.1)
  const empty = searchMissionOptions(MISSIONS[1], 10, [], [])
  assert.deepEqual(empty.categorias.map(group => group.produtos), [[], [], []])
  assert.deepEqual(empty.servicos, [])
  assert.equal(searchMissionOptions(MISSIONS[0], 1000, products, [{ ...services[0], preco_base: null }]).servicos.length, 0)
})

test('home office filtra acessórios e áudio pelo tipo anunciado, mantendo os limites de preço e estoque', () => {
  const mission = MISSIONS.find(item => item.id === 'home-office')
  const products = [
    { id_produto: 1, categoria: 'acessorios', nome: 'Película para celular', preco: 20, estoque: 2 },
    { id_produto: 2, categoria: 'acessorios', nome: 'Mouse sem fio', preco: 90, estoque: 1 },
    { id_produto: 3, categoria: 'audio', nome: 'Caixa de som para festa', preco: 80, estoque: 1 },
    { id_produto: 4, categoria: 'audio', nome: 'Fones USB', preco: 100, estoque: 1 },
    { id_produto: 5, categoria: 'audio', nome: 'Headset', preco: 130, estoque: 1 },
    { id_produto: 6, categoria: 'acessorios', nome: 'Teclado', preco: 49, estoque: 0 },
    { id_produto: 7, categoria: 'notebooks', nome: 'ThinkPad', preco: 100, estoque: 1 },
  ]
  const result = searchMissionOptions(mission, 100, products, [])
  assert.deepEqual(result.categorias.map(group => group.produtos.map(item => item.id_produto)), [[7], [2], [4]])
})
test('combos somam centavos sem transformar preço desconhecido em gratuito; IDs são estritos', () => {
  assert.equal(comboView({ produto_preco: '0.10', preco_base: '0.20' }).total_estimado, 0.3)
  assert.equal(comboView({ produto_preco: '10', preco_base: null }).total_estimado, null)
  for (const id of ['1x', '1 OR 1=1', 0, -1, 1.1, Number.MAX_SAFE_INTEGER + 1]) assert.equal(validId(id), false)
  assert.equal(validId('12'), true)
})
