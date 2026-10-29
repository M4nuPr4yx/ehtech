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

test('SDK de armazenamento corrigido mantém upload e exclusão sem acesso a serviços reais', async () => {
  const { MockAgent, getGlobalDispatcher, setGlobalDispatcher } = require('undici')
  const { saveImage, deleteImage } = require('../backend/media')
  const previousDispatcher = getGlobalDispatcher()
  const previous = { BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN, VERCEL_BLOB_API_URL: process.env.VERCEL_BLOB_API_URL }
  const mock = new MockAgent()
  mock.disableNetConnect()
  setGlobalDispatcher(mock)
  process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_ficticiostore_somente-teste'
  process.env.VERCEL_BLOB_API_URL = 'https://vercel.com/api/blob'
  const pathname = 'uploads/img-1-local.png'
  const url = `https://ficticiostore.public.blob.vercel-storage.com/${pathname}`
  const server = mock.get('https://vercel.com')
  server.intercept({ path: '/api/blob/?pathname=uploads%2Fimg-1-local.png', method: 'PUT' })
    .reply(200, { pathname, url, downloadUrl: url, contentType: 'image/png', contentDisposition: 'inline' }, { headers: { 'content-type': 'application/json' } })
  server.intercept({ path: '/api/blob/delete', method: 'POST', body: JSON.stringify({ urls: [pathname] }) }).reply(200, {})
  try {
    const image = await saveImage({ buffer: png, filename: 'img-1-local.png', contentType: 'image/png' })
    assert.deepEqual(image, { url, filename: pathname, persistent: true })
    assert.equal(await deleteImage(pathname), true)
    mock.assertNoPendingInterceptors()
  } finally {
    setGlobalDispatcher(previousDispatcher)
    await mock.close()
    for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value }
  }
})
