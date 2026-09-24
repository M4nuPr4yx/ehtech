const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const origin = process.env.TEST_SITE_URL || 'http://127.0.0.1:3003'
const results = []
async function check(route, expected, type) {
  const response = await fetch(origin + route, { signal: AbortSignal.timeout(15000), redirect: 'manual' })
  const body = await response.text()
  results.push({ route, status: response.status, expected })
  assert.equal(response.status, expected, route)
  if (type) assert.ok((response.headers.get('content-type') || '').includes(type), route)
  if (type === 'text/html' && expected === 200) assert.ok(!body.includes('Application error: a server-side exception'), route)
  if (type === 'application/json') return JSON.parse(body)
}
async function main() {
  const services = await check('/api/servicos', 200, 'application/json')
  assert.ok(services.items.length)
  const pages = fs.readdirSync(path.join(__dirname, '../src/app'), { recursive: true }).filter(file => /(^|[\\/])page\.js$/.test(file))
  for (const page of pages) {
    const route = '/' + page.replace(/\\/g, '/').replace(/(^|\/)page\.js$/, '').replace('[id]', '1').replace('[slug]', services.items[0].slug)
    await check(route, 200, 'text/html')
  }
  const catalog = await check('/api/catalogo?categoria=notebooks', 200, 'application/json')
  assert.equal(catalog.total, 1)
  await check(`/api/servicos/${services.items[0].slug}`, 200, 'application/json')
  await check('/api/servicos/nao-existe', 404, 'application/json')
  await check('/api/servicos/INVALIDO', 400, 'application/json')
  await check('/api/health', 200, 'application/json')
  await check('/api/produtos', 200, 'application/json')
  await check('/api/perfil', 401, 'application/json')
  await check('/icon.png?v=2', 200, 'image/png')
  await check('/ehtech-logo.png?v=2', 200, 'image/png')
  await check('/uploads/img-1-preview.png', 200, 'image/png')
  await check('/_next/image?url=%2Fuploads%2Fimg-1-preview.png&w=640&q=75', 200, 'image/')
  await check('/rota-que-nao-existe', 404, 'text/html')
  console.log(`${pages.length} páginas e ${results.length - pages.length} verificações de API, imagens e 404 passaram.`)
}
main().catch(error => { console.error(error.message); process.exitCode = 1 }).finally(() => {
  fs.mkdirSync(path.join(__dirname, '../scratch/audit'), { recursive: true })
  fs.writeFileSync(path.join(__dirname, '../scratch/audit/page-results.json'), JSON.stringify(results, null, 2))
})
