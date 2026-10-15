const { test } = require('node:test')
const assert = require('node:assert/strict')
const { userSearch } = require('../backend/user-search')

test('busca autenticada normaliza @usuário, exclui a própria conta e limita paginação', () => {
  const search = userSearch({ q: ' @Pessoa_Nova ', page: '2' }, 7)
  assert.equal(search.page, 2)
  assert.equal(search.limit, 12)
  assert.equal(search.params[0], 7)
  assert.match(search.where, /id_usuario <> \?/)
  assert.deepEqual(search.orderParams, ['pessoa_nova', 'pessoa!_nova%', 'pessoa_nova'])
  assert.doesNotMatch(search.where, /email|senha|role|enderecos/)
})
test('busca trata curingas literalmente e mantém texto suspeito apenas em parâmetros', () => {
  const query = "a%_' OR 1=1 --"
  const search = userSearch({ q: query }, 1)
  assert.equal(search.params[1], "%a!%!_' or 1=1 --%")
  assert.ok(!search.where.includes(query))
  assert.ok(!search.order.includes(query))
  assert.match(search.where, /ESCAPE '!'/)
})
test('busca rejeita termos vazios, extensos, controles e páginas inválidas', () => {
  for (const q of [undefined, null, [], {}, '', '@a', ' x ', 'a'.repeat(81), 'ab\ncd']) assert.throws(() => userSearch({ q }, 1), { status: 400 })
  for (const page of [0, -1, 1.5, '1x', 101, [], NaN]) assert.throws(() => userSearch({ q: 'teste', page }, 1), { status: 400 })
  assert.equal(userSearch({ q: 'teste' }, 1).page, 1)
})
