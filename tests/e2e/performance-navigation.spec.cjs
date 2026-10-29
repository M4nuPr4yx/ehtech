const { test, expect } = require('@playwright/test')

test.beforeEach(async ({ request }) => {
  expect((await request.post(`${process.env.E2E_API_URL}/__e2e/reset-limits`, { headers: { 'x-e2e-key': process.env.E2E_RESET_KEY } })).ok()).toBeTruthy()
})

test('navegação simples: ferramentas por teclado e serviços sem redirecionamento', async ({ page }, info) => {
  const serviceRequests = []
  page.on('request', request => { if (/\/api\/(?:_backend\/)?servicos\?/.test(request.url())) serviceRequests.push(request) })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'O que você quer fazer?' })).toBeVisible()
  const tools = page.locator('summary').filter({ hasText: 'Ferramentas' })
  await tools.focus(); await tools.press('Enter')
  await expect(page.getByRole('navigation', { name: 'Ferramentas para escolher' })).toBeVisible()
  await tools.press('Escape'); await expect(tools).toBeFocused()
  await expect(page.getByRole('navigation', { name: 'Ferramentas para escolher' })).toBeHidden()
  await tools.press('Enter')
  await page.getByRole('link', { name: /Verificar peças/ }).click()
  await expect(page.getByRole('heading', { name: 'Estas peças combinam?' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Ferramentas para escolher' })).toBeHidden()
  await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Serviços', exact: true }).click()
  await expect(page.locator('main')).toContainText(/serviços encontrados/)
  expect(serviceRequests.length).toBeGreaterThan(0)
  for (const request of serviceRequests) { expect(new URL(request.url()).pathname).toBe('/api/_backend/servicos'); expect(request.redirectedFrom()).toBeNull() }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
  await page.screenshot({ path: info.outputPath('navegacao-servicos.png'), fullPage: true })
})

test('carregamento animado mantém filtros utilizáveis e respeita movimento reduzido', async ({ page }, info) => {
  let release
  const barrier = new Promise(resolve => { release = resolve })
  await page.route('**/api/produtos/catalogo?**', async route => { await barrier; await route.continue() })
  try {
    await page.goto('/produtos')
    const loading = page.getByRole('status').filter({ hasText: 'Carregando produtos…' })
    await expect(loading).toBeVisible()
    const animated = loading.locator('span[aria-hidden="true"]')
    await expect(animated).toHaveCSS('animation-duration', '1s')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(animated).toHaveCSS('animation-name', 'none')
    await expect(page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Início', exact: true })).toBeEnabled()
    await page.screenshot({ path: info.outputPath('carregamento-reduzido.png'), fullPage: true })
    release(); await expect(loading).toBeHidden()
  } finally { release() }
})

test('checagem de peças abre sem esperar uma resposta lenta da IA', async ({ page }) => {
  let release, pending = false
  const barrier = new Promise(resolve => { release = resolve })
  await page.route('**/api/componentes/ia/status', async route => { pending = true; await barrier; await route.fulfill({ json: { disponivel: false, mensagem: 'IA indisponível no teste.' } }) })
  try {
    await page.goto('/compatibilidade')
    await expect(page.getByRole('combobox', { name: 'Buscar modelo', exact: true })).toBeEnabled()
    expect(pending).toBeTruthy()
    await expect(page.getByRole('button', { name: 'Complementar com IA', exact: true })).toBeDisabled()
  } finally { release() }
})

test('falha temporária no perfil permite repetir sem perder sessão; cabeçalho evita repetição', async ({ page, request }) => {
  const signed = await request.post(process.env.E2E_API_URL + '/login', { data: { email: process.env.E2E_ADMIN_EMAIL, senha: process.env.E2E_PASSWORD } })
  expect(signed.ok()).toBeTruthy()
  const { token } = await signed.json()
  let profileCalls = 0, productCalls = 0, fail = true
  page.on('request', request => { if (new URL(request.url()).pathname === '/api/produtos/meus') productCalls++ })
  await page.route('**/api/perfil', async route => { profileCalls++; if (fail) await route.fulfill({ status: 503, json: { mensagem: 'Perfil temporariamente indisponível.' } }); else await route.continue() })
  await page.goto('/')
  await page.evaluate(value => { localStorage.setItem('token', value); window.dispatchEvent(new Event('ehtech:auth-change')) }, token)
  await expect.poll(() => profileCalls).toBe(1)
  await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Produtos', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Encontre seu próximo equipamento.' })).toBeVisible()
  expect(profileCalls).toBe(1)
  await page.goto('/perfil')
  await expect(page.getByRole('alert').filter({ hasText: 'Perfil temporariamente indisponível.' })).toBeVisible()
  expect(await page.evaluate(() => Boolean(localStorage.getItem('token')))).toBeTruthy()
  fail = false
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Atualizar produtos', exact: true })).toBeHidden()
  await expect(page.getByRole('alert').filter({ hasText: 'Perfil temporariamente indisponível.' })).toBeHidden()
  await expect(page.getByRole('navigation', { name: 'Minha conta' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Meu Perfil', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Seus Produtos', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Atualizar produtos', exact: true })).toBeEnabled()
  await expect(page.getByText('Carregando seus produtos…', { exact: true })).toBeHidden()
  expect(productCalls).toBe(1)
  await page.getByRole('button', { name: 'Perfil', exact: true }).click()
  await page.getByRole('button', { name: 'Seus Produtos', exact: true }).click()
  expect(productCalls).toBe(1)
  await page.getByRole('button', { name: 'Atualizar produtos', exact: true }).click()
  await expect.poll(() => productCalls).toBe(2)
})

test('vitrine com erro repete só a consulta e preserva a busca digitada', async ({ page }) => {
  let count = 0, navigations = 0
  page.on('request', request => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) navigations++ })
  await page.route('**/api/produtos/catalogo?**', async route => {
    count++
    await route.fulfill(count === 1 ? { status: 503, json: { mensagem: 'Indisponível no teste' } } : { json: { items: [], total: 0, page: 1, limit: 8, totalPages: 1 } })
  })
  await page.goto('/')
  const search = page.getByRole('search', { name: 'Buscar produtos na vitrine' }).getByRole('searchbox')
  await search.fill('Notebook para estudar')
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  await expect(page.getByText('A vitrine está esperando o primeiro anúncio.')).toBeVisible()
  await expect(search).toHaveValue('Notebook para estudar')
  expect(count).toBe(2); expect(navigations).toBe(1)
})
