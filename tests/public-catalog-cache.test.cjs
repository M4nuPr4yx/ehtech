const { test } = require('node:test'), assert = require('node:assert/strict')
const { publicCatalogCache } = require('../backend/public-catalog-cache')

test('somente catálogo anônimo recebe cache curto do CDN; sessão e cookies mantêm no-store', () => {
  for (const headers of [{}, { authorization: 'Bearer ficticio' }, { cookie: 'sessao=ficticia' }]) {
    const result = {}, vary = []
    publicCatalogCache({ headers }, { set: (name, value) => { result[name] = value }, vary: name => vary.push(name) })
    assert.deepEqual(vary, ['Authorization'])
    if (Object.keys(headers).length) {
      assert.equal(result['Cache-Control'], 'no-store')
      assert.equal(result['Vercel-CDN-Cache-Control'], 'no-store')
    } else {
      assert.equal(result['Cache-Control'], 'public, max-age=0, must-revalidate')
      assert.equal(result['Vercel-CDN-Cache-Control'], 'public, s-maxage=15, stale-while-revalidate=30')
    }
  }
})
