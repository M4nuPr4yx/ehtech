const createRouter = require('./router')
const { autenticarToken, verifyAdmin } = require('../middleware/auth')
const { integer } = require('../validation')
module.exports = function createReviewsRouter(pool) {
const router = createRouter()
router.get('/avaliacoes/elegibilidade/:id', autenticarToken, async (req, res) => {
  try {
    const pedido = await require('../review-eligibility').completedPurchase(pool, req.user.id, integer(req.params.id))
    res.json({ permitido: Boolean(pedido), mensagem: pedido ? 'Você pode avaliar sua compra concluída.' : 'Somente compradores com pedido concluído e recebimento confirmado podem avaliar.' })
  } catch { res.status(500).json({ mensagem: 'Não foi possível verificar sua compra.' }) }
})

router.post("/avaliacoes", autenticarToken, async (req, res) => {
  const { produtoId, nota, comentario } = req.body

  const numericProdutoId = integer(produtoId)
  const numericNota = integer(nota)

  if (!(numericProdutoId > 0) || isNaN(numericNota)) {
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

    const pedido = await require('../review-eligibility').completedPurchase(pool, req.user.id, numericProdutoId)
    if (!pedido) return res.status(403).json({ mensagem: 'Somente compradores com pedido concluído e recebimento confirmado podem avaliar.' })
    await require('../addresses').transaction(pool, async connection => {
      await connection.execute(
        'INSERT INTO avaliacoes (produto_id, avaliador_id, nota, comentario) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE nota = ?, comentario = ?',
        [numericProdutoId, req.user.id, numericNota, cleanComentario, numericNota, cleanComentario]
      )
      await connection.execute('UPDATE avaliacoes SET pedido_id = ? WHERE produto_id = ? AND avaliador_id = ?', [pedido, numericProdutoId, req.user.id])
    })

    return res.json({ mensagem: "Avaliação enviada com sucesso!" })
  } catch (error) {
    console.error('[avaliacoes] Erro:', error.message)
    return res.status(500).json({ mensagem: "Erro ao enviar avaliação" })
  }
})

router.get("/avaliacoes/produto/:id", async (req, res) => {
  const numericId = parseInt(req.params.id, 10)
  if (isNaN(numericId)) {
    return res.status(400).json({ mensagem: "ID inválido" })
  }

  try {
    const [rows] = await pool.execute(`
      SELECT a.id, a.produto_id, a.nota, a.comentario, a.data_avaliacao, (a.pedido_id IS NOT NULL) AS compra_verificada, u.username as avaliador_username
      FROM avaliacoes a
      JOIN usuarios u ON a.avaliador_id = u.id_usuario
      WHERE a.produto_id = ?
      ORDER BY a.data_avaliacao DESC
    `, [numericId])

    let media = 0
    const verified = rows.filter(row => row.compra_verificada)
    let total = verified.length
    if (total > 0) {
      const soma = verified.reduce((acc, curr) => acc + Number(curr.nota), 0)
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

router.get("/avaliacoes/usuario/:id", async (req, res) => {
  const numericId = parseInt(req.params.id, 10)
  if (isNaN(numericId)) {
    return res.status(400).json({ mensagem: "ID inválido" })
  }

  try {
    const [rows] = await pool.execute(`
      SELECT AVG(a.nota) as media, COUNT(*) as total
      FROM avaliacoes a
      JOIN produtos p ON a.produto_id = p.id_produto
      WHERE p.vendedor_id = ? AND a.pedido_id IS NOT NULL
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
return router
}
