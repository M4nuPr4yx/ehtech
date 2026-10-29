const { test, expect } = require('@playwright/test')

test('fundo com imagem local anima suavemente e respeita movimento reduzido nos temas', async ({ page, request }, info) => {
  const image = await request.get('/backgrounds/green-circuit.webp')
  expect(image.ok()).toBeTruthy(); expect((await image.body()).length).toBeLessThan(30000)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  const background = page.locator('[data-ambient-background]')
  await expect(background).toHaveAttribute('aria-hidden', 'true')
  await expect(background).toHaveCSS('pointer-events', 'none')
  const scene = background.locator('div').first()
  await expect(scene).toHaveCSS('background-image', /green-circuit\.webp/)
  expect(await scene.evaluate(node => getComputedStyle(node).animationName)).not.toBe('none')
  for (const theme of ['Escuro', 'Oceano', 'Aurora', 'Claro']) {
    await page.getByRole('button', { name: 'Escolher tema', exact: true }).click()
    await page.getByRole('group', { name: 'Temas de aparência' }).getByRole('button', { name: new RegExp(theme) }).click()
    await expect(page.getByRole('heading', { name: 'O que você quer fazer?' })).toBeVisible()
    const colors = { Escuro: 'rgb(237, 242, 247)', Oceano: 'rgb(237, 246, 252)', Aurora: 'rgb(244, 240, 252)', Claro: 'rgb(32, 43, 54)' }
    await expect(page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Início', exact: true })).toHaveCSS('color', colors[theme])
    await page.screenshot({ path: info.outputPath(`fundo-${theme}.png`) })
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const layer of await background.locator('div').all()) await expect(layer).toHaveCSS('animation-name', 'none')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
})
