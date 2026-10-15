const { test } = require('node:test')
const assert = require('node:assert/strict')
const {
  MAX_IMAGE_SIZE,
  extensionFor,
  matchesImageType,
  usesBlobStorage
} = require('../backend/media')

const png = Buffer.from('89504e470d0a1a0a00000000', 'hex')

test('armazenamento persistente só é ativado com token do Blob', () => {
  assert.equal(usesBlobStorage({}), false)
  assert.equal(usesBlobStorage({ BLOB_READ_WRITE_TOKEN: '   ' }), false)
  assert.equal(usesBlobStorage({ BLOB_READ_WRITE_TOKEN: 'vercel_blob_rw_123' }), true)
})

test('uploads aceitam apenas assinaturas de imagem e extensões seguras', () => {
  assert.equal(MAX_IMAGE_SIZE, 4 * 1024 * 1024)
  assert.equal(matchesImageType(png, 'image/png'), true)
  assert.equal(matchesImageType(Buffer.from('<script>'), 'image/png'), false)
  assert.equal(extensionFor({ originalname: 'foto.JPEG', mimetype: 'image/jpeg' }), '.jpg')
  assert.equal(extensionFor({ originalname: 'arquivo.exe', mimetype: 'image/webp' }), '.webp')
})
