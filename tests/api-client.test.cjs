const { test } = require('node:test')
const assert = require('node:assert/strict')

test('leituras simultâneas compartilham conexão, separam contas e não viram cache privado', async t => {
  const { apiRequest } = await import('../src/lib/api-request.js')
  let calls = 0, release
  const barrier = new Promise(resolve => { release = resolve })
  t.mock.method(global, 'fetch', async (url, options) => {
    calls++; assert.equal(options.cache, 'no-store'); assert.equal('dedupe' in options, false)
    await barrier
    return Response.json({ conta: options.headers.get('Authorization') })
  })
  const read = token => apiRequest('/perfil', { dedupe: true, headers: { Authorization: token } })
  const one = read('Bearer A'), same = read('Bearer A'), other = read('Bearer B')
  assert.equal(calls, 2); release()
  const results = await Promise.all([one, same, other])
  assert.equal(results[0].conta, 'Bearer A'); assert.equal(results[2].conta, 'Bearer B')
  await read('Bearer A'); assert.equal(calls, 3)
  await Promise.all([apiRequest('/teste', { dedupe: true, method: 'POST', json: {} }), apiRequest('/teste', { dedupe: true, method: 'POST', json: {} })])
  assert.equal(calls, 5)
  await Promise.all([apiRequest('/teste', { dedupe: true, signal: new AbortController().signal }), apiRequest('/teste', { dedupe: true, signal: new AbortController().signal })])
  assert.equal(calls, 7)
})
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
