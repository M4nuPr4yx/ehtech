const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const crypto = require('crypto')
const nodemailer = require('nodemailer')
const path = require('path')
const fs = require('fs')
const porta = 3000
const app = express()
require('dotenv').config()

// CORS deve vir ANTES das rotas
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

// Criar diretório de uploads se não existir
const uploadsDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
  console.log('[init] Diretório uploads criado')
}

// Servir arquivos estáticos de uploads
app.use('/uploads', express.static(uploadsDir))

// Importar rotas de upload
const uploadRoutes = require('./routes/upload')
app.use('/upload', uploadRoutes)

const api_chave = process.env.API_SEGREDO || 'defaultsecret'
console.log('API Secret:', api_chave ? 'OK' : 'FALTA .env')
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))
const pool = require('./db')

function autenticarToken(req, res, next) {
  console.log('[auth] Headers:', req.headers);
  const authHeader = req.headers["authorization"];
  console.log('[auth] Auth header:', authHeader ? 'present' : 'missing');

  if (!authHeader) {
    console.log('[auth] No token provided');
    return res.status(401).json({ error: "Token não fornecido" });
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2) {
    console.log('[auth] Invalid auth header format - expected "Bearer <token>"');
    return res.status(401).json({ error: "Formato de token inválido. Use: Bearer <token>" });
  }

  const token = parts[1];
  console.log('[auth] Token prefix:', parts[0]);
  console.log('[auth] Verifying token...');

  try {
    const decoded = jwt.decode(token);
    console.log('[auth] Token payload (decoded):', decoded);
  } catch (decodeErr) {
    console.log('[auth] Could not decode token:', decodeErr.message);
  }

  jwt.verify(token, api_chave, (err, user) => {
    if (err) {
      console.log('[auth] Token verification error:', err.name, err.message);
      if (err.name === 'TokenExpiredError') {
        console.log('[auth] Token expired at:', err.expiredAt);
        return res.status(403).json({
          error: "Token expirado. Faça login novamente.",
          code: 'TOKEN_EXPIRED'
        });
      }
      if (err.name === 'JsonWebTokenError') {
        console.log('[auth] Invalid token signature or format');
        return res.status(403).json({
          error: "Token inválido. Faça login novamente.",
          code: 'INVALID_TOKEN'
        });
      }
      return res.status(403).json({ error: "Token inválido: " + err.message });
    }
    console.log('[auth] Token valid, user:', user);
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
  const { username, email, senha } = req.body
  if (!username || username.length < 3) return res.json({ mensagem: "Nome de usuário mínimo 3 caracteres!" })
  if (!email || email.trim() === '') return res.json({ mensagem: "E-mail é obrigatório!" })
  if (!senha || senha.length < 4) return res.json({ mensagem: "Senha mínimo 4 dígitos!" })

  try {
    const [existingUser] = await pool.execute('SELECT id_usuario FROM usuarios WHERE username = ?', [username])
    if (existingUser.length > 0) {
      return res.json({ mensagem: "Nome de usuário já está em uso!" })
    }

    const [existingEmail] = await pool.execute('SELECT id_usuario FROM usuarios WHERE email = ?', [email])
    if (existingEmail.length > 0) {
      return res.json({ mensagem: "E-mail já está em uso!" })
    }

    const hash = await bcrypt.hash(senha, 10)
    await pool.execute(
      "INSERT INTO usuarios (username, email, senha, role) VALUES (?, ?, ?, 'user')",
      [username, email, hash]
    )
    res.json({ mensagem: "Usuário criado!" })
  } catch (error) {
    console.log(error)
    res.json({ mensagem: "Erro cadastro" })
  }
})

app.post("/login", async (req, res) => {
  const { username, senha } = req.body
  try {
    const [rows] = await pool.execute('SELECT * FROM usuarios WHERE username = ?', [username])
    if (rows.length === 0) return res.json({ mensagem: "Usuário não encontrado" })

    const validou = await bcrypt.compare(senha, rows[0].senha)
    if (!validou) return res.json({ mensagem: "Senha inválida" })

    const token = jwt.sign({
      id: rows[0].id_usuario,
      username: rows[0].username,
      email: rows[0].email,
      role: rows[0].role
    }, api_chave, { expiresIn: "1h" })
    res.json({
      mensagem: "Login OK",
      token,
      username: rows[0].username,
      email: rows[0].email,
      userId: rows[0].id_usuario,
      foto: rows[0].foto || null
    })
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

// A vitrine é pública: visitantes não precisam de login para consultar anúncios.
app.get("/produtos", async (req, res) => {
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
  const { nome, descricao, preco, estoque, categoria, imagem } = req.body

  if (!nome || nome.trim() === '') {
    return res.status(400).json({ mensagem: "Nome é obrigatório" })
  }
  if (!descricao || descricao.trim() === '') {
    return res.status(400).json({ mensagem: "Descrição é obrigatória" })
  }
  if (preco === undefined || preco === null || parseFloat(preco) <= 0) {
    return res.status(400).json({ mensagem: "Preço é obrigatório" })
  }
  if (!categoria || categoria.trim() === '') {
    return res.status(400).json({ mensagem: "Categoria é obrigatória" })
  }

  try {
    console.log('[produtos] Received:', { nome, descricao, preco, estoque, categoria, imagem: imagem ? 'sim' : 'não' })
    console.log('[produtos] User:', req.user.id, req.user.username)

    const imagemValue = (!imagem || imagem === '' || imagem === undefined) ? '' : String(imagem);
    const nomeValue = nome ? String(nome).trim() : '';
    const descricaoValue = descricao ? String(descricao).trim() : '';
    const categoriaValue = categoria ? String(categoria).trim() : '';
    const precoValue = parseFloat(preco) || 0;
    const estoqueValue = (!estoque || estoque === undefined) ? 0 : parseInt(estoque);
    const vendedorValue = (req.user && (req.user.username || req.user.email)) ? String(req.user.username || req.user.email) : '';
    let vendedorIdValue = 0;
    if (req.user && req.user.id) {
      const parsed = parseInt(req.user.id);
      vendedorIdValue = isNaN(parsed) ? 0 : parsed;
    }

    console.log('[produtos] Debug - user:', req.user);
    console.log('[produtos] Debug - values:', {
      nomeValue, descricaoValue, precoValue, estoqueValue, categoriaValue,
      imagemValue: imagemValue ? 'present' : 'null', vendedorValue, vendedorIdValue
    });

    if (!nomeValue || nomeValue.trim() === '') {
      return res.status(400).json({ mensagem: "Nome é obrigatório" });
    }
    if (!descricaoValue || descricaoValue.trim() === '') {
      return res.status(400).json({ mensagem: "Descrição é obrigatória" });
    }
    if (!precoValue || precoValue <= 0) {
      return res.status(400).json({ mensagem: "Preço é obrigatório" });
    }
    if (!categoriaValue || categoriaValue.trim() === '') {
      return res.status(400).json({ mensagem: "Categoria é obrigatória" });
    }

    const result = await pool.execute(
      'INSERT INTO produtos (nome, descricao, preco, estoque, categoria, imagem, vendedor, vendedor_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [nomeValue, descricaoValue, precoValue, estoqueValue, categoriaValue, imagemValue, vendedorValue, vendedorIdValue]
    )
    console.log('[produtos] Inserted successfully, result:', result)
    res.json({ mensagem: "Produto cadastrado!" })
  } catch (error) {
    console.error('[produtos] Error:', error.message)
    console.error('[produtos] Stack:', error.stack)
    res.status(500).json({ mensagem: "Erro cadastrar produto: " + error.message })
  }
})

app.put("/produtos/:id", autenticarToken, async (req, res) => {
  const { id } = req.params
  const { nome, descricao, preco, estoque, categoria, imagem } = req.body
  try {
    // Verificar se produto existe
    const [rows] = await pool.execute('SELECT vendedor, vendedor_id FROM produtos WHERE id_produto = ?', [id])
    if (rows.length === 0) return res.status(404).json({ mensagem: "Produto não encontrado" })

    const isAdmin = req.user.role === 'admin'
    const isOwner = rows[0].vendedor === req.user.email || rows[0].vendedor_id === req.user.id
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ mensagem: "Acesso negado" })
    }

    // Processar imagem - permitir string vazia para remover
    let imagemValue = null;
    if (imagem !== undefined && imagem !== null && imagem !== '') {
      // Validar que é base64 ou URL válida
      const trimmed = String(imagem).trim();
      if (trimmed.startsWith('data:image/') || trimmed.startsWith('http') || trimmed.startsWith('/')) {
        imagemValue = trimmed;
      }
    }

    console.log('[produtos/update] imagem value:', imagemValue ? 'presente' : 'null/vazia');

    await pool.execute(
      'UPDATE produtos SET nome = ?, descricao = ?, preco = ?, estoque = ?, categoria = ?, imagem = ? WHERE id_produto = ?',
      [nome, descricao, preco, estoque, categoria, imagemValue, id]
    )
    res.json({ mensagem: "Produto atualizado" })
  } catch (error) {
    console.error('[produtos/update] Error:', error.message)
    res.status(500).json({ mensagem: "Erro atualizar produto" })
  }
})

app.delete("/produtos/:id", autenticarToken, async (req, res) => {
  const { id } = req.params
  try {
    const [rows] = await pool.execute('SELECT vendedor_id FROM produtos WHERE id_produto = ?', [id])
    if (rows.length === 0) return res.status(404).json({ mensagem: "Produto não encontrado" })

    const isAdmin = req.user.role === 'admin'
    if (rows[0].vendedor_id !== req.user.id && !isAdmin) {
      return res.status(403).json({ mensagem: "Acesso negado" })
    }

    await pool.execute('DELETE FROM produtos WHERE id_produto = ?', [id])
    res.json({ mensagem: "Produto deletado" })
  } catch (error) {
    console.log(error)
    res.status(500).json({ mensagem: "Erro deletar produto" })
  }
})

// ============== AVALIAÇÕES ==============

app.post("/avaliacoes", autenticarToken, async (req, res) => {
  const { produtoId, nota, comentario } = req.body

  if (!produtoId || !nota) return res.status(400).json({ mensagem: "Produto e nota são obrigatórios" })
  if (nota < 1 || nota > 5) return res.status(400).json({ mensagem: "Nota deve ser entre 1 e 5" })

  try {
    const [produto] = await pool.execute('SELECT vendedor_id FROM produtos WHERE id_produto = ?', [produtoId])
    if (produto.length === 0) return res.status(404).json({ mensagem: "Produto não encontrado" })

    if (produto[0].vendedor_id === req.user.id) {
      return res.status(400).json({ mensagem: "Você não pode avaliar seu próprio produto" })
    }

    await pool.execute(
      'INSERT INTO avaliacoes (produto_id, avaliador_id, nota, comentario) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE nota = ?, comentario = ?',
      [produtoId, req.user.id, nota, comentario || null, nota, comentario || null]
    )

    res.json({ mensagem: "Avaliação enviada com sucesso!" })
  } catch (error) {
    console.log(error)
    res.status(500).json({ mensagem: "Erro ao avaliar produto" })
  }
})

app.get("/avaliacoes/produto/:id", async (req, res) => {
  const { id } = req.params
  try {
    const [rows] = await pool.execute(`
      SELECT a.*, u.username as avaliador_username
      FROM avaliacoes a
      JOIN usuarios u ON a.avaliador_id = u.id_usuario
      WHERE a.produto_id = ?
      ORDER BY a.data_avaliacao DESC
    `, [id])

    let media = 0
    let total = 0
    if (rows.length > 0) {
      rows.forEach(r => total += r.nota)
      media = total / rows.length
    }

    res.json({
      avaliacoes: rows,
      media: media.toFixed(1),
      total: rows.length
    })
  } catch (error) {
    console.log(error)
    res.status(500).json({ mensagem: "Erro ao buscar avaliações" })
  }
})

app.get("/avaliacoes/usuario/:id", async (req, res) => {
  const { id } = req.params
  try {
    const [rows] = await pool.execute(`
      SELECT AVG(a.nota) as media, COUNT(*) as total
      FROM avaliacoes a
      JOIN produtos p ON a.produto_id = p.id_produto
      WHERE p.vendedor_id = ?
    `, [id])

    res.json({
      media: rows[0].media ? parseFloat(rows[0].media).toFixed(1) : 0,
      total: rows[0].total || 0
    })
  } catch (error) {
    console.log(error)
    res.status(500).json({ mensagem: "Erro ao buscar média do usuário" })
  }
})

// ============== PERFIL DO USUÁRIO ==============

app.get("/perfil", autenticarToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id_usuario, email, role, nome, foto, data_criacao FROM usuarios WHERE email = ?',
      [req.user.email]
    )
    if (rows.length === 0) {
      return res.status(404).json({ mensagem: "Usuário não encontrado" })
    }
    res.json(rows[0])
  } catch (error) {
    console.log(error)
    res.status(500).json({ mensagem: "Erro ao buscar perfil" })
  }
})

app.put("/perfil", autenticarToken, async (req, res) => {
  const { nome } = req.body
  try {
    await pool.execute('UPDATE usuarios SET nome = ? WHERE email = ?', [nome || null, req.user.email])
    res.json({ mensagem: "Perfil atualizado com sucesso" })
  } catch (error) {
    console.log(error)
    res.status(500).json({ mensagem: "Erro ao atualizar perfil" })
  }
})

// Multer para upload de foto de perfil
const multer = require('multer')
const perfilStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `perfil-${req.user.id}-${Date.now()}${ext}`)
  }
})
const uploadPerfil = multer({
  storage: perfilStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Apenas imagens'), false)
  },
  limits: { fileSize: 5 * 1024 * 1024 }
})

app.put("/perfil/foto", uploadPerfil.single('foto'), autenticarToken, async (req, res) => {
  // Se enviou arquivo (multipart/form-data)
  if (req.file) {
    const file = req.file
    const fotoUrl = `/uploads/${file.filename}`
    await pool.execute('UPDATE usuarios SET foto = ? WHERE email = ?', [fotoUrl, req.user.email])
    return res.json({ mensagem: "Foto atualizada com sucesso", foto: fotoUrl })
  }

  // Se enviou JSON com base64 (retrocompatível)
  const { foto } = req.body
  try {
    await pool.execute('UPDATE usuarios SET foto = ? WHERE email = ?', [foto || null, req.user.email])
    res.json({ mensagem: "Foto atualizada com sucesso", foto })
  } catch (error) {
    console.log(error)
    res.status(500).json({ mensagem: "Erro ao atualizar foto" })
  }
})

app.put("/perfil/senha", autenticarToken, async (req, res) => {
  const { senhaAtual, novaSenha } = req.body
  if (!senhaAtual || !novaSenha) return res.status(400).json({ mensagem: "Senha atual e nova senha são obrigatórias" })
  if (novaSenha.length < 7) return res.status(400).json({ mensagem: "Nova senha mínimo 7 dígitos" })

  try {
    const [rows] = await pool.execute('SELECT senha FROM usuarios WHERE email = ?', [req.user.email])
    if (rows.length === 0) {
      return res.status(404).json({ mensagem: "Usuário não encontrado" })
    }

    const validou = await bcrypt.compare(senhaAtual, rows[0].senha)
    if (!validou) {
      return res.status(400).json({ mensagem: "Senha atual incorreta" })
    }

    const hash = await bcrypt.hash(novaSenha, 10)
    await pool.execute('UPDATE usuarios SET senha = ? WHERE email = ?', [hash, req.user.email])
    res.json({ mensagem: "Senha alterada com sucesso! Faça login novamente." })
  } catch (error) {
    console.log(error)
    res.status(500).json({ mensagem: "Erro ao alterar senha" })
  }
})

app.put("/perfil/email", autenticarToken, async (req, res) => {
  const { novoEmail, senha } = req.body
  if (!novoEmail || !senha) return res.status(400).json({ mensagem: "Novo e-mail e senha são obrigatório" })

  try {
    const [rows] = await pool.execute('SELECT senha FROM usuarios WHERE email = ?', [req.user.email])
    if (rows.length === 0) {
      return res.status(404).json({ mensagem: "Usuário não encontrado" })
    }

    const validou = await bcrypt.compare(senha, rows[0].senha)
    if (!validou) {
      return res.status(400).json({ mensagem: "Senha incorreta" })
    }

    const [existing] = await pool.execute('SELECT id_usuario FROM usuarios WHERE email = ?', [novoEmail])
    if (existing.length > 0) {
      return res.status(400).json({ mensagem: "E-mail já está em uso" })
    }

    await pool.execute('UPDATE usuarios SET email = ? WHERE email = ?', [novoEmail, req.user.email])
    res.json({ mensagem: "E-mail alterado com sucesso! Faça login novamente.", novoEmail })
  } catch (error) {
    console.log(error)
    res.status(500).json({ mensagem: "Erro ao alterar e-mail" })
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

  // Add columns to usuarios table if not exist
  pool.execute(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nome VARCHAR(255)`)
    .then(() => console.log('Coluna nome OK'))
    .catch(() => {})

  pool.execute(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP`)
    .then(() => console.log('Coluna data_criacao OK'))
    .catch(() => {})

  pool.execute(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto TEXT`)
    .then(() => console.log('Coluna foto OK'))
    .catch(() => {})

  pool.execute(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE`)
    .then(() => console.log('Coluna username OK'))
    .catch(() => {})

  // Add imagem column to produtos table if not exists
  pool.execute(`ALTER TABLE produtos ADD COLUMN IF NOT EXISTS imagem TEXT`)
    .then(() => console.log('Coluna imagem OK'))
    .catch(() => {})

  // Add vendedor_id column to produtos table if not exists
  pool.execute(`ALTER TABLE produtos ADD COLUMN IF NOT EXISTS vendedor_id INT`)
    .then(() => console.log('Coluna vendedor_id OK'))
    .catch(() => {})

  // Create ratings table (without foreign keys to avoid constraint errors)
  pool.execute(`
    CREATE TABLE IF NOT EXISTS avaliacoes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      produto_id INT NOT NULL,
      avaliador_id INT NOT NULL,
      nota INT NOT NULL,
      comentario TEXT,
      data_avaliacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_avaliacao (produto_id, avaliador_id),
      INDEX idx_produto (produto_id),
      INDEX idx_avaliador (avaliador_id)
    )
  `)
    .then(() => console.log('Tabela avaliacoes OK'))
    .catch(err => console.error('Erro ao criar tabela avaliacoes:', err.message))
})

console.log('Routes OK: /login /cadastro /produtos /admin/* /esqueci-senha /redefinir-senha /upload/*')
