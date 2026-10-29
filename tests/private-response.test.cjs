const { test } = require('node:test')
const assert = require('node:assert/strict')
const { privateResponse } = require('../backend/middleware/private-response')

test('respostas de conta, recuperação e administração não podem ser armazenadas ou enviar referência', () => {
  for (const url of ['/api/login', '/api/_backend/admin/users', '/auth/google/callback?code=segredo', '/verificar-token/segredo', '/redefinir-senha', '/esqueci-senha']) {
    const headers = {}
    privateResponse({ url, headers: {} }, { set(key, value) { headers[key] = value } }, () => {})
    assert.equal(headers['Cache-Control'], 'no-store')
    assert.equal(headers['Referrer-Policy'], 'no-referrer')
  }
  const headers = {}
  privateResponse({ url: '/pedidos', headers: { authorization: 'Bearer example' } }, { set(key, value) { headers[key] = value } }, () => {})
  assert.equal(headers['Cache-Control'], 'no-store')
  privateResponse({ url: '/produtos', headers: {} }, { set() { assert.fail('Vitrine pública mantém política própria') } }, () => {})
})
