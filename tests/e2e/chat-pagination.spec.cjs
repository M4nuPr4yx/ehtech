const { test, expect } = require('@playwright/test')
test('chat carrega anteriores, preserva rolagem e suspende polling em aba oculta', async ({ page, request }, info) => {
  const api = process.env.E2E_API_URL, password = process.env.E2E_PASSWORD
  await request.post(api + '/__e2e/reset-limits', { headers: { 'x-e2e-key': process.env.E2E_RESET_KEY } })
  const email = `historico_${info.project.name}@gmail.com`
  expect((await request.post(api + '/cadastro', { data: { username: `historico_${info.project.name}`, email, senha: password, confirmarSenha: password } })).status()).toBe(201)
  const sender = await (await request.post(api + '/login', { data: { email, senha: password } })).json()
  const admin = await (await request.post(api + '/login', { data: { email: process.env.E2E_ADMIN_EMAIL, senha: password } })).json()
  const headers = { Authorization: `Bearer ${sender.token}` }
  for (let index = 0; index < 120; index++) expect((await request.post(api + '/mensagens', { headers, data: { destinatarioId: admin.userId, conteudo: `Histórico fictício ${index}` } })).status()).toBe(201)
  await page.goto('/?login=1')
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('E-mail', { exact: true }).fill(process.env.E2E_ADMIN_EMAIL)
  await dialog.getByLabel('Senha', { exact: true }).fill(password)
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(dialog).toBeHidden()
  const queries = []
  page.on('request', event => { const url = new URL(event.url()); if (url.pathname === `/api/mensagens/${sender.userId}`) queries.push(url.search) })
  await page.goto(`/mensagens?usuario=${sender.userId}`)
  const list = page.locator('[aria-label="Histórico da conversa"]')
  await expect(list.locator('[data-message-id]')).toHaveCount(40)
  await page.getByRole('button', { name: 'Carregar mensagens anteriores', exact: true }).click()
  await expect(list.locator('[data-message-id]')).toHaveCount(80)
  expect(queries.some(query => query.includes('antes='))).toBeTruthy()
  const priorScroll = await list.evaluate(element => element.scrollTop)
  expect((await request.post(api + '/mensagens', { headers, data: { destinatarioId: admin.userId, conteudo: 'Nova mensagem após o histórico' } })).status()).toBe(201)
  await expect(list.locator('[data-message-id]')).toHaveCount(81)
  expect(queries.some(query => query.includes('depois='))).toBeTruthy()
  expect(await list.evaluate(element => element.scrollTop)).toBeCloseTo(priorScroll, 0)
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')) })
  const paused = queries.length
  // Uma janela completa do intervalo de oito segundos, com margem de 500 ms.
  await page.waitForTimeout(8500)
  expect(queries.length).toBe(paused)
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')) })
  await expect.poll(() => queries.length).toBeGreaterThan(paused)
})
