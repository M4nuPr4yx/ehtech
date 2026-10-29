const { test } = require('node:test')
const assert = require('node:assert/strict')
const { normalizeProfileName } = require('../backend/profile-name')

test('nome público permite acentos, apelidos e espaços sem truncar entradas inválidas', () => {
  assert.equal(normalizeProfileName('  Jose\u0301  da  Silva '), 'José da Silva')
  assert.equal(normalizeProfileName("D’Ávila"), 'D’Ávila')
  assert.equal(normalizeProfileName('Li'), 'Li')
  assert.equal(normalizeProfileName('á'.repeat(80)), 'á'.repeat(80))
  for (const value of [null, {}, 123, '', ' ', 'A', 'a'.repeat(81), '<script>oi</script>', 'Ana\nSilva', 'Ana\u200bSilva']) assert.equal(normalizeProfileName(value), null)
})
