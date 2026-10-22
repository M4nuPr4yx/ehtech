const { test } = require('node:test')
const assert = require('node:assert/strict')
test('cliente preserva status, código, validação e prazo sugerido sem repetir escrita', async t => {
  const { apiRequest, ApiError } = await import('../src/lib/api-request.js')
  let calls = 0
  t.mock.method(global, 'fetch', async () => { calls++; return new Response(JSON.stringify({ mensagem: 'Endereço incompleto', codigo: 'ENDERECO', erros: { numero: 'Obrigatório' } }), { status: 409, headers: { 'Content-Type': 'application/json', 'Retry-After': '30' } }) })
  await assert.rejects(apiRequest('/teste', { method: 'POST', json: { numero: '' } }), error => error instanceof ApiError && error.status === 409 && error.code === 'ENDERECO' && error.errors.numero === 'Obrigatório' && error.retryAfter === '30')
  assert.equal(calls, 1)
})
test('cliente distingue rede, resposta inválida e timeout', async t => {
  const { apiRequest } = await import('../src/lib/api-request.js')
  t.mock.method(global, 'fetch', async () => { throw new TypeError('rede') })
  await assert.rejects(apiRequest('/teste'), error => error.code === 'NETWORK_ERROR')
  global.fetch = async () => new Response('<html>erro</html>', { headers: { 'Content-Type': 'text/html' } })
  await assert.rejects(apiRequest('/teste'), error => error.code === 'INVALID_RESPONSE')
  global.fetch = async (url, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }))
  await assert.rejects(apiRequest('/teste', { timeoutMs: 10 }), error => error.code === 'TIMEOUT')
})
test('cancelamento do chamador é preservado; multipart e 204 são aceitos', async t => {
  const { apiRequest } = await import('../src/lib/api-request.js')
  const controller = new AbortController(); controller.abort(new DOMException('Saída da tela', 'AbortError'))
  t.mock.method(global, 'fetch', async (url, { signal }) => { if (signal.aborted) throw signal.reason; return new Response(null, { status: 204 }) })
  await assert.rejects(apiRequest('/teste', { signal: controller.signal }), error => error.name === 'AbortError')
  const body = new FormData(); body.set('campo', 'valor')
  global.fetch = async (url, options) => { assert.equal(options.body, body); assert.equal(options.headers.has('Content-Type'), false); return new Response(null, { status: 204 }) }
  assert.equal(await apiRequest('/teste', { method: 'POST', body }), null)
})
