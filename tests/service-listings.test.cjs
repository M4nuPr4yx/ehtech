const { test } = require('node:test'), assert = require('node:assert/strict')
const { listingInput, requireVersion, POLICY_VERSION } = require('../backend/service-listings')
const { verifier, validCode } = require('../backend/delivery-code')
const draft = { titulo: 'Aulas de programação', descricao: 'Aulas individuais com exercícios e orientação para iniciantes.', categoria: 'aulas', tipo_preco: 'fixo', preco_base: '49.90', modalidade: 'remoto', regiao: '', prazo: 'Uma semana', destaques: ['Exercícios guiados'], entregaveis: 'Uma aula de uma hora e exercícios.', criterios_aceite: 'Realização da aula e envio dos exercícios.', revisoes: 1, politicas_versao: POLICY_VERSION }
test('serviços validam condições e não aceitam proprietário, aprovação ou preço adulterado', () => {
  assert.equal(listingInput(draft).preco_base, 49.9)
  assert.equal(listingInput({ ...draft, tipo_preco: 'sob_consulta', preco_base: null }).preco_base, null)
  for (const changed of [{ prestador_id: 5 }, { status_aprovacao: 'aprovado' }, { politicas_versao: 'antiga' }, { categoria: 'invalida' }, { preco_base: '49.901' }, { preco_base: true }, { titulo: '<script>teste</script>' }, { destaques: Array(9).fill('Teste') }, { revisoes: 0.1 }, { modalidade: 'presencial' }, { tipo_preco: 'sob_consulta', preco_base: 10 }]) assert.throws(() => listingInput({ ...draft, ...changed }), error => error.status === 400)
  assert.throws(() => requireVersion({ versao: 0 }, { versao: 1 }), error => error.status === 409)
  assert.throws(() => requireVersion({ versao: -1 }, { versao: 1 }), error => error.status === 400)
})
test('código de retirada usa segredo, salt e contexto; outro grupo ou comprador não valida', () => {
  const context = { entrega_id: 4, comprador_id: 7, salt: 'a'.repeat(32) }, secret = 'segredo-apenas-para-teste'
  context.digest = verifier(context, '001234', secret)
  assert.equal(validCode(context, '001234', secret), true)
  for (const code of ['1234', '001235', 1234, null]) assert.equal(validCode(context, code, secret), false)
  for (const changed of [{ entrega_id: 5 }, { comprador_id: 8 }, { salt: 'b'.repeat(32) }, { digest: 'malformado' }]) assert.equal(validCode({ ...context, ...changed }, '001234', secret), false)
  assert.equal(validCode(context, '001234', 'outra-chave'), false)
})
test('migração de serviços preserva alterações e snapshots nas reaplicações', async () => {
  const { initializeServiceListings } = require('../backend/database/service-listings')
  const columns = new Set(), queries = []
  const pool = { async execute(sql, values) {
    queries.push([sql, values])
    if (sql.startsWith('ALTER')) { if (columns.has(sql)) throw Object.assign(new Error('duplicate'), { code: '42701' }); columns.add(sql) }
    return [[], []]
  } }
  const seed = { slug: 'demo', titulo: 'Antigo exemplo', descricao: 'Conteúdo antigo', categoria: 'suporte', precoBase: 5, tipoPreco: 'fixo', prazo: 'Um dia', modalidade: 'remoto', regiao: 'Brasil', destaques: ['Teste'] }
  await initializeServiceListings(pool, [seed]); await initializeServiceListings(pool, [seed])
  assert.equal(columns.size, 10)
  const updates = queries.filter(([sql]) => sql.startsWith('UPDATE servicos'))
  assert.equal(updates.length, 2)
  assert.ok(updates.every(([sql]) => sql.includes("origem = 'legado'") && sql.includes('destaques = ?')))
  assert.ok(queries.every(([sql]) => !/DELETE FROM|DROP TABLE|INSERT.*servicos/i.test(sql)))
})
