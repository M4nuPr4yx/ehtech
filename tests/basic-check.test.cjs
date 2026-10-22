const { test } = require('node:test'), assert = require('node:assert/strict')
const { basicCheck } = require('../backend/components/basic-check')
const parts = require('../backend/components/data/catalog.json').items
const find = name => parts.find(item => item.modelo.toLowerCase() === name.toLowerCase())
test('checagem sem IA cruza socket/DDR, BIOS e capacidade sem inferir variante de RAM', () => {
  const cpu = find('AMD Ryzen 5 5600'), board = find('Asus PRIME B550M-A'), ram = parts.find(item => item.tipo === 'memoria' && item.especificacoes.speed?.[0] === 5)
  const body = { componentes: [cpu, board, ram].map(item => ({ id: item.id, quantidade: 1 })), bios: '2423' }
  const result = basicCheck(body)
  assert.equal(result.status, 'incompativel'); assert.equal(result.metodo, 'regras_locais')
  assert.equal(result.verificacoes.find(item => item.codigo === 'socket').status, 'compativel')
  assert.equal(result.verificacoes.find(item => item.codigo === 'bios').status, 'compativel')
  assert.equal(result.verificacoes.find(item => item.codigo.startsWith('ddr_')).status, 'incompativel')
  assert.ok(result.verificacoes.some(item => item.codigo.startsWith('formato_') && item.status === 'nao_verificado'))
})
test('modelos sem ficha revisada e categorias fora do escopo nunca recebem aprovação completa', () => {
  const cpu = parts.find(item => item.tipo === 'processador' && item.modelo.startsWith('Intel')), board = find('Asus PRIME B550M-A')
  const result = basicCheck({ componentes: [cpu, board].map(item => ({ id: item.id, quantidade: 1 })) })
  assert.equal(result.status, 'nao_verificado')
  assert.equal(result.verificacoes.find(item => item.codigo === 'socket').status, 'nao_verificado')
  assert.throws(() => basicCheck({ componentes: [{ id: 'desconhecido', quantidade: 1 }, { id: board.id, quantidade: 1 }] }), /desconhecidas/)
})
