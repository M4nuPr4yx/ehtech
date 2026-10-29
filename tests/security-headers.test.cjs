const { test } = require('node:test')
const assert = require('node:assert/strict')

test('cabeçalhos protegem formulários, enquadramento e links sensíveis sem restringir imagens e scripts existentes', async () => {
  const config = (await import('../next.config.mjs')).default
  const previous = process.env.NODE_ENV
  try {
    process.env.NODE_ENV = 'production'
    const rules = await config.headers()
    const headers = Object.fromEntries(rules.find(rule => rule.source === '/:path*').headers.map(item => [item.key, item.value]))
    assert.equal(config.poweredByHeader, false)
    assert.equal(headers['Strict-Transport-Security'], 'max-age=31536000')
    assert.match(headers['Content-Security-Policy'], /frame-ancestors 'self'/)
    assert.match(headers['Content-Security-Policy'], /form-action 'self'/)
    assert.match(headers['Content-Security-Policy'], /object-src 'none'/)
    assert.doesNotMatch(headers['Content-Security-Policy'], /script-src|img-src|connect-src/)
    const sensitive = rules.find(rule => rule.source.includes('redefinir-senha'))
    assert.ok(sensitive.headers.some(header => header.key === 'Referrer-Policy' && header.value === 'no-referrer'))
  } finally { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous }
})
