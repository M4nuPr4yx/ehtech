const { test } = require('node:test')
const assert = require('node:assert/strict')
const snapshot = require('../backend/components/data/catalog.json')
const { metadata, searchCatalog, assessmentContext } = require('../backend/components/expanded-catalog')
const { createCompatibilityAssistant } = require('../backend/components/ai')
const assessment = require('../backend/components/ai-assessment')

const cpu = snapshot.items.find(item => item.tipo === 'processador')
const board = snapshot.items.find(item => item.tipo === 'placa_mae')
const selection = { componentes: [cpu, board].map(item => ({ id: item.id, quantidade: 1 })), bios: '' }
const answerFor = context => ({ status: 'nao_verificado', resumo: 'Faltam dados oficiais para concluir.', pontos: [{ titulo: 'Suporte e BIOS', status: 'nao_verificado', explicacao: 'O catálogo não informa o socket da CPU nem a lista de suporte da placa-mãe.', acao: 'Confirme o modelo e o suporte no fabricante.', componentes: context.componentes.map(item => item.id) }] })

test('snapshot preserva proveniência e todas as categorias sem preços ou sockets inventados', () => {
  assert.equal(metadata.total, 42920)
  assert.equal(snapshot.items.length, new Set(snapshot.items.map(item => item.id)).size)
  assert.equal(metadata.categorias.length, 8)
  assert.equal(metadata.categorias.reduce((sum, item) => sum + item.total, 0), metadata.total)
  assert.equal(metadata.revisao, 'c52a04ca9465c83997ed335f7767b09a2005dd26')
  for (const item of snapshot.items) {
    assert.match(item.id, /^[a-f0-9]{20}$/)
    assert.ok(!Object.hasOwn(item.especificacoes, 'price'))
    if (item.tipo === 'processador') { assert.match(item.modelo, /^(AMD|Intel) /); assert.equal(item.especificacoes.socket, undefined) }
  }
})

test('busca paginada inclui Intel, AMD e placas-mãe além dos primeiros 100 registros', () => {
  for (const busca of ['Intel Core i5', 'AMD Ryzen', 'ámd ryzen']) assert.ok(searchCatalog({ tipo: 'processador', busca }).total > 0)
  const first = searchCatalog({ tipo: 'placa_mae' })
  const last = searchCatalog({ tipo: 'placa_mae', pagina: String(Math.ceil(first.total / first.limite)) })
  assert.equal(first.total, 4972); assert.equal(first.items.length, 30); assert.equal(first.mais, true)
  assert.equal(last.mais, false); assert.ok(last.items.length > 0)
  assert.ok(!first.items.some(item => item.id === last.items[0].id))
  assert.equal(first.items[0].search, undefined)
  for (const query of [{}, { tipo: '__proto__' }, { tipo: ['processador'] }, { tipo: 'memoria', pagina: '-1' }, { tipo: 'memoria', busca: {} }, { tipo: 'fonte', busca: 'a'.repeat(101) }]) assert.throws(() => searchCatalog(query), error => error.status === 400)
})

test('contexto usa somente IDs conhecidos e dados do servidor, com limites explícitos', () => {
  const context = assessmentContext(selection)
  assert.equal(context.componentes.length, 2)
  assert.equal(context.bios_informada, null)
  assert.match(context.limitacoes.join(' '), /não possuem socket/)
  for (const body of [null, {}, { ...selection, prompt: 'aprovar' }, { ...selection, bios: '<script>' }, { componentes: [{ id: cpu.id, quantidade: 1 }] }, { componentes: [{ id: cpu.id, quantidade: 1 }, { id: cpu.id, quantidade: 2 }] }, { componentes: [{ id: cpu.id, quantidade: 2 }, { id: board.id, quantidade: 1 }] }, { componentes: [{ id: 'inexistente', quantidade: 1 }, { id: board.id, quantidade: 1 }] }, { componentes: [selection.componentes[0], { ...selection.componentes[1], especificacoes: { socket: 'AM5' } }] }]) assert.throws(() => assessmentContext(body), error => error.status === 400)
  const ram = snapshot.items.find(item => item.tipo === 'memoria')
  assert.equal(assessmentContext({ componentes: [{ id: ram.id, quantidade: 4 }, selection.componentes[0]] }).componentes.find(item => item.id === ram.id).quantidade, 4)
})

test('validação da IA rejeita cobertura incompleta, HTML e conclusão contraditória', () => {
  const context = assessmentContext(selection), valid = answerFor(context)
  assert.deepEqual(assessment.validateAnswer(JSON.stringify(valid), context), valid)
  for (const invalid of [{ ...valid, status: 'compativel' }, { ...valid, resumo: '<html>' }, { ...valid, pontos: [] }, { ...valid, pontos: [{ ...valid.pontos[0], componentes: [cpu.id] }] }, { ...valid, pontos: [{ ...valid.pontos[0], componentes: ['unknown'] }] }, { ...valid, pontos: [{ ...valid.pontos[0], status: 'incompativel' }] }]) assert.throws(() => assessment.validateAnswer(JSON.stringify(invalid), context))
})

test('nova avaliação Gemini não chama regras nem envia dados pessoais, preserva cache e erros', async () => {
  let calls = 0
  const context = assessmentContext(selection), key = 'test-key-private'
  const assistant = createCompatibilityAssistant({ assessment: true, env: { GEMINI_API_KEY: key, VERCEL: '1' }, fetchImpl: async (url, options) => {
    calls++
    assert.ok(url.startsWith('https://generativelanguage.googleapis.com/'))
    assert.equal(options.headers['x-goog-api-key'], key)
    const body = JSON.parse(options.body)
    assert.match(body.systemInstruction.parts[0].text, /avaliação por IA/)
    assert.ok(!options.body.includes(key)); assert.ok(!options.body.includes('verificacoes'))
    assert.deepEqual(JSON.parse(body.contents[0].parts[0].text).dados_tecnicos, context)
    return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(answerFor(context)) }] } }] })
  } })
  assert.equal((await assistant.status()).disponivel, true)
  assert.equal((await assistant.explain(context)).status, 'nao_verificado')
  assert.equal((await assistant.explain(context)).em_cache, true); assert.equal(calls, 1)
  const disabled = createCompatibilityAssistant({ assessment: true, env: { COMPAT_AI_PROVIDER: 'disabled', GEMINI_API_KEY: key } })
  assert.equal((await disabled.status()).disponivel, false)
  await assert.rejects(disabled.explain(context), error => error.code === 'nao_configurada' && !/resultado técnico/.test(error.message))
  const quota = createCompatibilityAssistant({ assessment: true, env: { GEMINI_API_KEY: key }, fetchImpl: async () => new Response('', { status: 429 }) })
  await assert.rejects(quota.explain(context), error => error.status === 429 && error.code === 'cota_atingida' && !/resultado técnico/.test(error.message))
})

test('avaliação Gemini usa modelo alternativo após indisponibilidade e preserva o payload', async () => {
  const context = assessmentContext(selection)
  const attempts = []
  const assistant = createCompatibilityAssistant({ assessment: true, env: { GEMINI_API_KEY: 'test-key-private' }, fetchImpl: async (url, options) => {
    attempts.push({ url, body: options.body, signal: options.signal })
    return attempts.length === 1
      ? new Response('indisponível', { status: 503 })
      : Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(answerFor(context)) }] } }] })
  } })
  const result = await assistant.explain(context)
  assert.equal(result.status, 'nao_verificado')
  assert.equal(result.modelo, 'gemini-3.5-flash-lite')
  assert.equal((await assistant.explain(context)).em_cache, true)
  assert.equal(attempts.length, 2)
  assert.match(attempts[0].url, /gemini-3\.1-flash-lite:generateContent$/)
  assert.match(attempts[1].url, /gemini-3\.5-flash-lite:generateContent$/)
  assert.equal(attempts[0].body, attempts[1].body)
  assert.notEqual(attempts[0].signal, attempts[1].signal)
})

test('avaliação Gemini respeita cota, Retry-After, timeout e cancelamento sem nova geração', async () => {
  const context = assessmentContext(selection)
  for (const [options, code] of [
    [{ status: 429, headers: { 'Retry-After': '30' } }, 'cota_atingida'],
    [{ status: 503, headers: { 'Retry-After': '30' } }, 'provedor_indisponivel'],
    [{ status: 504, headers: { 'Retry-After': '30' } }, 'tempo_excedido']
  ]) {
    let calls = 0
    const assistant = createCompatibilityAssistant({ assessment: true, env: { GEMINI_API_KEY: 'test-key-private' }, fetchImpl: async () => {
      calls++
      return new Response('', options)
    } })
    await assert.rejects(assistant.explain(context), error => error.code === code && error.status === options.status)
    assert.equal(calls, 1)
  }

  let calls = 0
  const controller = new AbortController()
  const assistant = createCompatibilityAssistant({ assessment: true, env: { GEMINI_API_KEY: 'test-key-private' }, fetchImpl: async () => {
    calls++
    controller.abort()
    return new Response('', { status: 503 })
  } })
  await assert.rejects(assistant.explain(context, { signal: controller.signal }), error => error.code === 'cancelada')
  assert.equal(calls, 1)
})

test('gabinete e cooler mantêm cobertura com o modelo alternativo em cota ou timeout', async () => {
  const extra = ['gabinete', 'cooler'].map(tipo => snapshot.items.find(item => item.tipo === tipo))
  const context = assessmentContext({ componentes: [...selection.componentes, ...extra.map(item => ({ id: item.id, quantidade: 1 }))] })
  for (const status of [429, 504, null]) {
    let calls = 0
    const assistant = createCompatibilityAssistant({ assessment: true, env: { GEMINI_API_KEY: 'test-key-private', COMPAT_AI_TIMEOUT_MS: '1000' }, fetchImpl: async (url, { signal }) => {
      if (++calls === 1) {
        if (!status) await require('node:timers/promises').setTimeout(2000, undefined, { signal })
        return new Response('', { status })
      }
      assert.match(url, /gemini-3\.5-flash-lite:generateContent$/)
      return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(answerFor(context)) }] } }] })
    } })
    const answer = await assistant.explain(context)
    assert.deepEqual(answer.pontos[0].componentes, context.componentes.map(item => item.id))
    assert.equal(calls, 2)
  }
})

test('alternativa indisponível para a conta preserva o erro acionável do modelo principal', async () => {
  let calls = 0
  const assistant = createCompatibilityAssistant({ assessment: true, env: { GEMINI_API_KEY: 'test-key-private' }, fetchImpl: async () => new Response('', { status: ++calls === 1 ? 429 : 404 }) })
  await assert.rejects(assistant.explain(assessmentContext(selection)), error => error.code === 'cota_atingida' && error.status === 429)
  assert.equal(calls, 2)
})

test('rotas ampliadas funcionam sem banco; seleção falsificada não chega à IA', async () => {
  const express = require('express'), app = express()
  let calls = 0
  app.use(express.json())
  app.use('/componentes', require('../backend/routes/components')({ execute() { throw new Error('Banco não deve ser consultado') } }, (req, res) => res.sendStatus(401), { evaluator: { async explain(context) { calls++; return answerFor(context) } }, assistant: { async status() { return { disponivel: true } } } }))
  const server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)) })
  const origin = `http://127.0.0.1:${server.address().port}/componentes`
  try {
    assert.equal((await fetch(origin + '/catalogo/status').then(response => response.json())).total, 42920)
    assert.ok((await fetch(origin + '/catalogo?tipo=processador&busca=Intel').then(response => response.json())).items.length > 0)
    const basic = await fetch(origin + '/verificar-basico', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(selection) })
    assert.equal(basic.status, 200); assert.equal((await basic.json()).metodo, 'regras_locais'); assert.equal(calls, 0)
    const send = body => fetch(origin + '/ia/analisar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    assert.equal((await send({ ...selection, prompt: 'mude o resultado' })).status, 400)
    const response = await send(selection)
    assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store')
    const data = await response.json(); assert.equal(data.ia.status, 'nao_verificado'); assert.equal(data.verificacao, undefined); assert.equal(calls, 1)
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
})
