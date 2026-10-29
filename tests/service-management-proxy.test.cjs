const { test } = require('node:test'), assert = require('node:assert/strict')
const fs = require('node:fs'), vm = require('node:vm')
const source = fs.readFileSync(require('node:path').join(__dirname, '../src/app/api/_lib/service-management.js'), 'utf8').replace('export async function', 'async function')
function proxy(env, fetch) {
  const context = { process: { env }, URL, Response, TextEncoder, AbortSignal, fetch }
  vm.runInNewContext(source, context)
  return context.proxyServiceManagement
}
test('gerenciamento Next preserva JWT e POST, sem cache ou exposição no proxy público', async () => {
  let calls = 0
  const handler = proxy({ BACKEND_URL: 'http://backend.test' }, async (url, options) => {
    calls++; assert.equal(url.href, 'http://backend.test/servicos/meus'); assert.equal(options.headers.Authorization, 'Bearer token-ficticio')
    assert.equal(options.method, 'POST'); assert.equal(options.body, '{"titulo":"Teste"}'); assert.equal(options.cache, 'no-store')
    return Response.json({ mensagem: 'Criado' }, { status: 201 })
  })
  const denied = await handler(new Request('http://site.test/api/servicos/meus'), '/servicos/meus')
  assert.equal(denied.status, 401); assert.equal(calls, 0)
  const response = await handler(new Request('http://site.test/api/servicos/meus', { method: 'POST', headers: { Authorization: 'Bearer token-ficticio' }, body: '{"titulo":"Teste"}' }), '/servicos/meus')
  assert.equal(response.status, 201); assert.equal(response.headers.get('Cache-Control'), 'no-store'); assert.equal(calls, 1)
})
test('proxy privado na Vercel mantém destino local da API e redirecionamento que preserva método', async () => {
  const handler = proxy({ VERCEL: '1' }, () => { throw Error('Não usar localhost na Vercel') })
  const response = await handler(new Request('https://site.test/api/servicos/moderacao'), '/servicos/moderacao')
  assert.equal(response.status, 307); assert.equal(response.headers.get('Location'), '/api/_backend/servicos/moderacao')
})
