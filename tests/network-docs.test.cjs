const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createProductLoadPolicy } = require('../backend/middleware/productLoadPolicy')
const spec = require('../backend/docs/openapi.json')

test('ampliação só cobre duas leituras em desenvolvimento explícito', () => {
  const policy = createProductLoadPolicy({ NODE_ENV: 'development', LOAD_TEST_PRODUCTS_MAX: '10000' })
  assert.equal(policy.max, 10000)
  for (const path of ['/produtos', '/produtos/catalogo']) assert.equal(policy.matches({ method: 'GET', path }), true)
  for (const path of ['/login', '/cadastro', '/admin/users', '/produtos/1']) assert.equal(policy.matches({ method: 'GET', path }), false)
  assert.equal(policy.matches({ method: 'POST', path: '/produtos' }), false)
})
test('produção, Vercel e valores inválidos mantêm o limite normal', () => {
  for (const env of [
    { NODE_ENV: 'production', LOAD_TEST_PRODUCTS_MAX: '10000' },
    { NODE_ENV: 'development', VERCEL: '1', LOAD_TEST_PRODUCTS_MAX: '10000' },
    { LOAD_TEST_PRODUCTS_MAX: '10000' },
    ...['', '0', '299', '-1', '1e4', '100001', 'NaN'].map(value => ({ NODE_ENV: 'development', LOAD_TEST_PRODUCTS_MAX: value }))
  ]) {
    const policy = createProductLoadPolicy(env)
    assert.equal(policy.enabled, false)
    assert.equal(policy.matches({ method: 'GET', path: '/produtos' }), false)
  }
})
test('URLs Swagger resolvem corretamente pelo proxy e pela API direta', () => {
  for (const [documentUrl, expected] of [
    ['http://10.1.2.3:3001/api/docs/openapi.json', 'http://10.1.2.3:3001/api/produtos'],
    ['http://10.1.2.3:3000/docs/openapi.json', 'http://10.1.2.3:3000/produtos']
  ]) {
    const base = new URL(spec.servers[0].url, documentUrl).href.replace(/\/$/, '')
    assert.equal(base + '/produtos', expected)
  }
  function checkRefs(value) {
    if (!value || typeof value !== 'object') return
    if (value.$ref) {
      let target = spec
      for (const key of value.$ref.slice(2).split('/')) target = target?.[key]
      assert.ok(target, value.$ref)
    }
    Object.values(value).forEach(checkRefs)
  }
  checkRefs(spec)
})
