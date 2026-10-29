// Verifica o mesmo lote público em base descartável; carga nunca aceita URL externa.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const assert = require('node:assert/strict')
const { Client } = require('pg')
const { performance } = require('node:perf_hooks')
const { buildPgBlock, sqlLiteral } = require('../scripts/demo-catalog-postgres.cjs')
const catalog = require('../scripts/fixtures/demo-catalog.cjs')
let fixture, client, pool, server, uploads
const report = { date: new Date().toISOString(), environment: 'PostgreSQL descartável em loopback, sem CDN ou frontend', checks: [], load: [] }
async function check(name, fn) { await fn(); report.checks.push({ name, result: 'aprovado' }); console.log('[DEMO]', name, 'APROVADO') }
async function main() {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) throw Error('Não executar contra produção.')
  process.env.TEST_DB_DRIVER = 'postgres'
  fixture = await require('./helpers/database-fixture.cjs').isolatedDatabase()
  for (const key of ['DATABASE_URL', 'POSTGRES_URL', 'POSTGRESQL_URL', 'MYSQL_URL', 'CLEARDB_DATABASE_URL', 'PGHOST', 'VERCEL', 'BLOB_READ_WRITE_TOKEN', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']) process.env[key] = ''
  uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'ehtech-demo-uploads-'))
  Object.assign(process.env, fixture.environment, { NODE_ENV: 'test', API_SEGREDO: crypto.randomBytes(32).toString('hex'), COMPAT_AI_PROVIDER: 'disabled', UPLOADS_DIR: uploads, SHIPPING_RULES_JSON: '[]' })
  require('nodemailer').createTransport = () => ({ sendMail: async () => { throw Error('Nenhum envio externo permitido no teste.') } })
  const app = require('../backend/index')
  pool = require('../backend/db')
  server = await app.startServer({ port: 0 })
  const origin = `http://127.0.0.1:${server.address().port}`
  client = new Client({ ...fixture.config, database: fixture.database }); await client.connect()
  const password = crypto.randomBytes(24).toString('hex'), hash = await require('../backend/passwords').hashPassword(password)
  const passwordHashes = Object.fromEntries(catalog.users.map(user => [user.username, hash]))
  const block = await buildPgBlock({ database: fixture.database, passwordHashes })
  const count = async () => (await client.query("SELECT (SELECT COUNT(*) FROM usuarios) AS users, (SELECT COUNT(*) FROM produtos) AS products, (SELECT COUNT(*) FROM servicos WHERE slug LIKE 'ehdemo-20261029-%') AS services")).rows[0]
  await check('Literais SQL preservam aspas, barras e delimitadores', async () => {
    const value = "d'água \\ pasta $ehdemo$ ; SELECT 1 --"
    assert.equal((await client.query(`SELECT ${sqlLiteral(value)} AS value`)).rows[0].value, value)
  })
  await check('Escala grande é recusada para o banco público', () => assert.rejects(buildPgBlock({ database: 'neondb', allowPublic: true, scale: 2 })))
  await check('Lote 10 contas, 20 produtos e 10 serviços com origens completas', async () => {
    await client.query(block.sql); const counts = await count()
    assert.deepEqual(counts, { users: '10', products: '20', services: '10' })
    assert.equal((await client.query("SELECT COUNT(*) AS n FROM produtos WHERE origem_snapshot IS NULL OR origem_cidade IS NULL OR status_aprovacao <> 'aprovado'")).rows[0].n, '0')
  })
  await check('Reexecução não duplica nem redefine conta ou dados existentes', async () => {
    await client.query("UPDATE usuarios SET senha = 'hash-sentinela-preservado' WHERE username = 'demo_20261029_10'")
    await client.query(block.sql)
    assert.deepEqual(await count(), { users: '10', products: '20', services: '10' })
    assert.equal((await client.query("SELECT senha FROM usuarios WHERE username = 'demo_20261029_10'")).rows[0].senha, 'hash-sentinela-preservado')
  })
  await check('Conflito em conta interrompe o lote sem inserções parciais', async () => {
    await client.query("UPDATE usuarios SET nome = 'sentinela de conflito' WHERE username = 'demo_20261029_10'")
    await assert.rejects(client.query(block.sql), /Conflito de identidade/)
    assert.deepEqual(await count(), { users: '10', products: '20', services: '10' })
    await client.query('UPDATE usuarios SET nome = $1 WHERE username = $2', [catalog.users[9].nome, catalog.users[9].username])
  })
  const statuses = {}
  async function request(method, route, { token, body, expected = 200 } = {}) {
    assert.equal(new URL(origin).hostname, '127.0.0.1')
    const response = await fetch(origin + route, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000) })
    statuses[response.status] = (statuses[response.status] || 0) + 1
    const data = await response.json(); assert.equal(response.status, expected, method + ' ' + route + ': ' + (data.mensagem || response.status))
    return data
  }
  async function measure(label, concurrency, samples) {
    let index = 0; const values = [], started = performance.now()
    await Promise.all(Array.from({ length: concurrency }, async () => {
      while (index < samples) {
        const current = index++, type = current % 2 ? 'services' : 'products', start = performance.now()
        const data = await request('GET', type === 'products' ? `/produtos/catalogo?limit=12&page=${current % 5 + 1}` : `/servicos?limit=9&page=${current % 3 + 1}`)
        assert.ok(data.items.length <= (type === 'products' ? 12 : 9)); values.push({ type, ms: performance.now() - start })
      }
    }))
    const elapsed = performance.now() - started
    for (const type of ['products', 'services']) {
      const times = values.filter(value => value.type === type).map(value => value.ms).sort((a, b) => a - b)
      report.load.push({ label, type, concurrency, samples: times.length, p50_ms: +times[Math.ceil(times.length * .5) - 1].toFixed(2), p95_ms: +times[Math.ceil(times.length * .95) - 1].toFixed(2), max_ms: +times.at(-1).toFixed(2), batch_seconds: +(elapsed / 1000).toFixed(2) })
    }
  }
  await check('Leituras de referência com 20 produtos e 10 serviços', () => measure('20 produtos / 10 serviços', 1, 20))
  let buyer, seller, product
  await check('Contas fictícias entram e anúncios reais de referência são consultáveis', async () => {
    buyer = await request('POST', '/login', { body: { email: catalog.users[1].email, senha: password } })
    seller = await request('POST', '/login', { body: { email: catalog.users[0].email, senha: password } })
    const list = await request('GET', '/produtos/catalogo?limit=24')
    product = list.items.find(item => item.nome === catalog.products[0].nome)
    assert.ok(product); assert.deepEqual(JSON.parse(product.imagem), catalog.products[0].imagem)
    const service = await request('GET', '/servicos/' + catalog.services[0].key)
    assert.equal(service.prestador, catalog.users[0].nome)
  })
  await check('Compra impede próprio produto e quantidade sem estoque', async () => {
    await request('POST', '/checkout', { token: seller.token, body: { itens: [{ produto_id: product.id_produto, quantidade: 1 }] }, expected: 400 })
    await request('POST', '/checkout', { token: buyer.token, body: { itens: [{ produto_id: product.id_produto, quantidade: 99 }] }, expected: 409 })
  })
  await check('Checkout registra pedido entre contas distintas, recalcula valor e não cobra', async () => {
    const checkout = await request('POST', '/checkout', { token: buyer.token, body: { itens: [{ produto_id: product.id_produto, quantidade: 1 }], total: .01 } })
    await request('POST', '/pedidos', { token: buyer.token, body: { checkout_id: checkout.id }, expected: 409 })
    const addresses = await request('GET', '/enderecos', { token: buyer.token }), address = addresses[0]
    await request('PUT', `/checkout/${checkout.id}/endereco`, { token: buyer.token, body: { endereco_id: address.id, versao: address.versao, confirmado: true } })
    const state = await request('GET', `/checkout/${checkout.id}`, { token: buyer.token })
    const groups = state.modalidades
    assert.ok(groups, 'Checkout deve apresentar grupos de entrega')
    await request('PUT', `/checkout/${checkout.id}/entrega`, { token: buyer.token, body: { modalidades: groups.map(group => ({ vendedor_id: group.vendedor_id, id: group.opcoes.find(option => option.tipo === 'a_combinar').id })) } })
    const payment = await request('POST', `/checkout/${checkout.id}/pagamento`, { token: buyer.token, body: {} })
    assert.equal(payment.disponivel, false)
    const order = await request('POST', '/pedidos', { token: buyer.token, body: { checkout_id: checkout.id, total: .01, status_pagamento: 'pago' }, expected: 201 })
    assert.equal(order.total, null); assert.equal(order.total_parcial, catalog.products[0].preco)
    assert.equal(order.frete_pendente, true); assert.equal(order.status_pagamento, 'nao_iniciado')
    const repeated = await request('POST', '/pedidos', { token: buyer.token, body: { checkout_id: checkout.id }, expected: 201 })
    assert.equal(repeated.id_pedido, order.id_pedido)
    const detail = await request('GET', `/pedidos/${order.id_pedido}`, { token: buyer.token })
    const group = detail.entregas[0], deliveryPath = `/pedidos/${order.id_pedido}/entregas/${encodeURIComponent(group.grupo_id)}`
    await request('PATCH', deliveryPath, { token: seller.token, body: { acao: 'propor', versao: 0, modalidade: 'retirada', valor_frete: 0, prazo: 'Retirada fictícia em até três dias úteis', observacoes: 'Simulação local, sem transporte ou pagamento real.' } })
    await request('PATCH', deliveryPath, { token: buyer.token, body: { acao: 'aceitar', versao: 1 } })
    await request('PATCH', deliveryPath, { token: seller.token, body: { acao: 'despachar', versao: 2 } })
    const receipt = await request('POST', deliveryPath + '/codigo', { token: buyer.token, body: { versao: 3 } })
    const concluded = await request('POST', deliveryPath + '/recebimento', { token: seller.token, body: { versao: 3, codigo: receipt.codigo } })
    assert.equal(concluded.status, 'concluido'); assert.equal(concluded.total, catalog.products[0].preco)
    assert.equal(concluded.status_pagamento, 'nao_iniciado')
    report.purchase = { result: 'pedido concluído por código de retirada', subtotal: order.total_parcial, finalTotal: concluded.total, payment: concluded.status_pagamento, duplicatePrevented: true, externalCharge: false }
  })
  await check('Serviço permite solicitação por outra conta e impede auto-contratação', async () => {
    const service = await request('GET', '/servicos/' + catalog.services[0].key)
    const body = { servico_id: service.id_servico, descricao_problema: 'Simulação isolada: preciso de um site institucional com páginas de contato e serviços.', modalidade: 'remoto', urgencia: 'normal', disponibilidade: 'Dias úteis no período da tarde', orcamento_max: 1500 }
    await request('POST', '/contratacoes', { token: seller.token, body, expected: 400 })
    assert.equal((await request('POST', '/contratacoes', { token: buyer.token, body, expected: 201 })).status, 'solicitado')
  })
  await check('Carga ampliada somente na base descartável: 1000 produtos / 500 serviços', async () => {
    const expanded = await buildPgBlock({ database: fixture.database, scale: 50, passwordHashes })
    await client.query(expanded.sql); assert.deepEqual(await count(), { users: '10', products: '1000', services: '500' })
    for (const concurrency of [1, 5, 10, 20]) await measure('1000 produtos / 500 serviços', concurrency, 40)
  })
  report.statuses = statuses
}
main().catch(error => { report.failure = error.message; console.error('[DEMO]', error.message); process.exitCode = 1 }).finally(async () => {
  try {
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
    if (client) await client.end(); if (pool) await pool.end(); if (fixture) await fixture.cleanup()
    if (uploads && path.dirname(uploads) === os.tmpdir() && path.basename(uploads).startsWith('ehtech-demo-uploads-')) fs.rmSync(uploads, { recursive: true, force: true })
  } finally { fs.mkdirSync('scratch/demo-catalog', { recursive: true }); fs.writeFileSync('scratch/demo-catalog/isolated-results.json', JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2)) }
})
