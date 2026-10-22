const { test } = require('node:test')
const assert = require('node:assert/strict')
test('comparação tolera armazenamento inválido e limita a quatro IDs distintos válidos', async () => {
  const { comparisonIds } = await import('../src/lib/comparison.mjs')
  for (const raw of ['{', '{}', 'null', '"texto"', '']) assert.deepEqual(comparisonIds(raw), [])
  assert.deepEqual(comparisonIds('[1,1,0,-2,"3",2,3,4,5,1.2,null]'), [1, 2, 3, 4])
})
