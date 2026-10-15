const express = require('express')
const multer = require('multer')
const path = require('path')
const { autenticarToken } = require('../middleware/auth')
const { ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES, MAX_IMAGE_SIZE, matchesImageType, extensionFor, createImageFilename, usesBlobStorage, saveImage, deleteImage } = require('../media')

const router = express.Router()

function validateFile(file) {
  const ext = path.extname(file?.originalname || '').toLowerCase()
  return Boolean(file && ALLOWED_MIME_TYPES.has(file.mimetype) && ALLOWED_EXTENSIONS.has(ext) && matchesImageType(file.buffer, file.mimetype))
}

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase()
  if (ALLOWED_MIME_TYPES.has(file.mimetype) && ALLOWED_EXTENSIONS.has(ext)) return cb(null, true)
  return cb(new Error('Tipo de arquivo não permitido. Use apenas imagens JPG, PNG ou WEBP.'))
}
const upload = multer({ storage: multer.memoryStorage(), fileFilter, limits: { fileSize: MAX_IMAGE_SIZE, files: 1 } })
const uploadMultiple = multer({ storage: multer.memoryStorage(), fileFilter, limits: { fileSize: MAX_IMAGE_SIZE, files: 8 } })

function handleMulterError(uploadMiddleware) {
  return (req, res, next) => uploadMiddleware(req, res, error => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ erro: 'Arquivo muito grande. O limite máximo é de 4MB.' })
    if (error) return res.status(400).json({ erro: error.message || 'Erro ao processar arquivo.' })
    const files = req.file ? [req.file] : req.files || []
    if (!files.every(validateFile)) return res.status(400).json({ erro: 'O conteúdo do arquivo não corresponde a uma imagem JPG, PNG ou WEBP.' })
    next()
  })
}

async function persist(file, ownerId) {
  const filename = createImageFilename(ownerId, 'produto', extensionFor(file))
  const saved = await saveImage({ buffer: file.buffer, filename, contentType: file.mimetype })
  return { url: saved.url, filename: path.basename(saved.filename), tamanho: file.size, tipo: file.mimetype }
}

router.post('/imagem', autenticarToken, handleMulterError(upload.single('imagem')), async (req, res) => {
  if (!req.file) return res.status(400).json({ erro: 'Nenhuma imagem enviada' })
  try {
    const image = await persist(req.file, req.user.id)
    return res.json({ sucesso: true, ...image })
  } catch (error) {
    console.error('[upload] Erro ao salvar imagem:', error.message)
    return res.status(503).json({ erro: 'Não foi possível salvar a imagem agora. Tente novamente.' })
  }
})

router.post('/imagens', autenticarToken, handleMulterError(uploadMultiple.array('imagens', 8)), async (req, res) => {
  if (!req.files?.length) return res.status(400).json({ erro: 'Nenhuma imagem enviada' })
  try {
    const arquivos = []
    for (const file of req.files) arquivos.push(await persist(file, req.user.id))
    return res.json({ sucesso: true, urls: arquivos.map(file => file.url), arquivos, total: arquivos.length })
  } catch (error) {
    console.error('[upload/imagens] Erro ao salvar imagens:', error.message)
    return res.status(503).json({ erro: 'Não foi possível salvar as imagens agora. Tente novamente.' })
  }
})

router.post('/imagem-base64', autenticarToken, async (req, res) => {
  const match = typeof req.body?.imagem === 'string' && req.body.imagem.match(/^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/i)
  if (!match) return res.status(400).json({ erro: 'Formato base64 inválido ou tipo de imagem não suportado. Use JPG, PNG ou WEBP.' })
  const format = match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase()
  const buffer = Buffer.from(match[2], 'base64')
  const mimetype = format === 'jpg' ? 'image/jpeg' : `image/${format}`
  if (buffer.length > 3 * 1024 * 1024 || !matchesImageType(buffer, mimetype) || buffer.toString('base64').replace(/=+$/, '') !== match[2].replace(/=+$/, '')) return res.status(400).json({ erro: 'Conteúdo base64 inválido ou maior que 3MB.' })
  try {
    const filename = createImageFilename(req.user.id, 'produto', `.${format}`)
    const saved = await saveImage({ buffer, filename, contentType: mimetype })
    return res.json({ sucesso: true, url: saved.url, filename: path.basename(saved.filename), tamanho: buffer.length })
  } catch (error) {
    console.error('[upload-base64] Erro:', error.message)
    return res.status(503).json({ erro: 'Não foi possível salvar a imagem agora. Tente novamente.' })
  }
})

router.post('/imagem-url', autenticarToken, async (req, res) => {
  if (typeof req.body?.url !== 'string') return res.status(400).json({ erro: 'URL não fornecida' })
  try {
    const url = new URL(req.body.url.trim())
    const validExt = [...ALLOWED_EXTENSIONS].some(extension => url.pathname.toLowerCase().endsWith(extension))
    if (!['http:', 'https:'].includes(url.protocol) || (!validExt && !url.pathname.includes('/uploads/'))) throw Error()
    return res.json({ sucesso: true, url: url.toString(), tipo: 'url_externa' })
  } catch {
    return res.status(400).json({ erro: 'URL deve apontar para uma imagem JPG, PNG ou WEBP via HTTP(S).' })
  }
})

router.delete('/imagem/:filename', autenticarToken, async (req, res) => {
  const filename = String(req.params.filename || '').replace(/^\/+/, '')
  const allowed = filename.startsWith(`img-${req.user.id}-`) || filename.startsWith(`perfil-${req.user.id}-`)
  if (!allowed || /(^|\/)\.\.($|\/)/.test(filename)) return res.status(403).json({ erro: 'Você só pode remover imagens enviadas pela sua conta.' })
  try {
    const storageFilename = usesBlobStorage() ? `uploads/${filename}` : filename
    if (!await deleteImage(storageFilename)) return res.status(404).json({ erro: 'Arquivo não encontrado' })
    return res.json({ sucesso: true, mensagem: 'Arquivo removido com sucesso' })
  } catch (error) {
    console.error('[upload/delete] Erro:', error.message)
    return res.status(503).json({ erro: 'Não foi possível remover a imagem agora. Tente novamente.' })
  }
})

module.exports = router
