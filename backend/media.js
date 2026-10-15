const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp'])
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_IMAGE_SIZE = 4 * 1024 * 1024

function matchesImageType(buffer, mime) {
  if (!Buffer.isBuffer(buffer)) return false
  if (mime === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))
  if (mime === 'image/jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  if (mime === 'image/webp') return buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP'
  return false
}

function extensionFor({ originalname = '', mimetype = '' } = {}) {
  const extension = path.extname(originalname).toLowerCase()
  if (ALLOWED_EXTENSIONS.has(extension)) return extension === '.jpeg' ? '.jpg' : extension
  return mimetype === 'image/png' ? '.png' : mimetype === 'image/webp' ? '.webp' : '.jpg'
}

function createImageFilename(ownerId, kind, extension) {
  const prefix = kind === 'perfil' ? 'perfil' : 'img'
  return `${prefix}-${ownerId}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}${extension}`
}

function usesBlobStorage(env = process.env) {
  return typeof env.BLOB_READ_WRITE_TOKEN === 'string' && env.BLOB_READ_WRITE_TOKEN.trim().length > 0
}

async function saveImage({ buffer, filename, contentType }) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0 || buffer.length > MAX_IMAGE_SIZE || !matchesImageType(buffer, contentType)) throw new Error('Imagem inválida ou maior que 4MB.')
  if (usesBlobStorage()) {
    const { put } = require('@vercel/blob')
    const blob = await put(`uploads/${filename}`, buffer, { access: 'public', addRandomSuffix: false, contentType, cacheControlMaxAge: 60 * 60 * 24 * 365 })
    return { url: blob.url, filename: blob.pathname, persistent: true }
  }
  const { uploadsDir } = require('./uploads')
  const target = path.resolve(uploadsDir, filename)
  if (!target.startsWith(uploadsDir + path.sep)) throw new Error('Caminho de upload inválido.')
  fs.writeFileSync(target, buffer, { flag: 'wx' })
  return { url: `/uploads/${filename}`, filename, persistent: false }
}

async function deleteImage(filename) {
  if (usesBlobStorage()) {
    const pathname = String(filename || '').replace(/^\/+/, '')
    if (!pathname.startsWith('uploads/')) return false
    const { del } = require('@vercel/blob')
    await del(pathname)
    return true
  }
  const { uploadsDir } = require('./uploads')
  const target = path.resolve(uploadsDir, filename)
  if (!target.startsWith(uploadsDir + path.sep) || !fs.existsSync(target)) return false
  fs.unlinkSync(target)
  return true
}

module.exports = { ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES, MAX_IMAGE_SIZE, matchesImageType, extensionFor, createImageFilename, usesBlobStorage, saveImage, deleteImage }
