const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')




const path = require('path')


require('./env')



const pool = require('./db')
const uploadRoutes = require('./routes/upload')
const createServicesRouter = require('./routes/services')
const createServiceContractsRouter = require('./routes/serviceContracts')
const createOrdersRouter = require('./routes/orders')
const createPassportsRouter = require('./routes/passports')
const createComponentsRouter = require('./routes/components')



const { initializeDatabase } = require('./database/init')
const { ensureSchema } = require('./database/schema-version')
const { createDocsRouter } = require('./docs/router')
const { createProductLoadPolicy } = require('./middleware/productLoadPolicy')
const { integer } = require('./validation')
const porta = process.env.PORT || 3000
const app = express()

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: { 'upgrade-insecure-requests': process.env.NODE_ENV === 'production' ? [] : null }
  }
}))
app.disable('x-powered-by')
// O proxy local Next conecta por loopback; a Vercel adiciona um proxy confiável.
app.set('trust proxy', process.env.VERCEL ? 1 : 'loopback')

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

// Suporte automático para requisições com prefixo /api (ex: /api/produtos ou /produtos)
app.use((req, res, next) => {
  if (req.url.startsWith('/api/_backend/') || req.url === '/api/_backend') {
    req.url = req.url.replace(/^\/api\/_backend/, '') || '/'
  }
  if (req.url.startsWith('/api/') || req.url === '/api') {
    req.url = req.url.replace(/^\/api/, '') || '/'
  }
  next()
})

// ==========================================
// 3. RATE LIMITING (CONTRA BRUTE FORCE & DoS)
// ==========================================
const productLoadPolicy = createProductLoadPolicy(process.env)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300, // 300 requisições por IP
  message: { mensagem: 'Muitas requisições. Tente novamente em alguns minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: productLoadPolicy.matches
})
app.use(globalLimiter)
if (productLoadPolicy.enabled) {
  const productLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: productLoadPolicy.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { mensagem: 'Limite do teste de produtos atingido. Aguarde a próxima janela.' }
  })
  app.use((req, res, next) => productLoadPolicy.matches(req) ? productLimiter(req, res, next) : next())
  console.log(`[EHtech Teste] Consultas de produtos: ${productLoadPolicy.max} requisições/IP em 15 minutos. Autenticação mantém seus limites.`)
}
app.use('/docs', createDocsRouter())

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
// Vercel Functions aceitam até 4,5 MB por requisição; manter limites abaixo disso
// evita uma resposta 413 antes da validação da aplicação.
app.use(express.json({ limit: '4mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))
app.use((req, res, next) => {
  if (req.body && (typeof req.body !== 'object' || Array.isArray(req.body))) {
    return res.status(400).json({ mensagem: 'Envie um objeto JSON válido.' })
  }
  next()
})

for (const name of ['id', 'outroUsuarioId']) {
  app.param(name, (req, res, next, value) => {
    if (!(integer(value) > 0)) return res.status(400).json({ mensagem: 'Identificador inválido.' })
    next()
  })
}

// ==========================================
// 5. DIRETÓRIO DE UPLOADS E ARQUIVOS ESTÁTICOS
// ==========================================
const { uploadsDir } = require('./uploads')

app.use('/uploads', express.static(uploadsDir, {
  dotfiles: 'ignore',
  // Uploads recebem nomes únicos e não são alterados depois de publicados.
  // Isso permite que o navegador reutilize a miniatura já baixada sem pedir o
  // mesmo arquivo a cada navegação.
  maxAge: '7d',
  immutable: true,
  setHeaders: (res) => {
    res.set('X-Content-Type-Options', 'nosniff')
  }
}))

// Roteador de Uploads
app.use('/upload', uploadLimiter, uploadRoutes)
app.use('/servicos', createServicesRouter(pool))
app.use('/contratacoes', createServiceContractsRouter(pool))
app.use('/pedidos', createOrdersRouter(pool))
app.use('/enderecos', require('./routes/addresses')(pool))
app.use('/checkout', require('./routes/checkout')(pool))
app.use('/passaportes', createPassportsRouter(pool))
app.use('/certificados', require('./routes/certificates')(pool))
app.use('/combos', require('./routes/combos')(pool))
app.use('/missoes', require('./routes/missions')(pool))
app.use('/componentes', createComponentsRouter(pool))

const { getApiSecret } = require('./middleware/auth')
const api_chave = getApiSecret()

const criarNotificacao = async ({ usuarioId, produtoId = null, tipo, mensagem }) => {
  if (!usuarioId) return

  await pool.execute(
    'INSERT INTO notificacoes (usuario_id, produto_id, tipo, mensagem) VALUES (?, ?, ?, ?)',
    [usuarioId, produtoId, tipo, mensagem]
  )
}



// ==========================================
// 7. ROTAS DE AUTENTICAÇÃO E CADASTRO
// ==========================================

app.use(require('./routes/auth')(pool, { authLimiter, api_chave }))
app.use(require('./routes/admin')(pool, { criarNotificacao }))
app.use(require('./routes/notifications')(pool))
app.use(require('./routes/products')(pool, { criarNotificacao }))
app.use(require('./routes/reviews')(pool))
app.use(require('./routes/profile')(pool))
app.use(require('./routes/recovery')(pool, { passwordResetLimiter }))
app.use(require('./routes/messages')(pool, { criarNotificacao }))

app.get('/', (req, res) => {
  return res.json({
    servico: 'EHtech API',
    status: 'online',
    health: '/health'
  })
})

app.use(require('./routes/trust').createTrustRouter(pool))

app.get('/health', async (req, res) => {
  const connection = typeof pool.testConnection === 'function'
    ? await pool.testConnection()
    : { ok: true, type: 'database' }

  return res.status(connection.ok ? 200 : 503).json({
    status: connection.ok ? 'ok' : 'degraded',
    api: 'online',
    banco: connection.ok ? 'conectado' : 'indisponivel',
    tipoBanco: connection.type || 'desconhecido',
    timestamp: new Date().toISOString()
  })
})

// ==========================================
// 16. TRATAMENTO CENTRALIZADO DE ERROS (500)
// ==========================================
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err)
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ mensagem: 'JSON inválido.' })
  if (err.type === 'entity.too.large') return res.status(413).json({ mensagem: 'O conteúdo excede o limite permitido.' })
  if (err instanceof URIError) return res.status(400).json({ mensagem: 'Endereço inválido.' })
  console.error('[UNHANDLED ERROR]', err.stack || err.message || err)
  return res.status(500).json({
    mensagem: 'Ocorreu um erro interno no servidor.',
    error: 'Internal Server Error'
  })
})

// ==========================================
// 17. INICIALIZAÇÃO DO BANCO E SERVIDOR
// ==========================================
let dbInitialized = false
let dbInitPromise = null
let serverInstance = null
let serverStartPromise = null

async function initDatabaseTables() {
  if (dbInitialized) return
  if (dbInitPromise) return dbInitPromise

  dbInitPromise = (async () => {
    const migrated = await ensureSchema(pool, async () => {
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

      await initializeDatabase(pool)
    })
    dbInitialized = true
    console.log(migrated ? '[EHtech DB] Tabelas e migrações aplicadas com sucesso' : '[EHtech DB] Versão do banco já aplicada; inicialização rápida')
  })().catch((error) => {
    dbInitPromise = null
    throw error
  })

  return dbInitPromise
}

async function startServer({ port = porta } = {}) {
  if (serverInstance?.listening) return serverInstance
  if (serverStartPromise) return serverStartPromise

  serverStartPromise = (async () => {
    console.log('[EHtech Backend] Verificando banco de dados e migrações...')
    await initDatabaseTables()

    return new Promise((resolve, reject) => {
      const server = app.listen(port)

      const handleError = (error) => {
        server.removeListener('listening', handleListening)
        reject(error)
      }
      const handleListening = () => {
        server.removeListener('error', handleError)
        serverInstance = server
        const address = server.address()
        const activePort = typeof address === 'object' && address ? address.port : port
        console.log(`[EHtech Backend] Pronto em http://localhost:${activePort}`)
        resolve(server)
      }

      server.once('error', handleError)
      server.once('listening', handleListening)
    })
  })()

  try {
    return await serverStartPromise
  } finally {
    serverStartPromise = null
  }
}

// Só inicia a porta quando este arquivo é executado diretamente. Importações
// pela Vercel ou por testes recebem apenas a aplicação Express.
if (require.main === module && !process.env.VERCEL) {
  startServer().catch(async (error) => {
    if (error?.code === 'EADDRINUSE') {
      console.error(`[EHtech Backend] A porta ${porta} já está em uso. A API pode já estar aberta; consulte http://localhost:${porta}/health antes de iniciar outra instância.`)
    } else {
      console.error('[EHtech Backend] Inicialização interrompida:', error.message)
    }
    try {
      if (typeof pool.end === 'function') await pool.end()
    } catch (closeError) {
      console.error('[EHtech DB] Não foi possível encerrar o pool após a falha:', closeError.message)
    }
    process.exitCode = 1
  })
}

module.exports = app
module.exports.initDatabaseTables = initDatabaseTables
module.exports.startServer = startServer
