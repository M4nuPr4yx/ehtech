const { test } = require('node:test')
const assert = require('node:assert/strict')
test('comparação tolera armazenamento inválido e limita a quatro IDs distintos válidos', async () => {
  const { comparisonIds } = await import('../src/lib/comparison.mjs')
  for (const raw of ['{', '{}', 'null', '"texto"', '']) assert.deepEqual(comparisonIds(raw), [])
  assert.deepEqual(comparisonIds('[1,1,0,-2,"3",2,3,4,5,1.2,null]'), [1, 2, 3, 4])
})

test('seleção antiga é agrupada pela categoria atual sem misturar tipos de anúncio', async () => {
  const { comparisonGroups } = await import('../src/lib/comparison.mjs')
  const products = [
    { id_produto: 1, categoria: ' Áudio ' }, { id_produto: 2, categoria: 'audio' },
    { id_produto: 3, categoria: 'notebooks' }, { id_produto: 4 }, null,
  ]
  const groups = comparisonGroups(products)
  assert.deepEqual([...groups.keys()], ['audio', 'notebooks'])
  assert.deepEqual(groups.get('audio').map(product => product.id_produto), [1, 2])
  assert.deepEqual(groups.get('notebooks').map(product => product.id_produto), [3])
})
