const { test, expect } = require('@playwright/test')

const cpu = { id: 'cpu-test', tipo: 'processador', modelo: 'AMD Ryzen 5 5600', especificacoes: {} }
const motherboard = { id: 'motherboard-test', tipo: 'placa_mae', modelo: 'Asus PRIME B550M-A', especificacoes: {} }

test.beforeEach(async ({ page }) => {
  await page.route('**/api/componentes/catalogo/status', route => route.fulfill({ json: {
    categorias: [{ tipo: cpu.tipo, nome: 'Processadores', total: 1 }, { tipo: motherboard.tipo, nome: 'Placas-mãe', total: 1 }],
    total: 2, data_fonte: '2026-11-24', fonte: 'https://example.com/catalogo',
  } }))
  await page.route('**/api/componentes/catalogo?*', route => {
    const type = new URL(route.request().url()).searchParams.get('tipo')
    return route.fulfill({ json: { items: type === cpu.tipo ? [cpu] : [motherboard], total: 1, mais: false } })
  })
})

test('compatibilidade usa somente IA, com recuperação, cancelamento e resultado', async ({ page }) => {
  let statusCalls = 0, analysisCalls = 0, basicCalls = 0, releaseAnalysis
  const pendingAnalysis = new Promise(resolve => { releaseAnalysis = resolve })
  await page.route('**/api/componentes/verificar-basico', route => {
    basicCalls++
    return route.abort()
  })
  await page.route('**/api/componentes/ia/status', route => {
    statusCalls++
    if (statusCalls === 1) return route.fulfill({ status: 503, json: { mensagem: 'Indisponível no teste.' } })
    return route.fulfill({ json: { disponivel: true, provedor: 'gemini', externo: true } })
  })
  await page.route('**/api/componentes/ia/analisar', async route => {
    analysisCalls++
    expect(route.request().postDataJSON()).toEqual({ componentes: [{ id: cpu.id, quantidade: 1 }, { id: motherboard.id, quantidade: 1 }], bios: '4403' })
    if (analysisCalls === 2) {
      await pendingAnalysis
      return
    }
    if (analysisCalls === 1) {
      await route.fulfill({ status: 503, json: { mensagem: 'O Gemini está temporariamente indisponível.' } })
      return
    }
    await route.fulfill({ json: {
      ia: { status: 'nao_verificado', provedor: 'gemini', gerado_em: '2026-11-24T12:00:00Z', resumo: 'Confirme os dados no fabricante.', pontos: [] },
      limites: ['A análise depende dos dados publicados.'],
    } })
  })

  try {
    await page.goto('/compatibilidade')
    const analyze = page.getByRole('button', { name: 'Analisar com IA', exact: true })
    await expect(analyze).toBeDisabled()
    await expect(page.getByRole('status').filter({ hasText: 'Não foi possível consultar a disponibilidade da IA.' })).toBeVisible()
    const search = page.getByRole('combobox', { name: 'Buscar modelo', exact: true })
    await search.fill(cpu.modelo)
    await page.getByRole('option').filter({ has: page.getByText(cpu.modelo, { exact: true }) }).click()
    await page.getByRole('combobox', { name: 'Tipo de peça', exact: true }).selectOption(motherboard.tipo)
    await search.fill(motherboard.modelo)
    await page.getByRole('option').filter({ has: page.getByText(motherboard.modelo, { exact: true }) }).click()
    const bios = page.getByRole('textbox', { name: 'BIOS instalada (opcional)', exact: true })
    await bios.fill('4403')
    await expect(page.getByRole('button', { name: /regras básicas/i })).toHaveCount(0)
    await bios.press('Enter')
    await expect(page.getByRole('alert').filter({ hasText: 'O Gemini está temporariamente indisponível.' })).toBeVisible()
    expect(statusCalls).toBe(2)

    await analyze.click()
    await expect.poll(() => analysisCalls).toBe(2)
    await page.getByRole('button', { name: 'Cancelar análise', exact: true }).click()
    await expect(analyze).toBeEnabled()
    await expect(bios).toHaveValue('4403')
    releaseAnalysis()
    await analyze.click()
    await expect(page.getByRole('heading', { name: 'Faltam dados para a IA concluir', exact: true })).toBeVisible()
    expect(analysisCalls).toBe(3)
    expect(basicCalls).toBe(0)

    await page.getByRole('button', { name: 'Remover ' + motherboard.modelo, exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Faltam dados para a IA concluir', exact: true })).toHaveCount(0)
    await expect(analyze).toBeDisabled()
  } finally { releaseAnalysis() }
})
