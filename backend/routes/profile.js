const createRouter = require('./router')
const { autenticarToken, verifyAdmin } = require('../middleware/auth')
const bcrypt = require('bcrypt')
const path = require('path')
const multer = require('multer')
const { isValidPassword, isAllowedUserEmail } = require('../user-validation')
const { ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES, MAX_IMAGE_SIZE, matchesImageType, extensionFor, createImageFilename, saveImage } = require('../media')
module.exports = function createProfileRouter(pool) {
const router = createRouter()
router.get("/perfil", autenticarToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id_usuario, username, email, role, nome, foto, data_criacao FROM usuarios WHERE id_usuario = ?',
      [req.user.id]
    )
    if (rows.length === 0) {
      return res.status(404).json({ mensagem: "Usuário não encontrado" })
    }
    return res.json(rows[0])
  } catch (error) {
    console.error('[perfil] Erro:', error.message)
    return res.status(500).json({ mensagem: "Erro ao buscar perfil" })
  }
})

// Perfil público do vendedor (sem expor email/hash)
router.get('/usuarios/busca', autenticarToken, async (req, res) => {
  res.set('Cache-Control', 'no-store')
  try {
    const { page, limit, where, params, order, orderParams } = require('../user-search').userSearch(req.query, req.user.id)
    const [[[count]], [items]] = await Promise.all([
      pool.execute(`SELECT COUNT(*) AS total FROM usuarios WHERE ${where}`, params),
      pool.execute(`SELECT id_usuario, username, nome, foto FROM usuarios WHERE ${where} ORDER BY ${order} LIMIT ? OFFSET ?`, [...params, ...orderParams, limit, (page - 1) * limit])
    ])
    res.json({ items, total: Number(count.total), page, limit, totalPages: Math.min(100, Math.max(1, Math.ceil(Number(count.total) / limit))) })
  } catch (error) {
    if (!error.status) console.error('[usuarios/busca] Falha ao buscar usuários.')
    res.status(error.status || 500).json({ mensagem: error.status ? error.message : 'Não foi possível buscar usuários. Tente novamente.' })
  }
})

router.get("/usuarios/:id/publico", async (req, res) => {
  const numericId = parseInt(req.params.id, 10)
  if (isNaN(numericId)) {
    return res.status(400).json({ mensagem: "ID inválido" })
  }

  try {
    const [rows] = await pool.execute(
      'SELECT id_usuario, username, nome, foto, data_criacao FROM usuarios WHERE id_usuario = ?',
      [numericId]
    )
    if (rows.length === 0) {
      return res.status(404).json({ mensagem: "Vendedor não encontrado" })
    }
    return res.json(rows[0])
  } catch (error) {
    console.error('[usuarios/publico] Erro:', error.message)
    return res.status(500).json({ mensagem: "Erro ao buscar dados do vendedor" })
  }
})

router.put("/perfil", autenticarToken, async (req, res) => {
  const { nome } = req.body
  const cleanNome = nome ? String(nome).trim().slice(0, 255) : null
  try {
    await pool.execute('UPDATE usuarios SET nome = ? WHERE id_usuario = ?', [cleanNome, req.user.id])
    return res.json({ mensagem: "Perfil atualizado com sucesso" })
  } catch (error) {
    console.error('[perfil/update] Erro:', error.message)
    return res.status(500).json({ mensagem: "Erro ao atualizar perfil" })
  }
})

// Multer configurado com validação estrita para foto de perfil
const uploadPerfil = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase()
    if (ALLOWED_MIME_TYPES.has(file.mimetype) && ALLOWED_EXTENSIONS.has(ext)) {
      cb(null, true)
    } else {
      cb(new Error('Apenas imagens JPG, PNG ou WEBP são permitidas'))
    }
  },
  limits: { fileSize: MAX_IMAGE_SIZE }
})

// Middleware seguro: AUTENTICAR ANTES do Multer
router.put("/perfil/foto", autenticarToken, (req, res, next) => {
  uploadPerfil.single('foto')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ mensagem: err.message || 'Erro no upload da foto' })
    }
    next()
  })
}, async (req, res) => {
  if (req.file) {
    try {
      if (!matchesImageType(req.file.buffer, req.file.mimetype)) return res.status(400).json({ mensagem: 'O conteúdo do arquivo não corresponde a uma imagem válida.' })
      const filename = createImageFilename(req.user.id, 'perfil', extensionFor(req.file))
      const saved = await saveImage({ buffer: req.file.buffer, filename, contentType: req.file.mimetype })
      const fotoUrl = saved.url
      await pool.execute('UPDATE usuarios SET foto = ? WHERE id_usuario = ?', [fotoUrl, req.user.id])
      return res.json({ mensagem: "Foto atualizada com sucesso", foto: fotoUrl })
    } catch (err) {
      console.error('[perfil/foto] Erro:', err.message)
      return res.status(500).json({ mensagem: "Erro ao atualizar foto no perfil" })
    }
  }

  const { foto } = req.body
  try {
    let cleanFoto = null
    if (foto && typeof foto === 'string') {
      const trimmed = foto.trim()
      if (trimmed.startsWith('data:image/') || trimmed.startsWith('http') || trimmed.startsWith('/uploads/')) {
        cleanFoto = trimmed
      }
    }
    await pool.execute('UPDATE usuarios SET foto = ? WHERE id_usuario = ?', [cleanFoto, req.user.id])
    return res.json({ mensagem: "Foto atualizada com sucesso", foto: cleanFoto })
  } catch (error) {
    console.error('[perfil/foto] Erro:', error.message)
    return res.status(500).json({ mensagem: "Erro ao atualizar foto" })
  }
})

router.put("/perfil/senha", autenticarToken, async (req, res) => {
  const { senhaAtual, novaSenha } = req.body

  if (typeof senhaAtual !== 'string' || !senhaAtual || !novaSenha) {
    return res.status(400).json({ mensagem: "Senha atual e nova senha são obrigatórias" })
  }

  if (!isValidPassword(novaSenha)) {
    return res.status(400).json({ mensagem: "A nova senha deve ter no mínimo 8 caracteres" })
  }

  try {
    const [rows] = await pool.execute('SELECT senha FROM usuarios WHERE id_usuario = ?', [req.user.id])
    if (rows.length === 0) {
      return res.status(404).json({ mensagem: "Usuário não encontrado" })
    }

    const validou = await bcrypt.compare(senhaAtual, rows[0].senha)
    if (!validou) {
      return res.status(400).json({ mensagem: "Senha atual incorreta" })
    }

    const hash = await bcrypt.hash(novaSenha, 10)
    await pool.execute('UPDATE usuarios SET senha = ?, senha_definida = TRUE, session_version = session_version + 1 WHERE id_usuario = ?', [hash, req.user.id])
    return res.json({ mensagem: "Senha alterada com sucesso! Faça login novamente." })
  } catch (error) {
    console.error('[perfil/senha] Erro:', error.message)
    return res.status(500).json({ mensagem: "Erro ao alterar senha" })
  }
})

router.put("/perfil/email", autenticarToken, async (req, res) => {
  const { novoEmail, senha } = req.body

  if (!novoEmail || typeof senha !== 'string' || !senha) {
    return res.status(400).json({ mensagem: "Novo e-mail e senha são obrigatórios" })
  }

  if (!isAllowedUserEmail(novoEmail)) {
    return res.status(400).json({ mensagem: "Use um e-mail válido (@hotmail.com, @gmail.com ou @outlook.com)" })
  }

  const normalizedEmail = novoEmail.trim().toLowerCase()

  try {
    const [rows] = await pool.execute('SELECT senha FROM usuarios WHERE id_usuario = ?', [req.user.id])
    if (rows.length === 0) {
      return res.status(404).json({ mensagem: "Usuário não encontrado" })
    }

    const validou = await bcrypt.compare(senha, rows[0].senha)
    if (!validou) {
      return res.status(400).json({ mensagem: "Senha incorreta" })
    }

    const [existing] = await pool.execute('SELECT id_usuario FROM usuarios WHERE email = ? AND id_usuario != ?', [normalizedEmail, req.user.id])
    if (existing.length > 0) {
      return res.status(409).json({ mensagem: "Este e-mail já está em uso por outra conta" })
    }

    await pool.execute('UPDATE usuarios SET email = ? WHERE id_usuario = ?', [normalizedEmail, req.user.id])
    return res.json({ mensagem: "E-mail alterado com sucesso! Faça login novamente.", novoEmail: normalizedEmail })
  } catch (error) {
    console.error('[perfil/email] Erro:', error.message)
    return res.status(500).json({ mensagem: "Erro ao alterar e-mail" })
  }
})
return router
}
