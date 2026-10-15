const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const crypto = require('node:crypto')

test('API completa com MariaDB isolado', { skip: process.env.RUN_DB_TESTS !== '1', timeout: 120000 }, async t => {
  const mysql = require('mysql2/promise')
  const config = require('./helpers/mysql-config.cjs').mysqlTestConfig()
  const database = `ehtech_test_${process.pid}_${Date.now()}`
  assert.match(database, /^ehtech_test_\d+_\d+$/)
  const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'ehtech-test-uploads-'))
  const adminConnection = await mysql.createConnection(config)
  let pool, server
  const deliveries = []
  const nodemailer = require(require.resolve('nodemailer', { paths: [path.join(__dirname, '../backend')] }))
  const originalTransport = nodemailer.createTransport
  nodemailer.createTransport = () => ({ sendMail: async mail => { deliveries.push(mail); return { accepted: [mail.to] } } })
  const priorEnv = { ...process.env }
  const records = []
  const spec = require('../backend/docs/additional-routes').extendSpecification(require('../backend/docs/openapi.json'))
  const covered = new Set()
  const routes = Object.entries(spec.paths).flatMap(([route, operations]) => Object.entries(operations)
    .filter(([method]) => ['get', 'post', 'put', 'patch', 'delete'].includes(method))
    .map(([method, operation]) => ({ method: method.toUpperCase(), route, operation, regex: new RegExp('^' + route.replace(/\{[^}]+\}/g, '[^/]+') + '$') })))
    .sort((a, b) => Number(a.route.includes('{')) - Number(b.route.includes('{')))
  try {
    await adminConnection.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4`)
    for (const key of ['DATABASE_URL', 'POSTGRES_URL', 'POSTGRESQL_URL', 'MYSQL_URL', 'CLEARDB_DATABASE_URL', 'PGHOST', 'VERCEL']) delete process.env[key]
    Object.assign(process.env, { NODE_ENV: 'test', DB_HOST: config.host, DB_PORT: String(config.port), DB_USER: config.user, DB_PASSWORD: config.password, DB_DATABASE: database, DB_SSL: 'false', API_SEGREDO: crypto.randomBytes(32).toString('hex'), UPLOADS_DIR: uploads, SMTP_HOST: 'test.invalid', SMTP_USER: 'test@example.invalid', FRONTEND_URL: 'http://localhost:3001' })
    process.env.COMPAT_AI_PROVIDER = 'disabled'
    const app = require('../backend/index')
    pool = require('../backend/db')
    await t.test('importação não abre porta; inicialização migra bancos antigos', async () => {
      // Reproduz o schema antigo distribuído no repositório.
      await pool.execute(`CREATE TABLE produtos (id_produto INT AUTO_INCREMENT PRIMARY KEY, nome VARCHAR(255), descricao TEXT, preco DECIMAL(10,2), estoque INT, categoria VARCHAR(60), imagem TEXT, vendedor VARCHAR(255), vendedor_id INT, data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`)
      server = await app.startServer({ port: 0 })
      assert.equal(await app.startServer({ port: 0 }), server)
      const [columns] = await pool.query('SHOW COLUMNS FROM produtos')
      assert.ok(columns.some(column => column.Field === 'status_aprovacao'))
      assert.ok(columns.some(column => column.Field === 'componente_id'))
    })
    assert.ok(server?.listening, 'Servidor de teste deve iniciar')
    const origin = `http://127.0.0.1:${server.address().port}`
    async function request(method, route, { body, token, expected = 200, raw, form, headers = {} } = {}) {
      const response = await fetch(origin + route, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body !== undefined || raw !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers }, body: form || raw || (body === undefined ? undefined : JSON.stringify(body)), signal: AbortSignal.timeout(10000) })
      const contentType = response.headers.get('content-type') || ''
      const data = contentType.includes('application/json') ? await response.json() : await response.text()
      const pathname = new URL(origin + route).pathname.replace(/^\/api(?=\/|$)/, '') || '/'
      const matched = routes.find(item => item.method === method && item.regex.test(pathname))
      if (matched) covered.add(`${method} ${matched.route}`)
      records.push({ method, route: matched?.route || pathname, status: response.status, expected })
      assert.equal(response.status, expected, `${method} ${route}: ${typeof data === 'object' ? data.mensagem || data.erro || data.error || '' : data.slice(0, 100)}`)
      return data
    }

    await t.test('todas as rotas protegidas negam acesso anônimo, com e sem /api', async () => {
      for (const { method, route, operation } of routes) {
        if (!operation.security?.length) continue
        const target = route.replace(/\{[^}]+\}/g, '999999')
        for (const prefix of ['', '/api']) await request(method, prefix + target, { expected: 401, ...(method === 'GET' ? {} : { body: {} }) })
      }
    })
    await t.test('saúde, prefixo /api e documentação pública', async () => {
      assert.equal((await request('GET', '/')).status, 'online')
      assert.equal((await request('GET', '/health')).banco, 'conectado')
      assert.equal((await request('GET', '/api/health')).status, 'ok')
      for (const prefix of ['', '/api']) {
        assert.match(await request('GET', `${prefix}/docs`), /swagger-ui/)
        const document = await request('GET', `${prefix}/docs/openapi.json`)
        assert.equal(new URL(document.servers[0].url, origin + `${prefix}/docs/openapi.json`).pathname.replace(/\/$/, ''), prefix)
        await request('GET', `${prefix}/docs/init.js`)
        await request('GET', `${prefix}/docs/swagger-ui.css`)
        await request('GET', `${prefix}/docs/swagger-ui-bundle.js`)
      }
    })

    const password = 'TestOnly-Password-2026'
    const users = {}
    await t.test('cadastro, login, duplicidades e administração', async () => {
      for (const name of ['admin', 'seller', 'buyer', 'other']) {
        const email = `${name}.ehtech.test@gmail.com`
        await request('POST', '/cadastro', { body: { username: `test_${name}`, email, senha: password, confirmarSenha: password }, expected: 201 })
        if (name === 'admin') await pool.execute("UPDATE usuarios SET role = 'admin' WHERE email = ?", [email])
        const session = await request('POST', '/login', { body: { email, senha: password } })
        users[name] = { id: session.userId, token: session.token, email }
      }
      await request('POST', '/cadastro', { body: { username: 'test_buyer', email: 'unique.test@gmail.com', senha: password, confirmarSenha: password }, expected: 409 })
      await request('POST', '/login', { body: { email: users.buyer.email, senha: 'incorrect' }, expected: 401 })
      await request('POST', '/admin/login', { body: { email: users.buyer.email, senha: password }, expected: 401 })
      assert.ok((await request('POST', '/admin/login', { body: { email: users.admin.email, senha: password } })).token)
      await request('GET', '/admin/users', { token: users.buyer.token, expected: 403 })
      assert.equal((await request('GET', '/admin/sessao', { token: users.admin.token })).role, 'admin')
      assert.equal((await request('GET', '/admin/users', { token: users.admin.token })).length, 4)
      await request('PUT', `/admin/users/${users.admin.id}`, { token: users.admin.token, body: { email: users.admin.email, role: 'user' }, expected: 400 })
      await request('DELETE', `/admin/users/${users.admin.id}`, { token: users.admin.token, expected: 400 })
      await request('PUT', `/admin/users/${users.other.id}`, { token: users.admin.token, body: { email: users.buyer.email, role: 'user' }, expected: 409 })
      await request('PUT', `/admin/users/${users.other.id}`, { token: users.admin.token, body: { email: users.other.email, role: 'user' } })
      for (const method of ['PUT', 'DELETE']) await request(method, '/admin/users/999999', { token: users.admin.token, body: { email: 'missing@gmail.com', role: 'user' }, expected: 404 })
      await request('PUT', '/admin/users/999999/senha', { token: users.admin.token, body: { novaSenha: password }, expected: 404 })
      await request('PUT', `/admin/users/${users.other.id}/senha`, { token: users.admin.token, body: { novaSenha: password } })
    })

    let components
    await t.test('catálogo, análise, revisão administrativa e desativação de modelos', async () => {
      components = (await request('GET', '/componentes')).items
      assert.equal(components.length, 6)
      const model = slug => components.find(item => item.slug === slug)
      const selection = { processador_id: model('amd-ryzen-5-5600').id, placa_mae_id: model('asus-prime-b550m-a').id, memorias: [{ componente_id: model('kingston-kf432c16bbk2-16').id, quantidade: 1 }], bios: '2423' }
      assert.equal((await request('GET', '/api/componentes?tipo=memoria&busca=kingston')).items.length, 2)
      assert.equal((await request('GET', '/componentes/admin', { token: users.admin.token })).length, 6)
      await request('GET', '/componentes/admin', { token: users.buyer.token, expected: 403 })
      assert.equal((await request('POST', '/componentes/verificar', { body: selection })).status, 'compativel')
      assert.equal((await request('GET', '/componentes/ia/status')).disponivel, false)
      await request('POST', '/componentes/ia/explicar', { body: selection, expected: 503 })
      await request('POST', '/componentes/ia/explicar', { body: { ...selection, status: 'compativel' }, expected: 400 })
      await request('POST', '/componentes/verificar', { body: { ...selection, processador_id: selection.placa_mae_id }, expected: 400 })
      await request('POST', '/componentes/verificar', { body: { ...selection, bios: 'not-a-bios' }, expected: 400 })
      const draft = { ...model('amd-ryzen-5-5600'), slug: 'test-only-cpu', modelo: 'CPU de teste', status: 'rascunho' }
      const { id } = await request('POST', '/componentes/admin', { token: users.admin.token, body: draft, expected: 201 })
      const unknown = await request('POST', '/componentes/verificar', { body: { ...selection, processador_id: id } })
      assert.equal(unknown.status, 'nao_verificado')
      assert.ok(!unknown.componentes.some(item => item.id === id))
      const published = { ...draft, status: 'verificado', revisao: 1 }
      await request('PUT', `/componentes/admin/${id}`, { token: users.admin.token, body: published })
      await request('PUT', `/componentes/admin/${id}`, { token: users.admin.token, body: published, expected: 409 })
      assert.ok((await request('GET', '/componentes?busca=CPU%20de%20teste')).items.some(item => item.id === id && item.revisao === 2))
      await request('PUT', `/componentes/admin/${id}`, { token: users.admin.token, body: { ...published, ativo: false, revisao: 2 } })
      assert.equal((await request('POST', '/componentes/verificar', { body: { ...selection, processador_id: id } })).status, 'nao_verificado')
    })

    let productId
    const product = { nome: 'Notebook de teste', descricao: 'Produto criado apenas para testes automáticos.', preco: 1234.56, estoque: 5, categoria: 'notebooks', imagem: '', componente_id: components.find(item => item.tipo === 'processador').id }
    await t.test('produto: criar, aprovar, filtrar, editar parcialmente e proteger contra outro usuário', async () => {
      productId = (await request('POST', '/produtos', { token: users.seller.token, body: product, expected: 201 })).id
      assert.ok(productId)
      assert.equal((await request('GET', '/produtos')).length, 0)
      assert.equal((await request('GET', '/produtos/meus', { token: users.seller.token })).length, 1)
      assert.equal((await request('GET', '/admin/produtos', { token: users.admin.token })).length, 1)
      await request('PUT', `/admin/produtos/${productId}/aprovacao`, { token: users.admin.token, body: { status: 'aprovado' } })
      assert.equal((await request('GET', '/produtos')).length, 1)
      const catalog = await request('GET', '/produtos/catalogo?search=Notebook&categoria=notebooks&precoMin=100&precoMax=2000&ordenacao=menor-preco')
      assert.equal(catalog.total, 1)
      assert.equal(Number(catalog.items[0].preco), product.preco)
      assert.equal(catalog.items[0].componente_id, product.componente_id)
      await request('GET', '/produtos/catalogo?precoMin=2000&precoMax=100', { expected: 400 })
      await request('PUT', `/produtos/${productId}`, { token: users.seller.token, body: { nome: 'Notebook atualizado' } })
      const updated = await request('GET', `/produtos/${productId}`)
      assert.equal(updated.nome, 'Notebook atualizado')
      assert.equal(updated.descricao, product.descricao)
      assert.equal(Number(updated.preco), product.preco)
      assert.equal(updated.componente_id, product.componente_id, 'Edição parcial preserva referência técnica')
      await request('PUT', `/produtos/${productId}`, { token: users.seller.token, body: { componente_id: 999999 }, expected: 400 })
      await request('PUT', `/produtos/${productId}`, { token: users.seller.token, body: { componente_id: null } })
      const [pending] = await pool.execute('SELECT status_aprovacao, componente_id FROM produtos WHERE id_produto = ?', [productId])
      assert.equal(pending[0].componente_id, null)
      assert.equal(pending[0].status_aprovacao, 'pendente')
      await request('PUT', `/admin/produtos/${productId}/aprovacao`, { token: users.admin.token, body: { status: 'aprovado' } })
      await request('PUT', `/produtos/${productId}`, { token: users.buyer.token, body: product, expected: 403 })
      await request('DELETE', `/produtos/${productId}`, { token: users.buyer.token, expected: 403 })
      await request('GET', '/produtos/999999', { expected: 404 })
    })
    await t.test('entradas inválidas recebem 400, sem erro interno ou arredondamento silencioso', async () => {
      for (const value of ['Infinity', '12abc', -1, 0, {}, null]) await request('POST', '/produtos', { token: users.seller.token, body: { ...product, preco: value }, expected: 400 })
      for (const estoque of [1.5, '2abc', -1]) await request('PUT', `/produtos/${productId}`, { token: users.seller.token, body: { estoque }, expected: 400 })
      for (const id of ['1abc', '-1', '0', '1.5']) await request('GET', `/produtos/${id}`, { expected: 400 })
      await request('POST', '/produtos', { token: users.seller.token, raw: '{broken', expected: 400 })
      await request('POST', '/produtos', { token: users.seller.token, body: [], expected: 400 })
      await request('POST', '/pedidos', { token: users.buyer.token, body: { itens: [null] }, expected: 400 })
      await request('POST', '/pedidos', { token: users.buyer.token, body: { itens: [{ produto_id: productId, quantidade: 1.5 }] }, expected: 400 })
      await request('PUT', `/admin/users/${users.other.id}`, { token: users.admin.token, body: { email: [], role: 'user' }, expected: 400 })
      await request('PUT', '/perfil/senha', { token: users.buyer.token, body: { senhaAtual: {}, novaSenha: password }, expected: 400 })
      await request('POST', '/esqueci-senha', { body: { email: [users.buyer.email] }, expected: 400 })
    })
    await t.test('avaliações de produtos e reputação do vendedor', async () => {
      await request('POST', '/avaliacoes', { token: users.seller.token, body: { produtoId: productId, nota: 5 }, expected: 400 })
      await request('POST', '/avaliacoes', { token: users.buyer.token, body: { produtoId: productId, nota: 4.5 }, expected: 400 })
      await request('POST', '/avaliacoes', { token: users.buyer.token, body: { produtoId: productId, nota: 5, comentario: 'Avaliação de teste' } })
      await request('POST', '/avaliacoes', { token: users.buyer.token, body: { produtoId: productId, nota: 4, comentario: 'Avaliação atualizada' } })
      assert.equal((await request('GET', `/avaliacoes/produto/${productId}`)).total, 1)
      assert.equal(Number((await request('GET', `/avaliacoes/usuario/${users.seller.id}`)).media), 4)
    })
    await t.test('pedidos: registro, valores do servidor, histórico privado e estoque', async () => {
      const body = { itens: [{ produto_id: productId, quantidade: 2 }], total: 0.01 }
      const order = await request('POST', '/pedidos', { token: users.buyer.token, body, expected: 201 })
      assert.equal(order.total, 2469.12)
      const history = await request('GET', '/pedidos', { token: users.buyer.token })
      assert.equal(history[0].itens[0].quantidade, 2)
      assert.equal((await request('GET', '/pedidos', { token: users.other.token })).length, 0)
      await request('POST', '/pedidos', { token: users.buyer.token, body: { itens: [{ produto_id: productId, quantidade: 99 }] }, expected: 409 })
      await request('POST', '/pedidos', { token: users.seller.token, body, expected: 400 })
    })
    await t.test('chat, conversas, leitura e notificações', async () => {
      await request('POST', '/mensagens', { token: users.buyer.token, body: { destinatarioId: users.seller.id, produtoId: productId, conteudo: 'Mensagem automática de teste local.' }, expected: 201 })
      assert.equal((await request('GET', '/mensagens/conversas', { token: users.seller.token })).length, 1)
      assert.equal((await request('GET', '/mensagens/nao-lidas/total', { token: users.seller.token })).totalNaoLidas, 1)
      assert.equal((await request('GET', `/mensagens/${users.buyer.id}`, { token: users.seller.token })).mensagens.length, 1)
      await request('PUT', `/mensagens/${users.buyer.id}/lidas`, { token: users.seller.token, body: {} })
      assert.equal((await request('GET', '/mensagens/nao-lidas/total', { token: users.seller.token })).totalNaoLidas, 0)
      const notifications = await request('GET', '/notificacoes', { token: users.seller.token })
      assert.ok(notifications.length)
      await request('PUT', `/notificacoes/${notifications[0].id}/lida`, { token: users.seller.token, body: {} })
      await request('PUT', '/notificacoes/lidas', { token: users.seller.token, body: {} })
      assert.ok((await request('GET', '/notificacoes', { token: users.seller.token })).every(item => item.lida))
    })

    let serviceId
    await t.test('serviços: catálogo, filtros, detalhes, inexistentes e parâmetros inesperados', async () => {
      await pool.execute("INSERT INTO servicos (slug,titulo,descricao,categoria,preco_base,tipo_preco,prazo,modalidade,regiao,destaques,prestador_id) VALUES ('suporte-teste','Suporte de teste','Atendimento técnico de teste','suporte',100,'fixo','1 dia','remoto','Brasil','[]',?)", [users.seller.id])
      const catalog = await request('GET', '/servicos?search=teste&categoria=suporte&modalidade=remoto&ordenacao=menor-preco')
      assert.equal(catalog.total, 1)
      serviceId = catalog.items[0].id_servico
      assert.equal((await request('GET', '/servicos/suporte-teste')).id_servico, serviceId)
      await request('GET', '/servicos/inexistente', { expected: 404 })
      await request('GET', '/servicos?ordenacao=constructor')
      await request('GET', '/servicos?ordenacao=__proto__')
    })
    await t.test('contratação completa: solicitação, orçamento, aceite, execução, garantia e avaliação', async () => {
      const body = { servico_id: serviceId, descricao_problema: 'Preciso de suporte técnico para um computador de teste.', modalidade: 'remoto', urgencia: 'normal', orcamento_max: 200, disponibilidade: 'Durante a tarde' }
      const contract = await request('POST', '/contratacoes', { token: users.buyer.token, body, expected: 201 })
      assert.ok(contract.id)
      await request('POST', '/contratacoes', { token: users.buyer.token, body, expected: 409 })
      assert.equal((await request('GET', '/contratacoes', { token: users.buyer.token }))[0].papel, 'cliente')
      assert.equal((await request('GET', '/contratacoes', { token: users.seller.token }))[0].papel, 'prestador')
      assert.equal((await request('GET', '/contratacoes', { token: users.other.token })).length, 0)
      const quote = { valor_proposto: 150, escopo_proposto: 'Diagnosticar e corrigir o problema relatado pelo cliente.', prazo_proposto: '1 dia', garantia_dias: 30 }
      await request('PATCH', `/contratacoes/${contract.id}/orcamento`, { token: users.buyer.token, body: quote, expected: 403 })
      await request('PATCH', `/contratacoes/${contract.id}/orcamento`, { token: users.seller.token, body: quote })
      await request('PATCH', `/contratacoes/${contract.id}/status`, { token: users.other.token, body: { status: 'aceito' }, expected: 403 })
      await request('PATCH', `/contratacoes/${contract.id}/status`, { token: users.buyer.token, body: { status: 'concluido' }, expected: 409 })
      await request('PATCH', `/contratacoes/${contract.id}/status`, { token: users.buyer.token, body: { status: 'aceito' } })
      await request('PATCH', `/contratacoes/${contract.id}/status`, { token: users.seller.token, body: { status: 'em_execucao' } })
      const completed = await request('PATCH', `/contratacoes/${contract.id}/status`, { token: users.seller.token, body: { status: 'concluido' } })
      assert.match(completed.garantia_codigo, /^EHT-/)
      await request('POST', `/contratacoes/${contract.id}/avaliacao`, { token: users.buyer.token, body: { nota: 5, comentario: 'Atendimento de teste concluído.' }, expected: 201 })
      await request('POST', `/contratacoes/${contract.id}/avaliacao`, { token: users.buyer.token, body: { nota: 5 }, expected: 409 })
      const reputation = await request('GET', `/servicos/reputacao/prestador/${users.seller.id}`)
      assert.equal(reputation.total, 1)
      assert.equal(reputation.media, 5)
    })

    await t.test('passaporte: privacidade, histórico, serviço, convites e transferência atômica', async () => {
      const owner = users.buyer.token
      const recipient = users.other.token
      const cpuId = components.find(item => item.slug === 'amd-ryzen-5-5600').id
      const equipment = { nome: 'PC de teste', tipo: 'Computador', modelo: 'Montagem própria', componentes: [{ tipo: 'Memória', modelo: 'DDR4 16 GB' }, { componente_id: cpuId }] }
      await request('GET', '/passaportes', { expected: 401 })
      await request('POST', '/passaportes', { token: owner, body: { ...equipment, componentes: [{}] }, expected: 400 })
      await request('POST', '/passaportes', { token: owner, body: { ...equipment, componentes: [{ componente_id: 999999 }] }, expected: 400 })
      const { id } = await request('POST', '/passaportes', { token: owner, body: equipment, expected: 201 })
      assert.ok((await request('GET', '/passaportes', { token: owner })).some(item => item.id === id))
      assert.equal((await request('GET', '/passaportes', { token: recipient })).length, 0)
      for (const method of ['GET', 'PUT', 'DELETE']) await request(method, `/passaportes/${id}`, { token: recipient, ...(method === 'PUT' ? { body: equipment } : {}), expected: 404 })
      await request('PUT', `/passaportes/${id}`, { token: owner, body: { ...equipment, modelo: 'Modelo atualizado' } })
      await request('POST', `/passaportes/${id}/registros`, { token: owner, body: { tipo: 'upgrade', titulo: 'Memória ampliada para 16 GB', data: '2026-02-01' }, expected: 201 })
      for (const data of ['2026-02-30', '2099-01-01']) await request('POST', `/passaportes/${id}/registros`, { token: owner, body: { tipo: 'reparo', titulo: 'Data inválida de manutenção', data }, expected: 400 })
      const [completed] = await pool.execute("SELECT id_contratacao FROM contratacoes_servico WHERE cliente_id = ? AND status = 'concluido'", [users.buyer.id])
      const service = { contratacao_id: completed[0].id_contratacao }
      await request('POST', `/passaportes/${id}/servicos`, { token: recipient, body: service, expected: 404 })
      await request('POST', `/passaportes/${id}/servicos`, { token: owner, body: service, expected: 201 })
      await request('POST', `/passaportes/${id}/servicos`, { token: owner, body: service, expected: 409 })
      const detail = await request('GET', `/passaportes/${id}`, { token: owner })
      assert.equal(detail.publico_codigo, null)
      assert.equal(detail.componentes[1].componente_id, cpuId)
      assert.equal(detail.componentes[1].modelo, 'AMD Ryzen 5 5600', 'Nome técnico é normalizado no backend')
      assert.equal(detail.registros.length, 3)
      assert.ok(detail.registros.some(item => item.origem === 'ehtech' && item.garantia_fim_em))
      const first = await request('POST', `/passaportes/${id}/compartilhamento`, { token: owner })
      const visible = await request('GET', `/passaportes/publico/${first.codigo}`)
      for (const key of ['proprietario_id', 'email', 'transferencia_hash', 'publico_codigo', 'destinatario_id']) assert.ok(!(key in visible), key)
      assert.ok(visible.registros.every(item => !('contratacao_id' in item)))
      await request('DELETE', `/passaportes/${id}/compartilhamento`, { token: owner })
      await request('GET', `/passaportes/publico/${first.codigo}`, { expected: 404 })
      await request('POST', `/passaportes/${id}/transferencia`, { token: owner, body: { username: 'test_buyer' }, expected: 400 })
      const invite = await request('POST', `/passaportes/${id}/transferencia`, { token: owner, body: { username: 'test_other' } })
      const [stored] = await pool.execute('SELECT transferencia_hash FROM passaportes WHERE id = ?', [id])
      assert.notEqual(stored[0].transferencia_hash, invite.codigo)
      await request('POST', '/passaportes/receber', { token: users.seller.token, body: { codigo: invite.codigo }, expected: 404 })
      await request('DELETE', `/passaportes/${id}/transferencia`, { token: owner })
      await request('POST', '/passaportes/receber', { token: recipient, body: { codigo: invite.codigo }, expected: 404 })
      const expired = await request('POST', `/passaportes/${id}/transferencia`, { token: owner, body: { username: 'test_other' } })
      await pool.execute("UPDATE passaportes SET transferencia_expira_em = '2000-01-01 00:00:00' WHERE id = ?", [id])
      await request('POST', '/passaportes/receber', { token: recipient, body: { codigo: expired.codigo }, expected: 404 })
      const replacement = await request('POST', `/passaportes/${id}/transferencia`, { token: owner, body: { username: 'test_other' } })
      const publicLink = await request('POST', `/passaportes/${id}/compartilhamento`, { token: owner })
      const responses = await Promise.all([1, 2].map(() => fetch(origin + '/passaportes/receber', { method: 'POST', headers: { Authorization: `Bearer ${recipient}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo: replacement.codigo }) })))
      assert.deepEqual(responses.map(item => item.status).sort(), [200, 404])
      await request('GET', `/passaportes/publico/${publicLink.codigo}`, { expected: 404 })
      await request('GET', `/passaportes/${id}`, { token: owner, expected: 404 })
      await request('POST', `/passaportes/${id}/registros`, { token: owner, body: { tipo: 'reparo', titulo: 'Acesso anterior revogado', data: '2026-02-01' }, expected: 404 })
      const received = await request('GET', `/passaportes/${id}`, { token: recipient })
      assert.equal(received.registros.filter(item => item.tipo === 'transferencia').length, 1)
      assert.equal(received.componentes[0].modelo, 'DDR4 16 GB')
      assert.equal(received.transferencia_expira_em, null)
      await request('DELETE', `/passaportes/${id}`, { token: recipient })
      const [records] = await pool.execute('SELECT id FROM passaporte_registros WHERE passaporte_id = ?', [id])
      assert.equal(records.length, 0)
    })

    await t.test('uploads: imagem, múltiplas, base64, URL, conteúdo inválido e propriedade', async () => {
      const png = fs.readFileSync(path.join(__dirname, '../public/ehtech-logo.png'))
      const makeForm = (field, count = 1) => { const form = new FormData(); for (let i = 0; i < count; i++) form.append(field, new Blob([png], { type: 'image/png' }), `test-${i}.png`); return form }
      const single = await request('POST', '/upload/imagem', { token: users.seller.token, form: makeForm('imagem') })
      await request('GET', single.url)
      assert.equal((await request('POST', '/upload/imagens', { token: users.seller.token, form: makeForm('imagens', 2) })).total, 2)
      await request('POST', '/upload/imagem-base64', { token: users.seller.token, body: { imagem: `data:image/png;base64,${png.toString('base64')}` } })
      await request('POST', '/upload/imagem-base64', { token: users.seller.token, body: { imagem: 'data:image/png;base64,aHRtbA==' }, expected: 400 })
      const invalid = new FormData(); invalid.append('imagem', new Blob(['<script>invalid</script>'], { type: 'image/png' }), 'fake.png')
      await request('POST', '/upload/imagem', { token: users.seller.token, form: invalid, expected: 400 })
      await request('POST', '/upload/imagem-url', { token: users.seller.token, body: { url: 'https://example.com/test.png' } })
      await request('POST', '/upload/imagem-url', { token: users.seller.token, body: { url: 'javascript:alert(1)' }, expected: 400 })
      await request('DELETE', `/upload/imagem/${single.filename}`, { token: users.other.token, expected: 403 })
      assert.ok(fs.existsSync(path.join(uploads, single.filename)))
      await request('DELETE', `/upload/imagem/${single.filename}`, { token: users.seller.token })
      await request('DELETE', `/upload/imagem/${single.filename}`, { token: users.seller.token, expected: 404 })
      await request('PUT', '/perfil/foto', { token: users.buyer.token, form: makeForm('foto') })
    })
    await t.test('perfil privado/público, alteração de senha e e-mail', async () => {
      await request('PUT', '/perfil', { token: users.buyer.token, body: { nome: 'Cliente de teste' } })
      assert.equal((await request('GET', '/perfil', { token: users.buyer.token })).nome, 'Cliente de teste')
      const publicProfile = await request('GET', `/usuarios/${users.buyer.id}/publico`)
      assert.ok(!('email' in publicProfile) && !('senha' in publicProfile))
      await request('PUT', '/perfil/senha', { token: users.buyer.token, body: { senhaAtual: password, novaSenha: 'Changed-Password-2026' } })
      await request('PUT', '/perfil/email', { token: users.buyer.token, body: { novoEmail: 'buyer.updated.test@gmail.com', senha: 'Changed-Password-2026' } })
      users.buyer.email = 'buyer.updated.test@gmail.com'
      await request('GET', '/perfil', { token: users.buyer.token, expected: 403 })
    })
    await t.test('recuperação de senha usa link correto e token de uso único; e-mail interceptado localmente', async () => {
      await request('POST', '/esqueci-senha', { body: { email: users.buyer.email } })
      assert.equal(deliveries.length, 1)
      const link = deliveries[0].html.match(/href="([^"]+)"/)[1]
      assert.ok(link.startsWith('http://localhost:3001/redefinir-senha?token='))
      const token = new URL(link).searchParams.get('token')
      assert.equal((await request('GET', `/verificar-token/${token}`)).valido, true)
      await request('POST', '/redefinir-senha', { body: { token, novaSenha: password } })
      assert.equal((await request('GET', `/verificar-token/${token}`)).valido, false)
      await request('POST', '/redefinir-senha', { body: { token, novaSenha: password }, expected: 400 })
      assert.ok((await request('POST', '/login', { body: { email: users.buyer.email, senha: password } })).token)
    })
    await t.test('exclusão de produto/usuário e revogação de permissão administrativa', async () => {
      await request('DELETE', `/produtos/${productId}`, { token: users.seller.token })
      await request('GET', `/produtos/${productId}`, { expected: 404 })
      await request('DELETE', `/admin/users/${users.other.id}`, { token: users.admin.token })
      await request('GET', '/perfil', { token: users.other.token, expected: 403 })
      await pool.execute("UPDATE usuarios SET role = 'user' WHERE id_usuario = ?", [users.admin.id])
      await request('GET', '/admin/users', { token: users.admin.token, expected: 403 })
    })
    await t.test('todas as operações documentadas foram exercitadas por HTTP', () => {
      const missing = routes.map(item => `${item.method} ${item.route}`).filter(key => !covered.has(key))
      assert.deepEqual(missing, [])
      t.diagnostic(`${covered.size} operações de API; ${records.length} requisições HTTP verificadas.`)
    })
  } finally {
    const report = { date: new Date().toISOString(), operations: covered.size, requests: records.length, failures: records.filter(item => item.status !== item.expected), records }
    fs.mkdirSync(path.join(__dirname, '../scratch/audit'), { recursive: true })
    fs.writeFileSync(path.join(__dirname, '../scratch/audit/api-results.json'), JSON.stringify(report, null, 2))
    if (server) await new Promise(resolve => server.close(resolve))
    if (pool) await pool.end()
    await adminConnection.query(`DROP DATABASE IF EXISTS \`${database}\``)
    await adminConnection.end()
    // Apenas o diretório temporário criado por esta execução pode ser removido.
    assert.ok(path.resolve(uploads).startsWith(path.resolve(os.tmpdir()) + path.sep + 'ehtech-test-uploads-'))
    fs.rmSync(uploads, { recursive: true, force: true })
    nodemailer.createTransport = originalTransport
    for (const key of Object.keys(process.env)) if (!(key in priorEnv)) delete process.env[key]
    Object.assign(process.env, priorEnv)
  }
})
