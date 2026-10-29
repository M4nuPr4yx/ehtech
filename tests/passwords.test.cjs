const { test } = require('node:test')
const assert = require('node:assert/strict')
const bcrypt = require('bcrypt')
const { hashPassword, verifyPassword, validPasswordInput } = require('../backend/passwords')
const { isValidPassword } = require('../backend/user-validation')

test('senhas novas usam scrypt com sal único e conferem todo o conteúdo, incluindo após 72 bytes', async () => {
  const password = 'A'.repeat(80) + 'ação-🔐'
  const first = await hashPassword(password), second = await hashPassword(password)
  assert.match(first, /^scrypt\$32768\$8\$3\$/)
  assert.notEqual(first, second)
  assert.ok(first.length < 255)
  assert.equal(await verifyPassword(password, first), true)
  assert.equal(await verifyPassword('A'.repeat(80) + 'outra', first), false)
  assert.equal(await verifyPassword(password + ' ', first), false)
})

test('hashes anteriores continuam aceitos sem exigir redefinição de senha', async () => {
  const hash = await bcrypt.hash('ContaExistente-2026', 10)
  assert.equal(await verifyPassword('ContaExistente-2026', hash), true)
  assert.equal(await verifyPassword('Incorreta-2026', hash), false)
  assert.equal(await verifyPassword('Incorreta-2026', null), false)
  assert.equal(await verifyPassword('Incorreta-2026', 'scrypt$1$1$1$bad'), false)
})

test('entradas inválidas e gigantes são recusadas antes de derivar senhas', async () => {
  for (const value of [null, {}, [], '', 'á'.repeat(513)]) {
    assert.equal(validPasswordInput(value), false)
    assert.equal(isValidPassword(value), false)
    assert.equal(await verifyPassword(value, null), false)
    await assert.rejects(hashPassword(value))
  }
  assert.equal(isValidPassword('senha12'), false)
  assert.equal(isValidPassword('A'.repeat(1024)), true)
})
