const { test } = require('node:test'), assert = require('node:assert/strict')
test('metadados de anúncio têm canonical, descrição limitada e imagem pública segura', async () => {
  const { productMetadata, xmlEscape } = await import('../src/lib/seo.mjs')
  const product = { id_produto: 7, nome: 'Notebook & peças', descricao: 'Descrição '.repeat(40), imagem: '["/uploads/foto.png"]' }
  const data = productMetadata(product, 'https://ehtech.example')
  assert.equal(data.alternates.canonical, 'https://ehtech.example/produtos/7')
  assert.ok(data.description.length <= 160)
  assert.equal(data.openGraph.images[0].url, 'https://ehtech.example/uploads/foto.png')
  assert.equal(productMetadata({ ...product, imagem: 'http://127.0.0.1/privado' }, 'https://ehtech.example').openGraph.images[0].url, 'https://ehtech.example/ehtech-logo.png')
  assert.equal(xmlEscape('<x>&"'), '&lt;x&gt;&amp;&quot;')
})
