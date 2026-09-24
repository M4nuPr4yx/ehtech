const path = require('node:path')
const fs = require('node:fs')
const os = require('node:os')

const uploadsDir = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : process.env.VERCEL ? path.join(os.tmpdir(), 'uploads') : path.join(__dirname, 'uploads')
fs.mkdirSync(uploadsDir, { recursive: true })

module.exports = { uploadsDir }
