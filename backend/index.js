const express = require('express')
const mysql = require('mysql2/promise')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const crypto = require('crypto')
const nodemailer = require('nodemailer')
const porta = 3000
const app = express()
require('dotenv').config()

const api_chave = process.env.API_SEGREDO || 'defaultsecret'
console.log('API Secret:', api_chave ? 'OK' : 'FALTA .env')

app.use(cors())
app.use(express.json())
const pool = require('./db')

function autenticarToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ error: "Token não fornecido" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, api_chave, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Token inválido" });
    }
    req.user = user;
    next();
  });
}

const verifyAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) return res.status(401).json({ mensagem: 'Token requerido' })
    
    const decoded = jwt.verify(token, api_chave)
    const [rows] = await pool.execute('SELECT role FROM usuarios WHERE email = ?', [decoded.email])
    if (rows.length === 0 || rows[0].role !== 'admin') {
      return res.status(403).json({ mensagem: 'Acesso admin requerido' })
    }
    req.user = decoded
    next()
  } catch (error) {
    res.status(401).json({ mensagem: 'Token inválido' })
  }
}

app.post("/cadastro", async (req, res) => {
  const { email, senha } = req.body
  if (email.length <= 3) return res.json({ mensagem: "Preencha o e-mail!" })
  if (senha.length <= 6) return res.json({ mensagem: "Senha min 7 dígitos!" })

  try {
    const hash = await bcrypt.hash(senha, 10)
    await pool.execute("INSERT INTO usuarios (email, senha, role) VALUES (?, ?, 'user') ON DUPLICATE KEY UPDATE role='user'", [email, hash])
    res.json({ mensagem: "Usuário criado!" })
  } catch (error) {
    console.log(error)
    res.json({ mensagem: "Erro cadastro" })
  }
})

app.post("/login", async (req, res) => {
  const { email, senha } = req.body
  try {
    const [rows] = await pool.execute('SELECT * FROM usuarios WHERE email = ?', [email])
    if (rows.length === 0) return res.json({ mensagem: "Email não encontrado" })

    const validou = await bcrypt.compare(senha, rows[0].senha)
    if (!validou) return res.json({ mensagem: "Senha inválida" })

    const token = jwt.sign({ email, role: rows[0].role }, api_chave, { expiresIn: "1h" })
    res.json({ mensagem: "Login OK", token })
  } catch (error) {
    console.log(error)
    res.json({ mensagem: "Erro login" })
  }
})

app.post("/admin/login", async (req, res) => {
  const { email, senha } = req.body
  if (email !== 'admin@ehtech.com' || senha !== 'admin123') {
    return res.json({ mensagem: "Credenciais admin inválidas" })
  }
  
  try {
    const [rows] = await pool.execute('SELECT * FROM usuarios WHERE email = ?', [email])
    if (rows.length === 0) {
      const hash = await bcrypt.hash(senha, 10)
      await pool.execute('INSERT INTO usuarios (email, senha, role) VALUES (?, ?, "admin")', [email, hash])
    } else if (rows[0].role !== 'admin') {
      await pool.execute('UPDATE usuarios SET role="admin" WHERE email = ?', [email])
    }
    
    const token = jwt.sign({ email, role: 'admin' }, api_chave, { expiresIn: "24h" })
    res.json({ mensagem: "Admin login OK", token })
  } catch (error) {
    console.log(error)
    res.json({ mensagem: "Erro admin login" })
  }
})

app.get("/admin/users", verifyAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id_usuario, email, role FROM usuarios')
    res.json(rows)
  } catch (error) {
    console.log(error)
    res.json({ mensagem: "Erro listar" })
  }
})

app.put("/admin/users/:id", verifyAdmin, async (req, res) => {
  const { id } = req.params
  const { email, role } = req.body
  try {
    await pool.execute('UPDATE usuarios SET email = ?, role = ? WHERE id_usuario = ?', [email, role, id])
    res.json({ mensagem: "User atualizado" })
  } catch (error) {
    console.log(error)
    res.json({ mensagem: "Erro update" })
  }
})

app.delete("/admin/users/:id", verifyAdmin, async (req, res) => {
  const { id } = req.params
  try {
    await pool.execute('DELETE FROM usuarios WHERE id_usuario = ?', [id])
    res.json({ mensagem: "User deletado" })
  } catch (error) {
    console.log(error)
    res.json({ mensagem: "Erro delete" })
  }
})

app.get("/produtos", autenticarToken, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM produtos')
    res.json(rows)
  } catch (error) {
    console.log(error)
    res.status(500).json({ mensagem: "Erro listar produtos" })
  }
})

app.get("/produtos/meus", autenticarToken, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM produtos WHERE vendedor = ?', [req.user.email])
    res.json(rows)
  } catch (error) {
    console.log(error)
    res.status(500).json({ mensagem: "Erro listar meus produtos" })
  }
})

app.post("/produtos", autenticarToken, async (req, res) => {
  const { nome, descricao, preco, estoque, categoria } = req.body
  if (!nome || preco === undefined) return res.status(400).json({ mensagem: "Nome e preço são obrigatórios" })
  try {
    await pool.execute(
      'INSERT INTO produtos (nome, descricao, preco, estoque, categoria, vendedor) VALUES (?, ?, ?, ?, ?, ?)',
      [nome, descricao, preco, estoque || 0, categoria, req.user.email]
    )
    res.json({ mensagem: "Produto cadastrado!" })
  } catch (error) {
    console.log(error)
    res.status(500).json({ mensagem: "Erro cadastrar produto" })
  }
})

app.put("/produtos/:id", autenticarToken, async (req, res) => {
  const { id } = req.params
  const { nome, descricao, preco, estoque, categoria } = req.body
  try {
    const [rows] = await pool.execute('SELECT vendedor FROM produtos WHERE id_produto = ?', [id])
    if (rows.length === 0) return res.status(404).json({ mensagem: "Produto não encontrado" })

    const isAdmin = req.user.role === 'admin'
    if (rows[0].vendedor !== req.user.email && !isAdmin) {
      return res.status(403).json({ mensagem: "Acesso negado" })
    }

    await pool.execute(
      'UPDATE produtos SET nome = ?, descricao = ?, preco = ?, estoque = ?, categoria = ? WHERE id_produto = ?',
      [nome, descricao, preco, estoque, categoria, id]
    )
    res.json({ mensagem: "Produto atualizado" })
  } catch (error) {
    console.log(error)
    res.status(500).json({ mensagem: "Erro atualizar produto" })
  }
})

app.delete("/produtos/:id", autenticarToken, async (req, res) => {
  const { id } = req.params
  try {
    const [rows] = await pool.execute('SELECT vendedor FROM produtos WHERE id_produto = ?', [id])
    if (rows.length === 0) return res.status(404).json({ mensagem: "Produto não encontrado" })

    const isAdmin = req.user.role === 'admin'
    if (rows[0].vendedor !== req.user.email && !isAdmin) {
      return res.status(403).json({ mensagem: "Acesso negado" })
    }

    await pool.execute('DELETE FROM produtos WHERE id_produto = ?', [id])
    res.json({ mensagem: "Produto deletado" })
  } catch (error) {
    console.log(error)
    res.status(500).json({ mensagem: "Erro deletar produto" })
  }
})

app.put("/admin/users/:id/senha", verifyAdmin, async (req, res) => {
  const { id } = req.params
  const { novaSenha } = req.body
  if (!novaSenha || novaSenha.length < 7) return res.status(400).json({ mensagem: "Senha mínimo 7 dígitos" })
  try {
    const hash = await bcrypt.hash(novaSenha, 10)
    await pool.execute('UPDATE usuarios SET senha = ? WHERE id_usuario = ?', [hash, id])
    res.json({ mensagem: "Senha alterada com sucesso" })
  } catch (error) {
    console.log(error)
    res.status(500).json({ mensagem: "Erro alterar senha" })
  }
})

// ============== REDEFINIÇÃO DE SENHA ==============

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

app.post('/esqueci-senha', async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ mensagem: 'Informe o e-mail' })

  try {
    const [users] = await pool.execute('SELECT id_usuario FROM usuarios WHERE email = ?', [email])

    if (users.length === 0) {
      console.log(`[esqueci-senha] E-mail não encontrado: ${email}`)
      return res.json({ mensagem: 'Se o e-mail existir, enviaremos instruções de redefinição.' })
    }

    await pool.execute('DELETE FROM password_resets WHERE email = ?', [email])

    const tokenRaw = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(tokenRaw).digest('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    await pool.execute(
      'INSERT INTO password_resets (email, token_hash, expires_at) VALUES (?, ?, ?)',
      [email, tokenHash, expiresAt]
    )

    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/redefinir-senha?token=${tokenRaw}`

    if (emailEnabled && transporter) {
      try {
        await transporter.sendMail({
          from: `"EHtech" <${process.env.SMTP_USER}>`,
          to: email,
          subject: 'Redefinição de Senha',
          html: `
            <h2>Redefinição de Senha</h2>
            <p>Clique no link abaixo para redefinir sua senha. O link expira em 1 hora.</p>
            <a href="${resetLink}">${resetLink}</a>
            <p>Se você não solicitou, ignore este e-mail.</p>
          `
        })
        console.log(`[e-mail enviado] ${email}`)
      } catch (mailErr) {
        console.error('Erro enviar e-mail:', mailErr.message)
      }
    } else {
      console.log(`[DEV] Link de redefinição para ${email}:\n${resetLink}`)
    }

    res.json({ mensagem: 'Se o e-mail existir, enviaremos instruções de redefinição.' })
  } catch (error) {
    console.log(error)
    res.status(500).json({ mensagem: 'Erro ao processar solicitação' })
  }
})

app.get('/verificar-token/:token', async (req, res) => {
  const { token } = req.params
  if (!token) return res.status(400).json({ valido: false, mensagem: 'Token ausente' })

  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const [rows] = await pool.execute(
      'SELECT * FROM password_resets WHERE token_hash = ? AND expires_at > NOW()',
      [tokenHash]
    )

    if (rows.length === 0) {
      return res.json({ valido: false, mensagem: 'Token inválido ou expirado' })
    }

    res.json({ valido: true, email: rows[0].email })
  } catch (error) {
    console.log(error)
    res.status(500).json({ valido: false, mensagem: 'Erro ao verificar token' })
  }
})

app.post('/redefinir-senha', async (req, res) => {
  const { token, novaSenha } = req.body
  if (!token || !novaSenha) return res.status(400).json({ mensagem: 'Token e nova senha são obrigatórios' })
  if (novaSenha.length < 7) return res.status(400).json({ mensagem: 'Senha mínimo 7 dígitos' })

  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const [rows] = await pool.execute(
      'SELECT * FROM password_resets WHERE token_hash = ? AND expires_at > NOW()',
      [tokenHash]
    )

    if (rows.length === 0) {
      return res.status(400).json({ mensagem: 'Token inválido ou expirado' })
    }

    const email = rows[0].email
    const hash = await bcrypt.hash(novaSenha, 10)

    await pool.execute('UPDATE usuarios SET senha = ? WHERE email = ?', [hash, email])
    await pool.execute('DELETE FROM password_resets WHERE id = ?', [rows[0].id])

    res.json({ mensagem: 'Senha redefinida com sucesso! Faça login.' })
  } catch (error) {
    console.log(error)
    res.status(500).json({ mensagem: 'Erro ao redefinir senha' })
  }
})

app.listen(porta, () => {
  console.log(`Backend: localhost:${porta}`)
  
  pool.execute(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      token_hash VARCHAR(255) NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_email (email),
      INDEX idx_token (token_hash)
    )
  `)
    .then(() => console.log('Tabela password_resets OK'))
    .catch(err => console.error('Erro ao criar tabela password_resets:', err.message))
})

console.log('Routes OK: /login /cadastro /produtos /admin/* /esqueci-senha /redefinir-senha')
