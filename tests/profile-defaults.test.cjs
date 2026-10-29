const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { fotos, foto, profilePhoto, defaultProfilePhoto, isDefaultProfilePhoto } = require('../shared/profile-defaults.cjs')

test('paisagens variam entre contas e permanecem estáveis no acesso e na troca de nome', () => {
  const accounts = Array.from({ length: 12 }, (_, index) => ({ id_usuario: index + 1, foto: null }))
  assert.equal(new Set(accounts.map(profilePhoto)).size, 6)
  for (const account of accounts) {
    assert.equal(profilePhoto(account), profilePhoto({ ...account, nome: 'Nome atualizado' }))
    assert.equal(profilePhoto({ ...account, foto }), profilePhoto(account), 'Padrão antigo deve entrar na distribuição sem migrar o banco')
    assert.equal(defaultProfilePhoto(String(account.id_usuario)), profilePhoto(account))
  }
  for (const id of [undefined, null, 0, -1, 1.5, Infinity, 'inválido']) assert.equal(defaultProfilePhoto(id), foto)
})

test('fotos personalizadas são preservadas e somente os assets conhecidos são padrões', () => {
  for (const custom of ['/uploads/minha-foto.webp', 'https://example.test/custom.jpg', 'data:image/png;base64,AAAA']) assert.equal(profilePhoto({ id_usuario: 3, foto: custom }), custom)
  assert.equal(isDefaultProfilePhoto('/profile/desconhecida.webp'), false)
  assert.equal(isDefaultProfilePhoto('/profile/environment-forest.webp?extra=1'), false)
  for (const asset of fotos) {
    assert.equal(isDefaultProfilePhoto(asset), true)
    assert.ok(fs.statSync(path.join(__dirname, '../public', asset)).size < 60000)
  }
})
