const { test, expect } = require('@playwright/test')

async function setCatalog(page, count = 3) {
  const origin = process.env.E2E_BASE_URL
  const items = [
    { id_produto: 302, nome: 'Nintendo Switch com dock', categoria: 'games', preco: 1490, estoque: 4, imagem: origin + '/demo/products/nintendo-switch.jpg' },
    { id_produto: 301, nome: 'Lenovo ThinkPad T480', categoria: 'notebooks', preco: 1690, estoque: 2, imagem: origin + '/demo/products/thinkpad-t480.jpg' },
    { id_produto: 300, nome: 'Anúncio esgotado', categoria: 'smartphones', preco: 100, estoque: 0 }
  ].slice(0, count)
  await page.route(url => url.pathname.endsWith('/produtos/catalogo') && url.searchParams.get('limit') === '24', route => route.fulfill({ json: { items } }))
}

test('destaques da inicial giram e oferecem pausa e navegação manual', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.clock.install()
  await setCatalog(page)
  await page.goto('/')
  const carousel = page.getByRole('region', { name: 'Anúncios em destaque' })
  const title = carousel.getByRole('heading')
  await expect(title).toHaveText('Nintendo Switch com dock')
  await expect(carousel).toContainText('1 de 2 anúncios')
  await page.clock.fastForward(6600)
  await expect(title).toHaveText('Lenovo ThinkPad T480')
  await expect(carousel.getByRole('link')).toHaveAttribute('href', /\/produtos\/301/)
  const pause = carousel.getByRole('button', { name: 'Pausar rotação' })
  await pause.focus()
  await page.keyboard.press('Enter')
  await page.clock.fastForward(7000)
  await expect(title).toHaveText('Lenovo ThinkPad T480')
  await carousel.getByRole('button', { name: 'Próximo anúncio' }).click()
  await expect(title).toHaveText('Nintendo Switch com dock')
  await carousel.getByRole('button', { name: 'Anúncio anterior' }).click()
  await expect(title).toHaveText('Lenovo ThinkPad T480')
  const font = await page.getByRole('heading', { level: 1 }).evaluate(async el => {
    const style = getComputedStyle(el)
    const familyName = value => value.split(',')[0].replace(/['"]/g, '').trim()
    const family = familyName(style.getPropertyValue('--font-home-display'))
    if (!family) return { family, applied: false, loaded: false }
    const faces = await document.fonts.load('650 32px "' + family + '"')
    return { family, applied: familyName(style.fontFamily) === family, loaded: faces.some(face => face.status === 'loaded') }
  })
  expect(font).toMatchObject({ applied: true, loaded: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
  await page.screenshot({ path: info.outputPath('inicial-ehtech.png') })
})

test('destaques da inicial respeitam movimento reduzido e um item não exibe controles', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.clock.install()
  await setCatalog(page)
  await page.goto('/')
  const carousel = page.getByRole('region', { name: 'Anúncios em destaque' })
  await expect(carousel.getByRole('button', { name: 'Iniciar rotação' })).toBeVisible()
  await page.clock.fastForward(14000)
  await expect(carousel.getByRole('heading')).toHaveText('Nintendo Switch com dock')
  await page.unrouteAll()
  await setCatalog(page, 1)
  await page.reload()
  await expect(carousel.getByRole('heading')).toHaveText('Nintendo Switch com dock')
  await expect(carousel.getByRole('button')).toHaveCount(0)
})
