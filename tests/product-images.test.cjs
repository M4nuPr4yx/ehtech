const { test } = require('node:test')
const assert = require('node:assert/strict')

test('capa de produto aceita galeria JSON, lista e imagem legada', async () => {
  const { getMainImage, getProductImages } = await import('../src/app/complements/imageHelper.js')
  const urls = ['/uploads/first.png', '/uploads/second.png']
  assert.equal(getMainImage(JSON.stringify(urls)), urls[0])
  assert.equal(getMainImage(urls), urls[0])
  assert.equal(getMainImage(urls[0]), urls[0])
  assert.deepEqual(getProductImages(JSON.stringify(urls)), urls)
  assert.equal(getMainImage('[invalid]'), '')
})
