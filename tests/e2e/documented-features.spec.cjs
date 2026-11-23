const { test, expect } = require('@playwright/test')
const { POLICY_VERSION } = require('../../backend/service-listings')
const AxeBuilder = require('@axe-core/playwright').default

test.use({ reducedMotion: 'reduce' })
async function feedbackContrast(page) {
  for (const theme of ['Escuro', 'Oceano', 'Aurora', 'Claro']) {
    await page.getByRole('button', { name: 'Escolher tema', exact: true }).click()
    await page.getByRole('group', { name: 'Temas de aparência' }).getByRole('button', { name: new RegExp(theme) }).click()
    const result = await new AxeBuilder({ page }).include('[role="status"]').withRules(['color-contrast']).analyze()
    expect(result.violations.map(item => ({ id: item.id, targets: item.nodes.map(node => node.target) }))).toEqual([])
  }
}

async function api(request, method, path, token, data, status = 200) {
  const response = await request[method](process.env.E2E_API_URL + path, { headers: token ? { Authorization: `Bearer ${token}` } : {}, ...(data ? { data } : {}) })
  expect(response.status(), `${method.toUpperCase()} ${path}: ${await response.text()}`).toBe(status)
  return response.json()
}
async function account(request, role, project) {
  const username = `docs_${role}_${project.slice(0, 3)}_${Date.now()}`
  const email = `${username}@gmail.com`, senha = process.env.E2E_PASSWORD
  await api(request, 'post', '/cadastro', null, { username, email, senha, confirmarSenha: senha }, 201)
  const login = await api(request, 'post', '/login', null, { email, senha })
  return { username, token: login.token }
}
async function enter(page, token, path) {
  await page.goto('/')
  await page.evaluate(value => localStorage.setItem('token', value), token)
  await page.goto(path)
}
test.beforeEach(async ({ request }) => {
  expect((await request.post(process.env.E2E_API_URL + '/__e2e/reset-limits', { headers: { 'x-e2e-key': process.env.E2E_RESET_KEY } })).ok()).toBeTruthy()
})

test('Docs: rotas antigas de passaportes e certificados redirecionam para áreas ativas', async ({ page }) => {
  await page.goto('/passaportes')
  await expect(page).toHaveURL(/\/compatibilidade$/)
  await expect(page.getByRole('main')).toHaveCount(1)
  await page.goto('/certificados')
  await expect(page).toHaveURL(/\/produtos$/)
  await expect(page.getByRole('heading', { name: 'Encontre seu próximo equipamento.' })).toBeVisible()
})

test('Docs: combos, busca por objetivo e contratação de serviço', async ({ page, request }, info) => {
  const owner = await account(request, 'dono', info.project.name)
  const technician = await account(request, 'tec', info.project.name)
  const admin = (await api(request, 'post', '/admin/login', null, { email: process.env.E2E_ADMIN_EMAIL, senha: process.env.E2E_PASSWORD })).token
  const service = async (token, title) => {
    const created = await api(request, 'post', '/servicos/meus', token, { titulo: title, descricao: 'Configuração e inspeção de computador fictício para teste da banca.', categoria: 'suporte', preco_base: 100, tipo_preco: 'fixo', prazo: 'Até três dias úteis', modalidade: 'remoto', regiao: '', destaques: [], entregaveis: 'Configuração e relatório dos testes.', criterios_aceite: 'Conferir o relatório e a configuração.', revisoes: 1, politicas_versao: POLICY_VERSION }, 201)
    const own = await api(request, 'get', '/servicos/meus', token)
    await api(request, 'patch', `/servicos/moderacao/${created.id_servico}`, admin, { versao: own.find(item => item.id_servico === created.id_servico).versao, decisao: 'aprovar' })
    return created.id_servico
  }
  const ownService = await service(owner.token, `Configuração Docs ${info.project.name}`)
  const providerService = await service(technician.token, `Suporte Docs ${info.project.name}`)
  const productName = `Notebook para missão Docs ${info.project.name}`
  const product = await api(request, 'post', '/produtos', owner.token, { nome: productName, descricao: 'Notebook fictício de demonstração para inspeção e configuração.', categoria: 'notebooks', preco: 500, estoque: 2, exige_entrega: false }, 201)
  await api(request, 'put', `/admin/produtos/${product.id}/aprovacao`, admin, { status: 'aprovado' })
  await enter(page, owner.token, '/combos')
  await page.getByText('Ofereço instalação', { exact: true }).click()
  await page.getByLabel('Título', { exact: true }).fill(`Notebook com configuração ${info.project.name}`)
  await page.getByLabel('O que está incluído?', { exact: true }).fill('Configuração inicial após conferir o equipamento e combinar o atendimento.')
  await page.getByRole('combobox', { name: 'Anúncio aprovado', exact: true }).selectOption(String(product.id))
  await page.getByRole('combobox', { name: 'Meu serviço ativo', exact: true }).selectOption(String(ownService))
  await page.getByRole('button', { name: 'Publicar oferta', exact: true }).click()
  await expect(page.getByRole('heading', { name: `Notebook com configuração ${info.project.name}`, exact: true })).toBeVisible()
  await page.goto('/missoes')
  await page.getByRole('combobox', { name: 'Objetivo', exact: true }).selectOption('estudar')
  await page.getByLabel('Limite por item (R$)', { exact: true }).fill('1000')
  await page.getByRole('button', { name: 'Buscar opções', exact: true }).click()
  await expect(page.getByRole('link', { name: productName, exact: true }).first()).toBeVisible()
  await expect(page.getByText(/opç(?:ão|ões) até .* por item/)).toBeVisible()
  await page.screenshot({ path: info.outputPath('missoes-busca-por-objetivo.png'), fullPage: true })
  await page.getByRole('link', { name: productName, exact: true }).first().click()
  await page.getByRole('link', { name: 'Voltar para os resultados da busca', exact: true }).click()
  await expect(page.getByRole('combobox', { name: 'Objetivo', exact: true })).toHaveValue('estudar')
  await expect(page.getByRole('spinbutton')).toHaveValue('1000')
  await expect(page.getByRole('link', { name: productName, exact: true }).first()).toBeVisible()
  const consoleName = `Console Docs ${info.project.name}`
  const consoleProduct = await api(request, 'post', '/produtos', owner.token, { nome: consoleName, descricao: 'Console fictício para conferir a restrição de categoria da comparação.', categoria: 'games', preco: 300, estoque: 1, exige_entrega: false }, 201)
  await api(request, 'put', `/admin/produtos/${consoleProduct.id}/aprovacao`, admin, { status: 'aprovado' })
  await page.goto(`/produtos/${product.id}`)
  await page.getByRole('button', { name: 'Comparar anúncio', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Remover da comparação', exact: true })).toBeVisible()
  await page.goto(`/produtos/${consoleProduct.id}`)
  await page.getByRole('button', { name: 'Comparar anúncio', exact: true }).click()
  await expect(page.getByText(/Sua comparação é de Notebooks\./)).toBeVisible()
  await page.goto('/comparar')
  await expect(page.getByRole('table')).toContainText(productName)
  await expect(page.getByRole('table')).not.toContainText(consoleName)
  await enter(page, technician.token, `/produtos/${product.id}`)
  await page.getByRole('button', { name: 'Iniciar pedido', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Revise seu pedido', exact: true })).toBeVisible()
  await expect(page.getByText('Os itens são digitais.', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Registrar pedido', exact: true }).click()
  await page.getByRole('link', { name: 'Abrir pedido', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Combine os detalhes do pedido', exact: true })).toBeVisible()
  await page.getByRole('link', { name: /^Conversar com / }).click()
  await expect(page.getByRole('link', { name: /^Voltar ao pedido #/ })).toBeVisible()
  const contract = await api(request, 'post', '/contratacoes', owner.token, { servico_id: providerService, descricao_problema: 'Solicito suporte técnico para configurar este equipamento de demonstração.', modalidade: 'remoto', urgencia: 'normal', disponibilidade: 'Durante a tarde' }, 201)
  await enter(page, technician.token, '/contratacoes')
  await expect(page.getByRole('heading', { name: 'Contratações em um só lugar', exact: true })).toBeVisible()
  await expect(page.getByRole('main')).toHaveCount(1)
  await page.getByRole('button', { name: 'Montar orçamento', exact: true }).click()
  await page.getByLabel('Valor final', { exact: true }).fill('100')
  await page.getByLabel('Prazo de execução', { exact: true }).fill('1 dia')
  await page.getByLabel('Garantia em dias', { exact: true }).fill('30')
  await page.getByLabel('Escopo detalhado', { exact: true }).fill('Configuração inicial e conferência do equipamento de demonstração.')
  await page.getByRole('button', { name: 'Enviar orçamento ao cliente', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Editar orçamento', exact: true })).toBeVisible()
  await feedbackContrast(page)
  await enter(page, owner.token, '/contratacoes')
  await page.getByRole('button', { name: 'Aceitar proposta', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Aceitar proposta', exact: true })).toHaveCount(0)
  await enter(page, technician.token, '/contratacoes')
  await page.getByRole('button', { name: 'Iniciar serviço', exact: true }).click()
  await page.getByRole('button', { name: 'Marcar como concluído', exact: true }).click()
  await expect(page.getByText('Garantia EHtech registrada', { exact: true })).toBeVisible()
  await enter(page, owner.token, '/contratacoes')
  await page.getByRole('button', { name: 'Avaliar atendimento', exact: true }).click()
  await page.getByRole('button', { name: '5 estrelas', exact: true }).click()
  await page.getByLabel('Conte como foi a experiência (opcional)', { exact: true }).fill('Atendimento fictício concluído para verificar a apresentação.')
  await page.getByRole('button', { name: 'Publicar avaliação', exact: true }).click()
  await expect(page.getByText('Sua avaliação técnica', { exact: true })).toBeVisible()
})
