const { test, expect } = require('@playwright/test')

test('IA recupera disponibilidade no mesmo clique e preserva a checagem básica ao falhar ou cancelar', async ({ page }) => {
  let statusCalls = 0, analysisCalls = 0, releaseAnalysis
  const pendingAnalysis = new Promise(resolve => { releaseAnalysis = resolve })
  await page.route('**/api/componentes/ia/status', async route => {
    statusCalls++
    if (statusCalls === 1) await route.fulfill({ status: 503, json: { mensagem: 'Indisponível no teste.' } })
    else await route.fulfill({ json: { disponivel: true, provedor: 'gemini', externo: true } })
  })
  await page.route('**/api/componentes/ia/analisar', async route => {
    analysisCalls++
    if (analysisCalls === 2) await pendingAnalysis
    await route.fulfill({ status: 503, json: { mensagem: 'O Gemini está temporariamente indisponível.' } })
  })

  try {
    await page.goto('/compatibilidade')
    await expect(page.getByText('IA indisponível. A checagem básica continua disponível.', { exact: true })).toBeVisible()
    const search = page.getByRole('combobox', { name: 'Buscar modelo', exact: true })
    await search.fill('AMD Ryzen 5 5600')
    await page.getByRole('option').filter({ has: page.getByText('AMD Ryzen 5 5600', { exact: true }) }).click()
    await page.getByRole('combobox', { name: 'Categoria', exact: true }).selectOption('placa_mae')
    await search.fill('Asus PRIME B550M-A')
    await page.getByRole('option').filter({ has: page.getByText('Asus PRIME B550M-A', { exact: true }) }).click()
    await page.getByRole('button', { name: 'Verificar com regras básicas', exact: true }).click()
    const basic = page.getByRole('region', { name: 'Resultado da checagem básica' })
    await expect(basic).toBeVisible()

    const analyze = page.getByRole('button', { name: 'Complementar com IA', exact: true })
    await analyze.click()
    await expect(page.getByRole('alert').filter({ hasText: 'A checagem básica permanece abaixo.' })).toBeVisible()
    expect(statusCalls).toBe(2)
    expect(analysisCalls).toBe(1)
    await expect(basic).toBeVisible()

    await analyze.click()
    await expect.poll(() => analysisCalls).toBe(2)
    await page.getByRole('button', { name: 'Cancelar análise', exact: true }).click()
    await expect(analyze).toBeEnabled()
    await expect(basic).toBeVisible()
  } finally { releaseAnalysis() }
})
