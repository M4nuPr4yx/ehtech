const createRouter = require('./router')
const { autenticarToken, verifyAdmin } = require('../middleware/auth')
const { hashPassword, verifyPassword, validPasswordInput } = require('../passwords')
const { createPasswordAttempts } = require('../password-attempts')
const jwt = require('jsonwebtoken')
const { isValidPassword, isAllowedUserEmail } = require('../user-validation')
module.exports = function createAuthRouter(pool, { authLimiter, api_chave }) {
const router = createRouter()
const reservePasswordAttempt = createPasswordAttempts(pool, api_chave)
function loginFailure(res, error) {
  if (error.status === 429) {
    res.set('Retry-After', String(error.retryAfter))
    return res.status(429).json({ mensagem: error.message, code: 'AUTH_RATE_LIMIT' })
  }
  console.error('[login] Não foi possível concluir a autenticação.')
  return res.status(503).json({ mensagem: 'Não foi possível entrar agora. Tente novamente em instantes.' })
}
router.use('/auth/google', require('./googleAuth')(pool, { authLimiter, api_chave }))
router.post("/cadastro", authLimiter, async (req, res) => {
  const { username, email, senha, confirmarSenha } = req.body

  if (!username || typeof username !== 'string' || username.trim().length < 3 || username.trim().length > 30) {
    return res.status(400).json({ mensagem: "Nome de usuário deve ter entre 3 e 30 caracteres!" })
  }

  const cleanUsername = username.trim()
  if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
    return res.status(400).json({ mensagem: "Nome de usuário pode conter apenas letras, números, ponto, hífen e underline." })
  }

  if (!email || !isAllowedUserEmail(email)) {
    return res.status(400).json({ mensagem: "Use um e-mail válido (@hotmail.com, @gmail.com ou @outlook.com)" })
  }

  if (!isValidPassword(senha)) {
    return res.status(400).json({ mensagem: "A senha deve ter pelo menos 8 caracteres e não pode ser muito longa." })
  }

  if (senha !== confirmarSenha) {
    return res.status(400).json({ mensagem: "As senhas não coincidem!" })
  }

  try {
    const [existingUser] = await pool.execute('SELECT id_usuario FROM usuarios WHERE username = ?', [cleanUsername])
    if (existingUser.length > 0) {
      return res.status(409).json({ mensagem: "Nome de usuário já está em uso!" })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const [existingEmail] = await pool.execute('SELECT id_usuario FROM usuarios WHERE email = ?', [normalizedEmail])
    if (existingEmail.length > 0) {
      return res.status(409).json({ mensagem: "E-mail já está em uso!" })
    }

    const hash = await hashPassword(senha)
    await pool.execute(
      "INSERT INTO usuarios (username, email, senha, role) VALUES (?, ?, ?, 'user')",
      [cleanUsername, normalizedEmail, hash]
    )

    return res.status(201).json({ mensagem: "Usuário criado com sucesso! Faça login para continuar." })
  } catch (error) {
    console.error('[cadastro] Erro interno:', error.message)
    return res.status(500).json({ mensagem: "Erro ao cadastrar usuário. Tente novamente mais tarde." })
  }
})

router.post("/login", authLimiter, async (req, res) => {
  const { email, senha } = req.body

  if (typeof email !== 'string' || !email.trim() || email.length > 254 || !validPasswordInput(senha)) {
    return res.status(400).json({ mensagem: "E-mail e senha são obrigatórios" })
  }

  const normalizedEmail = email.trim().toLowerCase()

  try {
    const attempt = await reservePasswordAttempt(req, normalizedEmail)
    const [rows] = await pool.execute('SELECT * FROM usuarios WHERE email = ?', [normalizedEmail])

    // Prevenção contra Enumeração de Usuários: mensagem genérica
    if (rows.length === 0) {
      await verifyPassword(senha, null)
      return res.status(401).json({ mensagem: "E-mail ou senha incorretos" })
    }

    const user = rows[0]
    const validou = await verifyPassword(senha, user.senha)
    if (!validou) {
      return res.status(401).json({ mensagem: "E-mail ou senha incorretos" })
    }

    await attempt.success()

    const token = jwt.sign({
      id: user.id_usuario,
      username: user.username,
      email: user.email,
      role: user.role || 'user',
      session_version: Number(user.session_version)
    }, api_chave, { expiresIn: "8h", algorithm: 'HS256' })

    return res.json({
      mensagem: "Login OK",
      token,
      username: user.username,
      email: user.email,
      userId: user.id_usuario,
      foto: user.foto || null
    })
  } catch (error) {
    return loginFailure(res, error)
  }
})

router.post("/admin/login", authLimiter, async (req, res) => {
  const { email, senha } = req.body

  if (typeof email !== 'string' || !email.trim() || email.length > 254 || !validPasswordInput(senha)) {
    return res.status(400).json({ mensagem: "Credenciais de administrador obrigatórias" })
  }

  const normalizedEmail = email.trim().toLowerCase()

  try {
    const attempt = await reservePasswordAttempt(req, normalizedEmail)
    const [rows] = await pool.execute('SELECT * FROM usuarios WHERE email = ?', [normalizedEmail])
    if (rows.length === 0 || String(rows[0].role).toLowerCase() !== 'admin') {
      await verifyPassword(senha, null)
      return res.status(401).json({ mensagem: "Credenciais de administrador inválidas" })
    }

    const adminUser = rows[0]
    const validou = await verifyPassword(senha, adminUser.senha)
    if (!validou) {
      return res.status(401).json({ mensagem: "Credenciais de administrador inválidas" })
    }

    await attempt.success()

    const token = jwt.sign({
      id: adminUser.id_usuario,
      username: adminUser.username,
      email: adminUser.email,
      role: 'admin',
      session_version: Number(adminUser.session_version)
    }, api_chave, { expiresIn: "4h", algorithm: 'HS256' })

    return res.json({ mensagem: "Admin login OK", token })
  } catch (error) {
    return loginFailure(res, error)
  }
})
return router
}
