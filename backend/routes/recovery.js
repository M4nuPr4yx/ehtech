const createRouter = require('./router')
const { autenticarToken, verifyAdmin } = require('../middleware/auth')
const bcrypt = require('bcrypt')
const crypto = require('crypto')
const nodemailer = require('nodemailer')
const validator = require('validator')
const { isValidPassword } = require('../user-validation')
module.exports = function createRecoveryRouter(pool, { passwordResetLimiter }) {
const router = createRouter()
const emailEnabled = !!(process.env.SMTP_HOST && process.env.SMTP_USER)
const transporter = emailEnabled ? nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS || ''
  }
}) : null

router.post('/esqueci-senha', passwordResetLimiter, async (req, res) => {
  const { email } = req.body
  if (typeof email !== 'string' || !validator.isEmail(email.trim())) {
    return res.status(400).json({ mensagem: 'Informe um e-mail válido' })
  }

  const normalizedEmail = email.trim().toLowerCase()

  try {
    const [users] = await pool.execute('SELECT id_usuario FROM usuarios WHERE email = ?', [normalizedEmail])

    // Resposta idêntica para evitar enumeração de contas
    const genericResponse = { mensagem: 'Se o e-mail estiver cadastrado, você receberá o link de recuperação.' }

    if (users.length === 0) {
      return res.json(genericResponse)
    }

    await pool.execute('DELETE FROM password_resets WHERE email = ?', [normalizedEmail])

    const tokenRaw = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(tokenRaw).digest('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hora

    await pool.execute(
      'INSERT INTO password_resets (email, token_hash, expires_at) VALUES (?, ?, ?)',
      [normalizedEmail, tokenHash, expiresAt]
    )

    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3001').replace(/\/+$/, '')
    const resetLink = `${frontendUrl}/redefinir-senha?token=${tokenRaw}`

    if (emailEnabled && transporter) {
      try {
        await transporter.sendMail({
          from: `"EHtech" <${process.env.SMTP_USER}>`,
          to: normalizedEmail,
          subject: 'Redefinição de Senha - EHtech',
          html: `
            <h2>Redefinição de Senha</h2>
            <p>Você solicitou a redefinição de senha da sua conta EHtech.</p>
            <p>Clique no botão abaixo para criar uma nova senha. O link expira em 1 hora.</p>
            <p><a href="${resetLink}" style="display:inline-block;padding:10px 20px;background-color:#ABDB25;color:#000;font-weight:bold;text-decoration:none;border-radius:8px;">Redefinir Senha</a></p>
            <p>Ou acesse diretamente: <br><a href="${resetLink}">${resetLink}</a></p>
            <p>Se você não solicitou, ignore esta mensagem com segurança.</p>
          `
        })
      } catch (mailErr) {
        console.error('[esqueci-senha] Falha no envio de e-mail:', mailErr.message)
      }
    } else {
      console.log(`\n[DEV MODE - RECUPERAÇÃO DE SENHA] Link para ${normalizedEmail}:\n${resetLink}\n`)
    }

    return res.json(genericResponse)
  } catch (error) {
    console.error('[esqueci-senha] Erro:', error.message)
    return res.status(500).json({ mensagem: 'Erro ao processar solicitação' })
  }
})

router.get('/verificar-token/:token', async (req, res) => {
  const { token } = req.params
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ valido: false, mensagem: 'Token ausente' })
  }

  try {
    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex')
    const [rows] = await pool.execute(
      'SELECT email FROM password_resets WHERE token_hash = ? AND expires_at > NOW()',
      [tokenHash]
    )

    if (rows.length === 0) {
      return res.json({ valido: false, mensagem: 'Token inválido ou expirado' })
    }

    return res.json({ valido: true, email: rows[0].email })
  } catch (error) {
    console.error('[verificar-token] Erro:', error.message)
    return res.status(500).json({ valido: false, mensagem: 'Erro ao verificar token' })
  }
})

router.post('/redefinir-senha', passwordResetLimiter, async (req, res) => {
  const { token, novaSenha } = req.body

  if (!token || !novaSenha) {
    return res.status(400).json({ mensagem: 'Token e nova senha são obrigatórios' })
  }

  if (!isValidPassword(novaSenha)) {
    return res.status(400).json({ mensagem: 'A nova senha deve ter no mínimo 8 caracteres' })
  }

  try {
    const tokenHash = crypto.createHash('sha256').update(String(token).trim()).digest('hex')
    const hash = await bcrypt.hash(novaSenha, 10)
    const changed = await require('../addresses').transaction(pool, async connection => {
      const [rows] = await connection.execute('SELECT id, email FROM password_resets WHERE token_hash = ? AND expires_at > NOW() FOR UPDATE', [tokenHash])
      if (!rows.length) return false
      await connection.execute('UPDATE usuarios SET senha = ?, session_version = session_version + 1 WHERE email = ?', [hash, rows[0].email])
      await connection.execute('DELETE FROM password_resets WHERE email = ?', [rows[0].email])
      return true
    })
    if (!changed) return res.status(400).json({ mensagem: 'Token de redefinição inválido ou expirado' })

    return res.json({ mensagem: 'Senha redefinida com sucesso! Faça login com a nova senha.' })
  } catch (error) {
    console.error('[redefinir-senha] Erro:', error.message)
    return res.status(500).json({ mensagem: 'Erro ao redefinir senha' })
  }
})

// ==========================================
// 14. MENSAGENS PRIVADAS (CHAT MARKETPLACE)
// ==========================================

// Enviar mensagem para outro usuário
return router
}
