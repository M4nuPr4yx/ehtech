const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const crypto = require('crypto')
const nodemailer = require('nodemailer')
const path = require('path')
const fs = require('fs')
const validator = require('validator')
const multer = require('multer')
require('dotenv').config()

const pool = require('./db')
const uploadRoutes = require('./routes/upload')
const porta = process.env.PORT || 3000
const app = express()

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}))
app.disable('x-powered-by')

// CORS configurado para aceitar requisições locais e da Vercel
const allowedOrigins = (process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3001,http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app') || process.env.NODE_ENV !== 'production' || process.env.VERCEL) {
      return callback(null, true)
    }
    return callback(null, true)
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

// Suporte automático para requisições com prefixo /api (ex: /api/produtos ou /produtos)
app.use((req, res, next) => {
  if (req.url.startsWith('/api/') || req.url === '/api') {
    req.url = req.url.replace(/^\/api/, '') || '/'
  }
  next()
})

// ==========================================
// 3. RATE LIMITING (CONTRA BRUTE FORCE & DoS)
// ==========================================
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300, // 300 requisições por IP
  message: { mensagem: 'Muitas requisições. Tente novamente em alguns minutos.' },
  standardHeaders: true,
  legacyHeaders: false
})
app.use(globalLimiter)

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 tentativas por 15 minutos
  message: { mensagem: 'Muitas tentativas de autenticação. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false
})

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // 10 tentativas por hora
  message: { mensagem: 'Limite de solicitações de redefinição de senha atingido. Tente mais tarde.' },
  standardHeaders: true,
  legacyHeaders: false
})

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { mensagem: 'Limite de uploads atingido. Tente novamente mais tarde.' },
  standardHeaders: true,
  legacyHeaders: false
})

// ==========================================
// 4. PARSER DE PAYLOAD COM LIMITES SEGUROS
// ==========================================
app.use(express.json({ limit: '6mb' }))
app.use(express.urlencoded({ extended: true, limit: '6mb' }))

// ==========================================
// 5. DIRETÓRIO DE UPLOADS E ARQUIVOS ESTÁTICOS
// ==========================================
const os = require('os')
const uploadsDir = process.env.VERCEL 
  ? path.join(os.tmpdir(), 'uploads') 
  : path.resolve(__dirname, 'uploads')

if (!fs.existsSync(uploadsDir)) {
  try { fs.mkdirSync(uploadsDir, { recursive: true }) } catch (e) {}
}

app.use('/uploads', express.static(uploadsDir, {
  dotfiles: 'ignore',
  setHeaders: (res) => {
    res.set('X-Content-Type-Options', 'nosniff')
  }
}))

// Roteador de Uploads
app.use('/upload', uploadLimiter, uploadRoutes)

const { getApiSecret } = require('./middleware/auth')
const api_chave = getApiSecret()

const isValidPassword = (senha) => {
  return typeof senha === 'string' && senha.length >= 8
}

const isAllowedUserEmail = (email) => {
  if (typeof email !== 'string') return false

  const normalizedEmail = email.trim().toLowerCase()
  if (!validator.isEmail(normalizedEmail)) return false

  const allowedDomains = new Set(['gmail.com', 'hotmail.com', 'outlook.com'])
  return allowedDomains.has(normalizedEmail.split('@')[1])
}

const criarNotificacao = async ({ usuarioId, produtoId = null, tipo, mensagem }) => {
  if (!usuarioId) return

  await pool.execute(
    'INSERT INTO notificacoes (usuario_id, produto_id, tipo, mensagem) VALUES (?, ?, ?, ?)',
    [usuarioId, produtoId, tipo, mensagem]
  )
}

function autenticarToken(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({ error: "Token não fornecido" });
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: "Formato de token inválido. Use: Bearer <token>" });
  }

  const token = parts[1];
  jwt.verify(token, api_chave, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(403).json({
          error: "Token expirado. Faça login novamente.",
          code: 'TOKEN_EXPIRED'
        });
      }
      if (err.name === 'JsonWebTokenError') {
        return res.status(403).json({
          error: "Token inválido. Faça login novamente.",
          code: 'INVALID_TOKEN'
        });
      }
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

// ==========================================
// 7. ROTAS DE AUTENTICAÇÃO E CADASTRO
// ==========================================

app.post("/cadastro", authLimiter, async (req, res) => {
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
    return res.status(400).json({ mensagem: "A senha deve ter no mínimo 8 caracteres!" })
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

    const hash = await bcrypt.hash(senha, 10)
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

app.post("/login", authLimiter, async (req, res) => {
  const { email, senha } = req.body

  if (!email || !senha || typeof email !== 'string' || typeof senha !== 'string') {
    return res.status(400).json({ mensagem: "E-mail e senha são obrigatórios" })
  }

  const normalizedEmail = email.trim().toLowerCase()

  try {
    const [rows] = await pool.execute('SELECT * FROM usuarios WHERE email = ?', [normalizedEmail])

    // Prevenção contra Enumeração de Usuários: mensagem genérica
    if (rows.length === 0) {
      return res.status(401).json({ mensagem: "E-mail ou senha incorretos" })
    }

    const user = rows[0]
    const validou = await bcrypt.compare(senha, user.senha)
    if (!validou) {
      return res.status(401).json({ mensagem: "E-mail ou senha incorretos" })
    }

    const token = jwt.sign({
      id: user.id_usuario,
      username: user.username,
      email: user.email,
      role: user.role || 'user'
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
    console.error('[login] Erro interno:', error.message)
    return res.status(500).json({ mensagem: "Erro interno no servidor ao realizar login" })
  }
})

app.post("/admin/login", authLimiter, async (req, res) => {
  const { email, senha } = req.body

  if (!email || !senha || typeof email !== 'string' || typeof senha !== 'string') {
    return res.status(400).json({ mensagem: "Credenciais de administrador obrigatórias" })
  }

  const normalizedEmail = email.trim().toLowerCase()

  try {
    const [rows] = await pool.execute('SELECT * FROM usuarios WHERE email = ?', [normalizedEmail])
    if (rows.length === 0 || rows[0].role !== 'admin') {
      return res.status(401).json({ mensagem: "Credenciais de administrador inválidas" })
    }

    const adminUser = rows[0]
    const validou = await bcrypt.compare(senha, adminUser.senha)
    if (!validou) {
      return res.status(401).json({ mensagem: "Credenciais de administrador inválidas" })
    }

    const token = jwt.sign({
      id: adminUser.id_usuario,
      username: adminUser.username,
      email: adminUser.email,
      role: 'admin'
    }, api_chave, { expiresIn: "4h", algorithm: 'HS256' })

    return res.json({ mensagem: "Admin login OK", token })
  } catch (error) {
    console.error('[admin/login] Erro interno:', error.message)
    return res.status(500).json({ mensagem: "Erro interno ao autenticar administrador" })
  }
})

// ==========================================
// 8. PAINEL DE ADMINISTRAÇÃO (RBAC)
// ==========================================

app.get("/admin/sessao", verifyAdmin, (req, res) => {
  return res.json({ id: req.user.id, email: req.user.email, role: 'admin' })
})

app.get("/admin/users", verifyAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id_usuario, username, email, role, data_criacao FROM usuarios ORDER BY id_usuario DESC')
    return res.json(rows)
  } catch (error) {
    console.error('[admin/users] Erro ao listar:', error.message)
    return res.status(500).json({ mensagem: "Erro ao listar usuários" })
  }
})

app.put("/admin/users/:id", verifyAdmin, async (req, res) => {
  const { id } = req.params
  const { email, role } = req.body

  const numericId = parseInt(id, 10)
  if (isNaN(numericId)) {
    return res.status(400).json({ mensagem: "ID de usuário inválido" })
  }

  const allowedRoles = ['user', 'admin']
  if (!role || !allowedRoles.includes(role)) {
    return res.status(400).json({ mensagem: "Role deve ser 'user' ou 'admin'" })
  }

  if (!email || !validator.isEmail(email)) {
    return res.status(400).json({ mensagem: "E-mail inválido" })
  }

  const normalizedEmail = email.trim().toLowerCase()

  try {
    // Proteção: não permitir despromover a si mesmo se for o único admin
    if (numericId === Number(req.user.id) && role !== 'admin') {
      const [admins] = await pool.execute("SELECT COUNT(*) as total FROM usuarios WHERE role = 'admin'")
      if (admins[0].total <= 1) {
        return res.status(400).json({ mensagem: "Você não pode remover o próprio acesso do único administrador do sistema." })
      }
    }

    await pool.execute('UPDATE usuarios SET email = ?, role = ? WHERE id_usuario = ?', [normalizedEmail, role, numericId])
    return res.json({ mensagem: "Usuário atualizado com sucesso" })
  } catch (error) {
    console.error('[admin/users/update] Erro:', error.message)
    return res.status(500).json({ mensagem: "Erro ao atualizar usuário" })
  }
})

app.delete("/admin/users/:id", verifyAdmin, async (req, res) => {
  const { id } = req.params
  const numericId = parseInt(id, 10)

  if (isNaN(numericId)) {
    return res.status(400).json({ mensagem: "ID de usuário inválido" })
  }

  if (numericId === Number(req.user.id)) {
    return res.status(400).json({ mensagem: "Você não pode deletar a sua própria conta enquanto estiver logado." })
  }

  try {
    await pool.execute('DELETE FROM usuarios WHERE id_usuario = ?', [numericId])
    return res.json({ mensagem: "Usuário deletado com sucesso" })
  } catch (error) {
    console.error('[admin/users/delete] Erro:', error.message)
    return res.status(500).json({ mensagem: "Erro ao deletar usuário" })
  }
})

app.put("/admin/users/:id/senha", verifyAdmin, async (req, res) => {
  const { id } = req.params
  const { novaSenha } = req.body
  const numericId = parseInt(id, 10)

  if (isNaN(numericId)) {
    return res.status(400).json({ mensagem: "ID de usuário inválido" })
  }

  if (!isValidPassword(novaSenha)) {
    return res.status(400).json({ mensagem: "A senha deve ter no mínimo 8 caracteres" })
  }

  try {
    const hash = await bcrypt.hash(novaSenha, 10)
    await pool.execute('UPDATE usuarios SET senha = ? WHERE id_usuario = ?', [hash, numericId])
    return res.json({ mensagem: "Senha alterada com sucesso" })
  } catch (error) {
    console.error('[admin/users/senha] Erro:', error.message)
    return res.status(500).json({ mensagem: "Erro ao alterar senha" })
  }
})

app.get("/admin/produtos", verifyAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM produtos ORDER BY id_produto DESC')
    return res.json(rows)
  } catch (error) {
    console.error('[admin/produtos] Erro:', error.message)
    return res.status(500).json({ mensagem: "Erro ao listar produtos" })
  }
})

app.put("/admin/produtos/:id/aprovacao", verifyAdmin, async (req, res) => {
  const { id } = req.params
  const { status } = req.body
  const numericId = parseInt(id, 10)

  if (isNaN(numericId)) {
    return res.status(400).json({ mensagem: "ID de produto inválido" })
  }

  const statusesPermitidos = ['aprovado', 'reprovado', 'pendente']
  if (!statusesPermitidos.includes(status)) {
    return res.status(400).json({ mensagem: "Status de aprovação inválido" })
  }

  try {
    const [products] = await pool.execute(
      'SELECT id_produto, nome, vendedor_id FROM produtos WHERE id_produto = ?',
      [numericId]
    )
    if (products.length === 0) {
      return res.status(404).json({ mensagem: "Produto não encontrado" })
    }

    await pool.execute(
      'UPDATE produtos SET status_aprovacao = ? WHERE id_produto = ?',
      [status, numericId]
    )

    const produto = products[0]
    const mensagem = status === 'aprovado'
      ? `Seu anúncio "${produto.nome}" foi aprovado e já está visível na vitrine.`
      : `Seu anúncio "${produto.nome}" não foi aprovado. Revise os dados e envie um novo anúncio.`

    await criarNotificacao({
      usuarioId: produto.vendedor_id,
      produtoId: produto.id_produto,
      tipo: `produto_${status}`,
      mensagem
    })

    return res.json({ mensagem: `Produto ${status} com sucesso` })
  } catch (error) {
    console.error('[admin/produtos/aprovacao] Erro:', error.message)
    return res.status(500).json({ mensagem: "Erro ao atualizar aprovação do produto" })
  }
})

// ==========================================
// 9. NOTIFICAÇÕES
// ==========================================

app.get("/notificacoes", autenticarToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, produto_id, tipo, mensagem, lida, created_at FROM notificacoes WHERE usuario_id = ? ORDER BY created_at DESC, id DESC LIMIT 50',
      [req.user.id]
    )
    return res.json(rows)
  } catch (error) {
    console.error('[notificacoes] Erro ao listar:', error.message)
    return res.status(500).json({ mensagem: 'Erro ao listar notificações' })
  }
})

app.put("/notificacoes/:id/lida", autenticarToken, async (req, res) => {
  const numericId = parseInt(req.params.id, 10)
  if (isNaN(numericId)) {
    return res.status(400).json({ mensagem: "ID de notificação inválido" })
  }

  try {
    await pool.execute(
      'UPDATE notificacoes SET lida = TRUE WHERE id = ? AND usuario_id = ?',
      [numericId, req.user.id]
    )
    return res.json({ mensagem: 'Notificação atualizada' })
  } catch (error) {
    console.error('[notificacoes] Erro ao atualizar:', error.message)
    return res.status(500).json({ mensagem: 'Erro ao atualizar notificação' })
  }
})

app.put("/notificacoes/lidas", autenticarToken, async (req, res) => {
  try {
    await pool.execute('UPDATE notificacoes SET lida = TRUE WHERE usuario_id = ?', [req.user.id])
    return res.json({ mensagem: 'Notificações atualizadas' })
  } catch (error) {
    console.error('[notificacoes] Erro ao atualizar todas:', error.message)
    return res.status(500).json({ mensagem: 'Erro ao atualizar notificações' })
  }
})

// ==========================================
// 10. PRODUTOS (VITRINE & GESTÃO DE ANÚNCIOS)
// ==========================================

// Vitrine pública
app.get("/produtos", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT * FROM produtos WHERE status_aprovacao = 'aprovado' ORDER BY id_produto DESC")
    return res.json(rows)
  } catch (error) {
    console.error('[produtos] Erro ao listar vitrine:', error.message)
    return res.status(500).json({ mensagem: "Erro ao listar produtos" })
  }
})

// Meus produtos
app.get("/produtos/meus", autenticarToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM produtos WHERE vendedor_id = ? OR vendedor = ? ORDER BY id_produto DESC',
      [req.user.id, req.user.email]
    )
    return res.json(rows)
  } catch (error) {
    console.error('[produtos/meus] Erro:', error.message)
    return res.status(500).json({ mensagem: "Erro ao listar seus produtos" })
  }
})

// Detalhe de produto específico por ID
app.get("/produtos/:id", async (req, res) => {
  const numericId = parseInt(req.params.id, 10)
  if (isNaN(numericId)) {
    return res.status(400).json({ mensagem: "ID de produto inválido" })
  }

  try {
    const [rows] = await pool.execute('SELECT * FROM produtos WHERE id_produto = ?', [numericId])
    if (rows.length === 0) {
      return res.status(404).json({ mensagem: "Produto não encontrado" })
    }

    return res.json(rows[0])
  } catch (error) {
    console.error('[produtos/:id] Erro:', error.message)
    return res.status(500).json({ mensagem: "Erro ao buscar produto" })
  }
})

// Cadastro de produto
app.post("/produtos", autenticarToken, async (req, res) => {
  const { nome, descricao, preco, estoque, categoria, imagem } = req.body

  if (!nome || typeof nome !== 'string' || nome.trim() === '') {
    return res.status(400).json({ mensagem: "Nome do produto é obrigatório" })
  }
  if (!descricao || typeof descricao !== 'string' || descricao.trim() === '') {
    return res.status(400).json({ mensagem: "Descrição é obrigatória" })
  }

  const parsedPreco = parseFloat(preco)
  if (isNaN(parsedPreco) || parsedPreco <= 0) {
    return res.status(400).json({ mensagem: "Preço deve ser um valor numérico positivo" })
  }

  if (!categoria || typeof categoria !== 'string' || categoria.trim() === '') {
    return res.status(400).json({ mensagem: "Categoria é obrigatória" })
  }

  const parsedEstoque = estoque !== undefined && estoque !== null ? parseInt(estoque, 10) : 0
  const cleanEstoque = isNaN(parsedEstoque) || parsedEstoque < 0 ? 0 : parsedEstoque

  const cleanNome = nome.trim().slice(0, 255)
  const cleanDescricao = descricao.trim().slice(0, 5000)
  const cleanCategoria = categoria.trim().slice(0, 60)
  
  let cleanImagem = ''
  if (imagem) {
    if (Array.isArray(imagem)) {
      const validUrls = imagem.map(img => String(img).trim()).filter(img => img.startsWith('/uploads/') || img.startsWith('http') || img.startsWith('data:image/'))
      cleanImagem = validUrls.length > 0 ? JSON.stringify(validUrls) : ''
    } else if (typeof imagem === 'string') {
      cleanImagem = imagem.trim()
    }
  }

  const vendedorName = req.user.username || req.user.email || 'Vendedor'
  const vendedorId = Number(req.user.id) || 0

  try {
    const result = await pool.execute(
      "INSERT INTO produtos (nome, descricao, preco, estoque, categoria, imagem, vendedor, vendedor_id, status_aprovacao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendente')",
      [cleanNome, cleanDescricao, parsedPreco, cleanEstoque, cleanCategoria, cleanImagem, vendedorName, vendedorId]
    )

    await criarNotificacao({
      usuarioId: vendedorId,
      produtoId: result[0].insertId,
      tipo: 'produto_enviado',
      mensagem: `Seu anúncio "${cleanNome}" foi enviado e aguarda a aprovação da administração.`
    })

    return res.status(201).json({ mensagem: "Produto cadastrado com sucesso! Aguardando aprovação.", id: result[0].insertId })
  } catch (error) {
    console.error('[produtos/post] Erro:', error.message)
    return res.status(500).json({ mensagem: "Erro ao cadastrar produto" })
  }
})

// Edição de produto
app.put("/produtos/:id", autenticarToken, async (req, res) => {
  const numericId = parseInt(req.params.id, 10)
  if (isNaN(numericId)) {
    return res.status(400).json({ mensagem: "ID de produto inválido" })
  }

  const { nome, descricao, preco, estoque, categoria, imagem } = req.body

  try {
    const [rows] = await pool.execute('SELECT nome, vendedor, vendedor_id, imagem, status_aprovacao FROM produtos WHERE id_produto = ?', [numericId])
    if (rows.length === 0) {
      return res.status(404).json({ mensagem: "Produto não encontrado" })
    }

    const isAdmin = req.user.role === 'admin'
    const isOwner = Number(rows[0].vendedor_id) === Number(req.user.id) || rows[0].vendedor === req.user.email

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ mensagem: "Você não tem permissão para editar este produto" })
    }

    const cleanNome = (nome !== undefined ? String(nome) : rows[0].nome).trim().slice(0, 255)
    const cleanDescricao = (descricao !== undefined ? String(descricao) : rows[0].descricao).trim().slice(0, 5000)
    const parsedPreco = preco !== undefined ? parseFloat(preco) : rows[0].preco
    const parsedEstoque = estoque !== undefined ? parseInt(estoque, 10) : rows[0].estoque
    const cleanCategoria = (categoria !== undefined ? String(categoria) : rows[0].categoria).trim().slice(0, 60)

    const statusesValidos = ['aprovado', 'reprovado', 'pendente']
    const statusAprovacao = (isAdmin && req.body.status_aprovacao && statusesValidos.includes(req.body.status_aprovacao))
      ? req.body.status_aprovacao
      : rows[0].status_aprovacao

    let imagemValue = rows[0].imagem
    if (imagem !== undefined) {
      if (imagem === '' || imagem === null) {
        imagemValue = null
      } else if (Array.isArray(imagem)) {
        const validUrls = imagem.map(img => String(img).trim()).filter(img => img.startsWith('/uploads/') || img.startsWith('http') || img.startsWith('data:image/'))
        imagemValue = validUrls.length > 0 ? JSON.stringify(validUrls) : null
      } else {
        const trimmed = String(imagem).trim()
        imagemValue = trimmed || null
      }
    }

    await pool.execute(
      'UPDATE produtos SET nome = ?, descricao = ?, preco = ?, estoque = ?, categoria = ?, imagem = ?, status_aprovacao = ? WHERE id_produto = ?',
      [
        cleanNome,
        cleanDescricao,
        parsedPreco || 0,
        parsedEstoque >= 0 ? parsedEstoque : 0,
        cleanCategoria,
        imagemValue,
        statusAprovacao,
        numericId
      ]
    )

    if (isAdmin && !isOwner) {
      await criarNotificacao({
        usuarioId: rows[0].vendedor_id,
        produtoId: numericId,
        tipo: 'produto_atualizado',
        mensagem: `Seu anúncio "${cleanNome}" foi atualizado pela administração.`
      })
    }

    return res.json({ mensagem: "Produto atualizado com sucesso" })
  } catch (error) {
    console.error('[produtos/update] Erro:', error.message)
    return res.status(500).json({ mensagem: "Erro ao atualizar produto" })
  }
})

// Exclusão de produto
app.delete("/produtos/:id", autenticarToken, async (req, res) => {
  const numericId = parseInt(req.params.id, 10)
  if (isNaN(numericId)) {
    return res.status(400).json({ mensagem: "ID de produto inválido" })
  }

  try {
    const [rows] = await pool.execute('SELECT nome, vendedor, vendedor_id FROM produtos WHERE id_produto = ?', [numericId])
    if (rows.length === 0) {
      return res.status(404).json({ mensagem: "Produto não encontrado" })
    }

    const isAdmin = req.user.role === 'admin'
    const isOwner = Number(rows[0].vendedor_id) === Number(req.user.id) || rows[0].vendedor === req.user.email || rows[0].vendedor === req.user.username

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ mensagem: "Você não tem permissão para remover este produto" })
    }

    await pool.execute('DELETE FROM produtos WHERE id_produto = ?', [numericId])

    if (isAdmin && !isOwner) {
      await criarNotificacao({
        usuarioId: rows[0].vendedor_id,
        tipo: 'produto_removido',
        mensagem: `Seu anúncio "${rows[0].nome}" foi removido pela administração.`
      })
    }

    return res.json({ mensagem: "Produto deletado com sucesso" })
  } catch (error) {
    console.error('[produtos/delete] Erro:', error.message)
    return res.status(500).json({ mensagem: "Erro ao deletar produto" })
  }
})

// ==========================================
// 11. AVALIAÇÕES (RATINGS)
// ==========================================

app.post("/avaliacoes", autenticarToken, async (req, res) => {
  const { produtoId, nota, comentario } = req.body

  const numericProdutoId = parseInt(produtoId, 10)
  const numericNota = parseInt(nota, 10)

  if (isNaN(numericProdutoId) || isNaN(numericNota)) {
    return res.status(400).json({ mensagem: "Produto e nota são obrigatórios" })
  }

  if (numericNota < 1 || numericNota > 5) {
    return res.status(400).json({ mensagem: "A nota deve ser um valor inteiro entre 1 e 5" })
  }

  const cleanComentario = comentario ? String(comentario).trim().slice(0, 1000) : null

  try {
    const [produto] = await pool.execute('SELECT vendedor_id FROM produtos WHERE id_produto = ?', [numericProdutoId])
    if (produto.length === 0) {
      return res.status(404).json({ mensagem: "Produto não encontrado" })
    }

    if (Number(produto[0].vendedor_id) === Number(req.user.id)) {
      return res.status(400).json({ mensagem: "Você não pode avaliar seu próprio anúncio" })
    }

    await pool.execute(
      'INSERT INTO avaliacoes (produto_id, avaliador_id, nota, comentario) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE nota = ?, comentario = ?',
      [numericProdutoId, req.user.id, numericNota, cleanComentario, numericNota, cleanComentario]
    )

    return res.json({ mensagem: "Avaliação enviada com sucesso!" })
  } catch (error) {
    console.error('[avaliacoes] Erro:', error.message)
    return res.status(500).json({ mensagem: "Erro ao enviar avaliação" })
  }
})

app.get("/avaliacoes/produto/:id", async (req, res) => {
  const numericId = parseInt(req.params.id, 10)
  if (isNaN(numericId)) {
    return res.status(400).json({ mensagem: "ID inválido" })
  }

  try {
    const [rows] = await pool.execute(`
      SELECT a.id, a.produto_id, a.nota, a.comentario, a.data_avaliacao, u.username as avaliador_username
      FROM avaliacoes a
      JOIN usuarios u ON a.avaliador_id = u.id_usuario
      WHERE a.produto_id = ?
      ORDER BY a.data_avaliacao DESC
    `, [numericId])

    let media = 0
    let total = rows.length
    if (total > 0) {
      const soma = rows.reduce((acc, curr) => acc + curr.nota, 0)
      media = soma / total
    }

    return res.json({
      avaliacoes: rows,
      media: media.toFixed(1),
      total
    })
  } catch (error) {
    console.error('[avaliacoes/produto] Erro:', error.message)
    return res.status(500).json({ mensagem: "Erro ao buscar avaliações" })
  }
})

app.get("/avaliacoes/usuario/:id", async (req, res) => {
  const numericId = parseInt(req.params.id, 10)
  if (isNaN(numericId)) {
    return res.status(400).json({ mensagem: "ID inválido" })
  }

  try {
    const [rows] = await pool.execute(`
      SELECT AVG(a.nota) as media, COUNT(*) as total
      FROM avaliacoes a
      JOIN produtos p ON a.produto_id = p.id_produto
      WHERE p.vendedor_id = ?
    `, [numericId])

    return res.json({
      media: rows[0].media ? parseFloat(rows[0].media).toFixed(1) : "0.0",
      total: rows[0].total || 0
    })
  } catch (error) {
    console.error('[avaliacoes/usuario] Erro:', error.message)
    return res.status(500).json({ mensagem: "Erro ao buscar reputação do vendedor" })
  }
})

// ==========================================
// 12. PERFIL DO USUÁRIO & PERFIL PÚBLICO
// ==========================================

// Perfil privado do usuário autenticado
app.get("/perfil", autenticarToken, async (req, res) => {
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
app.get("/usuarios/:id/publico", async (req, res) => {
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

app.put("/perfil", autenticarToken, async (req, res) => {
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
const perfilStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg'
    cb(null, `perfil-${req.user.id}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${safeExt}`)
  }
})

const uploadPerfil = multer({
  storage: perfilStorage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase()
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp']
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp']
    if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('Apenas imagens JPG, PNG ou WEBP são permitidas'))
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }
})

// Middleware seguro: AUTENTICAR ANTES do Multer
app.put("/perfil/foto", autenticarToken, (req, res, next) => {
  uploadPerfil.single('foto')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ mensagem: err.message || 'Erro no upload da foto' })
    }
    next()
  })
}, async (req, res) => {
  if (req.file) {
    const fotoUrl = `/uploads/${req.file.filename}`
    try {
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

app.put("/perfil/senha", autenticarToken, async (req, res) => {
  const { senhaAtual, novaSenha } = req.body

  if (!senhaAtual || !novaSenha) {
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
    await pool.execute('UPDATE usuarios SET senha = ? WHERE id_usuario = ?', [hash, req.user.id])
    return res.json({ mensagem: "Senha alterada com sucesso! Faça login novamente." })
  } catch (error) {
    console.error('[perfil/senha] Erro:', error.message)
    return res.status(500).json({ mensagem: "Erro ao alterar senha" })
  }
})

app.put("/perfil/email", autenticarToken, async (req, res) => {
  const { novoEmail, senha } = req.body

  if (!novoEmail || !senha) {
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

// ==========================================
// 13. REDEFINIÇÃO DE SENHA SEGURA
// ==========================================

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

app.post('/esqueci-senha', passwordResetLimiter, async (req, res) => {
  const { email } = req.body
  if (!email || !validator.isEmail(String(email).trim())) {
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

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
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

app.get('/verificar-token/:token', async (req, res) => {
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

app.post('/redefinir-senha', passwordResetLimiter, async (req, res) => {
  const { token, novaSenha } = req.body

  if (!token || !novaSenha) {
    return res.status(400).json({ mensagem: 'Token e nova senha são obrigatórios' })
  }

  if (!isValidPassword(novaSenha)) {
    return res.status(400).json({ mensagem: 'A nova senha deve ter no mínimo 8 caracteres' })
  }

  try {
    const tokenHash = crypto.createHash('sha256').update(String(token).trim()).digest('hex')
    const [rows] = await pool.execute(
      'SELECT id, email FROM password_resets WHERE token_hash = ? AND expires_at > NOW()',
      [tokenHash]
    )

    if (rows.length === 0) {
      return res.status(400).json({ mensagem: 'Token de redefinição inválido ou expirado' })
    }

    const { id, email } = rows[0]
    const hash = await bcrypt.hash(novaSenha, 10)

    await pool.execute('UPDATE usuarios SET senha = ? WHERE email = ?', [hash, email])
    await pool.execute('DELETE FROM password_resets WHERE id = ?', [id])

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
app.post("/mensagens", autenticarToken, async (req, res) => {
  const { destinatarioId, conteudo, produtoId } = req.body

  const parsedDestinatarioId = parseInt(destinatarioId, 10)
  const parsedProdutoId = produtoId ? parseInt(produtoId, 10) : null

  if (isNaN(parsedDestinatarioId) || parsedDestinatarioId <= 0) {
    return res.status(400).json({ mensagem: "Destinatário inválido" })
  }

  if (parsedDestinatarioId === Number(req.user.id)) {
    return res.status(400).json({ mensagem: "Você não pode enviar mensagens para si mesmo" })
  }

  if (!conteudo || typeof conteudo !== 'string' || conteudo.trim() === '') {
    return res.status(400).json({ mensagem: "O conteúdo da mensagem é obrigatório" })
  }

  const cleanConteudo = conteudo.trim().slice(0, 2000)

  try {
    // Verificar se destinatário existe
    const [destinatarios] = await pool.execute('SELECT id_usuario, username FROM usuarios WHERE id_usuario = ?', [parsedDestinatarioId])
    if (destinatarios.length === 0) {
      return res.status(404).json({ mensagem: "Destinatário não encontrado" })
    }

    const [result] = await pool.execute(
      'INSERT INTO mensagens (remetente_id, destinatario_id, produto_id, conteudo) VALUES (?, ?, ?, ?)',
      [req.user.id, parsedDestinatarioId, parsedProdutoId, cleanConteudo]
    )

    // Criar notificação para o destinatário
    await criarNotificacao({
      usuarioId: parsedDestinatarioId,
      produtoId: parsedProdutoId,
      tipo: 'nova_mensagem',
      mensagem: `Nova mensagem de ${req.user.username || 'um usuário'}: "${cleanConteudo.length > 40 ? cleanConteudo.slice(0, 37) + '...' : cleanConteudo}"`
    })

    return res.status(201).json({
      sucesso: true,
      mensagem: "Mensagem enviada com sucesso",
      id: result.insertId
    })
  } catch (error) {
    console.error('[mensagens/post] Erro:', error.message)
    return res.status(500).json({ mensagem: "Erro ao enviar mensagem" })
  }
})

// Listar conversas ativas do usuário logado
app.get("/mensagens/conversas", autenticarToken, async (req, res) => {
  try {
    const currentUserId = req.user.id

    const [rows] = await pool.execute(`
      SELECT 
        u.id_usuario AS partner_id,
        u.username AS partner_username,
        u.nome AS partner_nome,
        u.foto AS partner_foto,
        m.conteudo AS last_message,
        m.created_at AS last_message_date,
        m.remetente_id AS last_sender_id,
        (
          SELECT COUNT(*) 
          FROM mensagens unread 
          WHERE unread.remetente_id = u.id_usuario 
            AND unread.destinatario_id = ? 
            AND unread.lida = FALSE
        ) AS unread_count
      FROM usuarios u
      JOIN mensagens m ON m.id = (
        SELECT id FROM mensagens sub 
        WHERE (sub.remetente_id = ? AND sub.destinatario_id = u.id_usuario)
           OR (sub.remetente_id = u.id_usuario AND sub.destinatario_id = ?)
        ORDER BY sub.created_at DESC, sub.id DESC
        LIMIT 1
      )
      ORDER BY m.created_at DESC
    `, [currentUserId, currentUserId, currentUserId])

    return res.json(rows)
  } catch (error) {
    console.error('[mensagens/conversas] Erro:', error.message)
    return res.status(500).json({ mensagem: "Erro ao listar conversas" })
  }
})

// Total de mensagens não lidas para o badge
app.get("/mensagens/nao-lidas/total", autenticarToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) AS total FROM mensagens WHERE destinatario_id = ? AND lida = FALSE',
      [req.user.id]
    )
    return res.json({ totalNaoLidas: rows[0].total || 0 })
  } catch (error) {
    console.error('[mensagens/nao-lidas] Erro:', error.message)
    return res.status(500).json({ mensagem: "Erro ao consultar mensagens não lidas" })
  }
})

// Histórico de mensagens com um usuário específico
app.get("/mensagens/:outroUsuarioId", autenticarToken, async (req, res) => {
  const outroId = parseInt(req.params.outroUsuarioId, 10)
  if (isNaN(outroId)) {
    return res.status(400).json({ mensagem: "ID de usuário parceiro inválido" })
  }

  try {
    const [partnerRows] = await pool.execute(
      'SELECT id_usuario, username, nome, foto FROM usuarios WHERE id_usuario = ?',
      [outroId]
    )

    if (partnerRows.length === 0) {
      return res.status(404).json({ mensagem: "Usuário não encontrado" })
    }

    const [messages] = await pool.execute(`
      SELECT 
        m.id,
        m.remetente_id,
        m.destinatario_id,
        m.produto_id,
        m.conteudo,
        m.lida,
        m.created_at,
        p.nome AS produto_nome,
        p.preco AS produto_preco,
        p.imagem AS produto_imagem
      FROM mensagens m
      LEFT JOIN produtos p ON m.produto_id = p.id_produto
      WHERE (m.remetente_id = ? AND m.destinatario_id = ?)
         OR (m.remetente_id = ? AND m.destinatario_id = ?)
      ORDER BY m.created_at ASC, m.id ASC
    `, [req.user.id, outroId, outroId, req.user.id])

    return res.json({
      parceiro: partnerRows[0],
      mensagens: messages
    })
  } catch (error) {
    console.error('[mensagens/historico] Erro:', error.message)
    return res.status(500).json({ mensagem: "Erro ao buscar histórico de mensagens" })
  }
})

// Marcar mensagens de um usuário como lidas
app.put("/mensagens/:outroUsuarioId/lidas", autenticarToken, async (req, res) => {
  const outroId = parseInt(req.params.outroUsuarioId, 10)
  if (isNaN(outroId)) {
    return res.status(400).json({ mensagem: "ID de usuário inválido" })
  }

  try {
    await pool.execute(
      'UPDATE mensagens SET lida = TRUE WHERE remetente_id = ? AND destinatario_id = ? AND lida = FALSE',
      [outroId, req.user.id]
    )
    return res.json({ sucesso: true, mensagem: "Mensagens marcadas como lidas" })
  } catch (error) {
    console.error('[mensagens/lidas] Erro:', error.message)
    return res.status(500).json({ mensagem: "Erro ao atualizar status das mensagens" })
  }
})

// ==========================================
// 15. TRATAMENTO CENTRALIZADO DE ERROS (500)
// ==========================================
app.use((err, req, res, next) => {
  console.error('[UNHANDLED ERROR]', err.stack || err.message || err)
  if (res.headersSent) {
    return next(err)
  }
  return res.status(500).json({
    mensagem: 'Ocorreu um erro interno no servidor.',
    error: 'Internal Server Error'
  })
})

// ==========================================
// 16. INICIALIZAÇÃO DO BANCO E SERVIDOR
// ==========================================
let dbInitialized = false
let dbInitPromise = null

async function initDatabaseTables() {
  if (dbInitialized) return
  if (dbInitPromise) return dbInitPromise

  dbInitPromise = (async () => {
    try {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS usuarios (
          id_usuario INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(100) NOT NULL UNIQUE,
          email VARCHAR(255) NOT NULL UNIQUE,
          senha VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'user',
          foto LONGTEXT DEFAULT NULL,
          nome VARCHAR(255) DEFAULT NULL,
          data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)

      await pool.execute(`
        CREATE TABLE IF NOT EXISTS produtos (
          id_produto INT AUTO_INCREMENT PRIMARY KEY,
          nome VARCHAR(255) NOT NULL,
          descricao TEXT,
          preco DECIMAL(10, 2) NOT NULL,
          estoque INT NOT NULL DEFAULT 0,
          categoria VARCHAR(60) NOT NULL,
          imagem LONGTEXT DEFAULT NULL,
          vendedor VARCHAR(255) NOT NULL,
          vendedor_id INT NOT NULL,
          status_aprovacao VARCHAR(50) DEFAULT 'pendente',
          data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_vendedor (vendedor_id),
          INDEX idx_status (status_aprovacao)
        )
      `)

      await pool.execute(`
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

      await pool.execute(`
        CREATE TABLE IF NOT EXISTS notificacoes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          usuario_id INT NOT NULL,
          produto_id INT NULL,
          tipo VARCHAR(50) NOT NULL,
          mensagem TEXT NOT NULL,
          lida BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_notificacoes_usuario (usuario_id),
          INDEX idx_notificacoes_lida (usuario_id, lida)
        )
      `)

      await pool.execute(`
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

      await pool.execute(`
        CREATE TABLE IF NOT EXISTS mensagens (
          id INT AUTO_INCREMENT PRIMARY KEY,
          remetente_id INT NOT NULL,
          destinatario_id INT NOT NULL,
          produto_id INT NULL,
          conteudo TEXT NOT NULL,
          lida BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_remetente (remetente_id),
          INDEX idx_destinatario (destinatario_id),
          INDEX idx_conversa (remetente_id, destinatario_id),
          INDEX idx_created (created_at)
        )
      `)

      dbInitialized = true
      console.log('[EHtech DB] Tabelas e migrações verificadas com sucesso')
    } catch (err) {
      console.error('[EHtech DB] Aviso na inicialização de tabelas:', err.message)
    }
  })()

  return dbInitPromise
}

// Middleware para garantir que o banco esteja pronto antes das requisições
app.use(async (req, res, next) => {
  if (!dbInitialized) {
    initDatabaseTables().catch(() => {})
  }
  next()
})

// Inicialização em ambiente standalone (desenvolvimento local)
if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
  app.listen(porta, async () => {
    console.log(`[EHtech Backend] Rodando na porta ${porta}`)
    await initDatabaseTables()
  })
}

module.exports = app
module.exports.initDatabaseTables = initDatabaseTables
