const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { createHandler } = require('../backend/serverless')

function apiUrl(base, origin, endpoint = '/componentes', env = {}) {
  const context = { process: { env: { NEXT_PUBLIC_API_URL: base, ...env } }, URL }
  if (origin) context.window = { location: { origin } }
  else context.process.env.VERCEL_URL ||= 'example.vercel.app'
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/lib/api.js'), 'utf8').replace('export const getApiUrl', 'var getApiUrl').replace('export default getApiUrl;', ''), context)
  return context.getApiUrl(endpoint)
}

test('SSR de produção usa domínio público e preserva isolamento de previews e backend externo', () => {
  const env = { VERCEL_ENV: 'production', VERCEL_URL: 'deploy-protegido.vercel.app', VERCEL_PROJECT_PRODUCTION_URL: 'loja.example.com' }
  assert.equal(apiUrl('', undefined, '/produtos/9', env), 'https://loja.example.com/api/produtos/9')
  assert.equal(apiUrl('/api', undefined, '/produtos/9', env), 'https://loja.example.com/api/produtos/9')
  assert.equal(apiUrl('', undefined, '/produtos/9', { ...env, VERCEL_ENV: 'preview' }), 'https://deploy-protegido.vercel.app/api/produtos/9')
  assert.equal(apiUrl('', undefined, '/produtos/9', { ...env, VERCEL_PROJECT_PRODUCTION_URL: '' }), 'https://deploy-protegido.vercel.app/api/produtos/9')
  assert.equal(apiUrl('https://api.example.com', undefined, '/produtos/9', env), 'https://api.example.com/produtos/9')
  assert.equal(apiUrl('', undefined, '/produtos/9', { ...env, BACKEND_URL: 'https://backend.example.com' }), 'https://backend.example.com/produtos/9')
  assert.equal(apiUrl('', 'https://loja.example.com', '/produtos/9', env), '/api/produtos/9')
})

test('serviços no mesmo domínio chegam diretamente ao Express; backend externo e Google preservados', () => {
  for (const base of ['', '/api', 'https://example.vercel.app/api', 'http://localhost:3000']) {
    for (const route of ['/servicos?page=2', '/servicos/meus/4', '/servicos/moderacao']) assert.equal(apiUrl(base, 'https://example.vercel.app', route), `/api/_backend${route}`)
  }
  assert.equal(apiUrl('', 'http://localhost:3001', '/servicos'), '/api/_backend/servicos')
  assert.equal(apiUrl('https://api.example.com', 'https://example.vercel.app', '/servicos'), 'https://api.example.com/servicos')
  assert.equal(apiUrl('https://api.example.com', 'https://example.vercel.app', '/auth/google/iniciar'), '/api/auth/google/iniciar')
})

test('Vercel e celular não usam localhost, IP privado ou HTTP em página HTTPS', () => {
  for (const origin of ['https://example.vercel.app', undefined]) {
    for (const base of ['', 'http://localhost:3000', 'http://127.0.0.1:3000', 'https://192.168.1.2:3000', 'http://api.example.com', 'invalid', 'https://user:password@api.example.com']) assert.equal(apiUrl(base, origin), origin ? '/api/componentes' : 'https://example.vercel.app/api/componentes')
  }
  assert.equal(apiUrl('http://localhost:3000', 'http://192.168.1.3:3001'), '/api/componentes')
  assert.equal(apiUrl('/api/', 'https://example.vercel.app', '/api/componentes'), 'https://example.vercel.app/api/componentes')
  assert.equal(apiUrl('https://api.example.com', 'https://example.vercel.app'), 'https://api.example.com/componentes')
  assert.equal(apiUrl('http://localhost:3000', 'http://localhost:3001'), 'http://localhost:3000/componentes')
  assert.equal(apiUrl('', 'http://192.168.1.3:3001'), '/api/componentes')
})

test('entrada serverless libera só rotas públicas sem banco, não ignora inicialização de rotas privadas', async () => {
  let initialized = 0, served = 0
  const app = () => { served++ }
  app.initDatabaseTables = async () => { initialized++ }
  const handler = createHandler(app)
  for (const prefix of ['', '/api', '/api/_backend']) {
    for (const [method, route] of [['GET', '/componentes/catalogo?tipo=processador'], ['GET', '/componentes/catalogo/status'], ['GET', '/componentes/ia/status'], ['POST', '/componentes/ia/analisar'], ['POST', '/componentes/verificar-basico']]) await handler({ method, url: prefix + route }, {})
  }
  assert.equal(initialized, 0); assert.equal(served, 15)
  for (const [method, url] of [['GET', '/api/componentes/admin'], ['POST', '/api/componentes/admin'], ['GET', '/api/perfil'], ['POST', '/api/componentes/ia/explicar'], ['GET', '/api/health'], ['PUT', '/api/componentes/ia/analisar']]) await handler({ method, url }, {})
  assert.equal(initialized, 6); assert.equal(served, 21)
})

test('handlers Next na Vercel redirecionam para Express sem localhost ou recursão', async () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/app/api/_lib/backend.js'), 'utf8').replace('export async function', 'async function')
  let calls = 0
  const context = { process: { env: { VERCEL: '1', BACKEND_URL: 'http://localhost:3000' } }, URL, Response, fetch: async () => { calls++; throw new Error('Não deveria chamar fetch') } }
  vm.runInNewContext(source, context)
  for (const [route, target] of [['/servicos', '/servicos'], ['/catalogo', '/produtos/catalogo'], ['/servicos/teste', '/servicos/teste']]) {
    const response = await context.proxyBackendGet(new Request(`https://example.vercel.app/api${route}?page=2&secret=ignorar`), target, ['page'])
    assert.equal(response.status, 307)
    assert.equal(response.headers.get('location'), `/api/_backend${target}?page=2`)
    assert.equal(response.headers.get('cache-control'), 'no-store')
  }
  assert.equal(calls, 0)
})

test('helper de requisição traduz falha de rede, resposta HTML e JSON inválido', async () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/lib/api-request.js'), 'utf8').replace(/^import[^\n]+\n/, '').replaceAll('export ', '')
  for (const [fetchImpl, message] of [
    [async () => { throw new TypeError('Failed to fetch') }, /Não foi possível conectar/],
    [async () => new Response('<html>offline</html>', { status: 502 }), /serviço não respondeu/],
    [async () => new Response('{', { headers: { 'Content-Type': 'application/json' } }), /resposta inválida/],
    [async () => Response.json({ mensagem: 'Cota da IA atingida.' }, { status: 429 }), /Cota da IA/]
  ]) {
    const context = { getApiUrl: endpoint => `/api${endpoint}`, AbortSignal, AbortController, Headers, setTimeout, clearTimeout, DOMException, fetch: fetchImpl, TypeError, SyntaxError, Error }
    vm.runInNewContext(source, context)
    await assert.rejects(context.apiRequest('/componentes/catalogo'), message)
  }
})
