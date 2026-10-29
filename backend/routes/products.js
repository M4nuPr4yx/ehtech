const createRouter = require('./router')
const { autenticarToken, verifyAdmin } = require('../middleware/auth')
const { money, integer } = require('../validation')
const { selectOrigin, publicProduct } = require('../product-origins')
const { catalogQuery } = require('../product-catalog')
const { publicCatalogCache } = require('../public-catalog-cache')
const { findComponent } = require('../components/catalog')
module.exports = function createProductsRouter(pool, { criarNotificacao }) {
const router = createRouter()
router.get("/produtos", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT * FROM produtos WHERE status_aprovacao = 'aprovado' ORDER BY id_produto DESC")
    return res.json(rows.map(publicProduct))
  } catch (error) {
    console.error('[produtos] Erro ao listar vitrine:', error.message)
    return res.status(500).json({ mensagem: "Erro ao listar produtos" })
  }
})

// Catálogo público paginado. Mantém /produtos para os consumidores legados
// (por exemplo, a vitrine da página inicial), mas evita montar e transferir
// todo o catálogo quando o usuário abre a tela de busca.
router.get("/produtos/catalogo", async (req, res) => {
  let options
  try { options = catalogQuery(req.query) }
  catch (error) { return res.status(400).json({ mensagem: error.message }) }
  const { page, limit, where, params, order, orderParams } = options
  const offset = (page - 1) * limit

  try {
    const [[[countResult]], [items]] = await Promise.all([
      pool.execute(`SELECT COUNT(*) AS total FROM produtos WHERE ${where}`, params),
      pool.execute(
        `SELECT id_produto, nome, descricao, preco, estoque, categoria, imagem, componente_id, origem_uf, origem_cidade, data_criacao
         FROM produtos
         WHERE ${where}
         ORDER BY ${order}
         LIMIT ? OFFSET ?`,
        [...params, ...orderParams, limit, offset]
      )
    ])

    const total = Number(countResult.total) || 0
    publicCatalogCache(req, res)
    return res.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit))
    })
  } catch (error) {
    console.error('[produtos/catalogo] Erro ao listar:', error.message)
    return res.status(500).json({ mensagem: 'Erro ao listar produtos' })
  }
})

// Meus produtos
router.get("/produtos/meus", autenticarToken, async (req, res) => {
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
router.get('/produtos/mapa', async (req, res) => {
  const page = req.query.pagina === undefined ? 1 : integer(req.query.pagina)
  if (!(page > 0 && page <= 100000)) return res.status(400).json({ mensagem: 'Página inválida.' })
  try {
    const [[[count]], [items]] = await Promise.all([
      pool.execute("SELECT COUNT(*) AS total FROM produtos WHERE status_aprovacao = 'aprovado'"),
      pool.execute("SELECT id_produto FROM produtos WHERE status_aprovacao = 'aprovado' ORDER BY id_produto LIMIT ? OFFSET ?", [1000, (page - 1) * 1000])
    ])
    res.set('Cache-Control', 'public, max-age=300').json({ pagina: page, paginas: Math.ceil(Number(count.total) / 1000), total: Number(count.total), itens: items })
  } catch { res.status(503).json({ mensagem: 'Mapa de anúncios indisponível.' }) }
})
router.get("/produtos/:id", (req, res, next) => req.headers.authorization ? autenticarToken(req, res, next) : next(), async (req, res) => {
  const numericId = parseInt(req.params.id, 10)
  if (isNaN(numericId)) {
    return res.status(400).json({ mensagem: "ID de produto inválido" })
  }

  try {
    const [rows] = await pool.execute("SELECT * FROM produtos WHERE id_produto = ? AND (status_aprovacao = 'aprovado' OR vendedor_id = ? OR ? = 1)", [numericId, Number(req.user?.id) || 0, req.user?.role === 'admin' ? 1 : 0])
    res.set('Cache-Control', 'no-store')
    if (rows.length === 0) {
      return res.status(404).json({ mensagem: "Produto não encontrado" })
    }

    return res.json(publicProduct(rows[0]))
  } catch (error) {
    console.error('[produtos/:id] Erro:', error.message)
    return res.status(500).json({ mensagem: "Erro ao buscar produto" })
  }
})

// Cadastro de produto
router.post("/produtos", autenticarToken, async (req, res) => {
  const { nome, descricao, preco, estoque, categoria, imagem } = req.body

  if (!nome || typeof nome !== 'string' || nome.trim() === '') {
    return res.status(400).json({ mensagem: "Nome do produto é obrigatório" })
  }
  if (!descricao || typeof descricao !== 'string' || descricao.trim() === '') {
    return res.status(400).json({ mensagem: "Descrição é obrigatória" })
  }

  const parsedPreco = money(preco)
  if (!Number.isFinite(parsedPreco)) {
    return res.status(400).json({ mensagem: "Preço deve ser um valor numérico positivo" })
  }

  if (!categoria || typeof categoria !== 'string' || categoria.trim() === '') {
    return res.status(400).json({ mensagem: "Categoria é obrigatória" })
  }

  const cleanEstoque = estoque === undefined ? 0 : integer(estoque)
  if (!Number.isInteger(cleanEstoque) || cleanEstoque < 0 || cleanEstoque > 2147483647) {
    return res.status(400).json({ mensagem: 'Estoque deve ser um número inteiro não negativo.' })
  }

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
    let componentId = null
    if (req.body.componente_id !== undefined && req.body.componente_id !== null && req.body.componente_id !== '') {
      const component = await findComponent(pool, req.body.componente_id)
      if (!component) return res.status(400).json({ mensagem: 'Selecione um modelo técnico ativo e revisado.' })
      componentId = component.id
    }
    const requiresShipping = req.body.exige_entrega !== false
    if (req.body.exige_entrega !== undefined && typeof req.body.exige_entrega !== 'boolean') return res.status(400).json({ mensagem: 'Informe se o produto exige entrega física.' })
    const origin = requiresShipping ? await selectOrigin(pool, vendedorId, req.body.origem_endereco_id, req.body.origem_versao) : null
    const result = await pool.execute(
      "INSERT INTO produtos (nome, descricao, preco, estoque, categoria, imagem, vendedor, vendedor_id, status_aprovacao, componente_id, exige_entrega, origem_endereco_id, origem_snapshot, origem_uf, origem_cidade, data_criacao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendente', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
      [cleanNome, cleanDescricao, parsedPreco, cleanEstoque, cleanCategoria, cleanImagem, vendedorName, vendedorId, componentId, requiresShipping, origin?.id ?? null, origin?.snapshot ?? null, origin?.uf ?? null, origin?.cidade ?? null]
    )

    await criarNotificacao({
      usuarioId: vendedorId,
      produtoId: result[0].insertId,
      tipo: 'produto_enviado',
      mensagem: `Seu anúncio "${cleanNome}" foi enviado e aguarda a aprovação da administração.`
    })

    return res.status(201).json({ mensagem: "Produto cadastrado com sucesso! Aguardando aprovação.", id: result[0].insertId })
  } catch (error) {
    if (error.status) return res.status(error.status).json({ mensagem: error.message })
    console.error('[produtos/post] Erro:', error.message)
    return res.status(500).json({ mensagem: "Erro ao cadastrar produto" })
  }
})

// Edição de produto
router.put("/produtos/:id", autenticarToken, async (req, res) => {
  const numericId = parseInt(req.params.id, 10)
  if (isNaN(numericId)) {
    return res.status(400).json({ mensagem: "ID de produto inválido" })
  }

  const { nome, descricao, preco, estoque, categoria, imagem } = req.body

  try {
    const [rows] = await pool.execute('SELECT nome, descricao, preco, estoque, categoria, vendedor, vendedor_id, imagem, status_aprovacao, componente_id, exige_entrega, origem_endereco_id, origem_snapshot, origem_uf, origem_cidade FROM produtos WHERE id_produto = ?', [numericId])
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
    const parsedPreco = money(preco !== undefined ? preco : rows[0].preco)
    const parsedEstoque = integer(estoque !== undefined ? estoque : rows[0].estoque)
    const cleanCategoria = (categoria !== undefined ? String(categoria) : rows[0].categoria).trim().slice(0, 60)
    if (!cleanNome || !cleanDescricao || !cleanCategoria ||
        [nome, descricao, categoria].some(value => value !== undefined && typeof value !== 'string') ||
        !Number.isFinite(parsedPreco) || !Number.isInteger(parsedEstoque) || parsedEstoque < 0 || parsedEstoque > 2147483647) {
      return res.status(400).json({ mensagem: 'Informe nome, descrição, categoria, preço positivo e estoque inteiro válido.' })
    }

    const statusesValidos = ['aprovado', 'reprovado', 'pendente']
    let statusAprovacao = (isAdmin && req.body.status_aprovacao && statusesValidos.includes(req.body.status_aprovacao))
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

    let componentId = rows[0].componente_id
    if (req.body.componente_id !== undefined) {
      if (req.body.componente_id === null || req.body.componente_id === '') componentId = null
      else {
        const component = await findComponent(pool, req.body.componente_id)
        if (!component) return res.status(400).json({ mensagem: 'Selecione um modelo técnico ativo e revisado.' })
        componentId = component.id
      }
    }
    if (!isAdmin && Number(componentId || 0) !== Number(rows[0].componente_id || 0)) statusAprovacao = 'pendente'
    if (req.body.exige_entrega !== undefined && typeof req.body.exige_entrega !== 'boolean') return res.status(400).json({ mensagem: 'Informe se o produto exige entrega física.' })
    const requiresShipping = req.body.exige_entrega ?? Boolean(rows[0].exige_entrega)
    let origin = { id: rows[0].origem_endereco_id, snapshot: rows[0].origem_snapshot, uf: rows[0].origem_uf, cidade: rows[0].origem_cidade }
    if (!requiresShipping) origin = null
    else if (req.body.origem_endereco_id !== undefined) origin = await selectOrigin(pool, rows[0].vendedor_id, req.body.origem_endereco_id, req.body.origem_versao)
    else if (!origin.snapshot) return res.status(400).json({ mensagem: 'Selecione um endereço de origem para este anúncio antigo.' })
    if (!isAdmin && (origin?.snapshot !== rows[0].origem_snapshot || requiresShipping !== Boolean(rows[0].exige_entrega))) statusAprovacao = 'pendente'
    await pool.execute(
      'UPDATE produtos SET nome = ?, descricao = ?, preco = ?, estoque = ?, categoria = ?, imagem = ?, status_aprovacao = ?, componente_id = ?, exige_entrega = ?, origem_endereco_id = ?, origem_snapshot = ?, origem_uf = ?, origem_cidade = ? WHERE id_produto = ?',
      [
        cleanNome,
        cleanDescricao,
        parsedPreco || 0,
        parsedEstoque >= 0 ? parsedEstoque : 0,
        cleanCategoria,
        imagemValue,
        statusAprovacao,
        componentId,
        requiresShipping,
        origin?.id ?? null,
        origin?.snapshot ?? null,
        origin?.uf ?? null,
        origin?.cidade ?? null,
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
    if (error.status) return res.status(error.status).json({ mensagem: error.message })
    console.error('[produtos/update] Erro:', error.message)
    return res.status(500).json({ mensagem: "Erro ao atualizar produto" })
  }
})

// Exclusão de produto
router.delete("/produtos/:id", autenticarToken, async (req, res) => {
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
return router
}
