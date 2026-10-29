const createRouter = require('./router')
const { autenticarToken, verifyAdmin } = require('../middleware/auth')
const { integer } = require('../validation')
const { profilePhoto } = require('../../shared/profile-defaults.cjs')
module.exports = function createMessagesRouter(pool, { criarNotificacao }) {
const router = createRouter()
router.post("/mensagens", autenticarToken, async (req, res) => {
  const { destinatarioId, conteudo, produtoId } = req.body

  const parsedDestinatarioId = integer(destinatarioId)
  const parsedProdutoId = produtoId === undefined || produtoId === null ? null : integer(produtoId)
  if (parsedProdutoId !== null && !(parsedProdutoId > 0)) {
    return res.status(400).json({ mensagem: 'Produto inválido.' })
  }

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
    if (await require('../routes/trust').blocked(pool, req.user.id, parsedDestinatarioId)) return res.status(403).json({ mensagem: 'Novas mensagens não estão disponíveis entre estas contas.' })
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
router.get("/mensagens/conversas", autenticarToken, async (req, res) => {
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

    return res.json(rows.map(row => ({ ...row, partner_foto: profilePhoto({ id_usuario: row.partner_id, foto: row.partner_foto }), unread_count: Number(row.unread_count) })))
  } catch (error) {
    console.error('[mensagens/conversas] Erro:', error.message)
    return res.status(500).json({ mensagem: "Erro ao listar conversas" })
  }
})

// Total de mensagens não lidas para o badge
router.get("/mensagens/nao-lidas/total", autenticarToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) AS total FROM mensagens WHERE destinatario_id = ? AND lida = FALSE',
      [req.user.id]
    )
    return res.json({ totalNaoLidas: Number(rows[0].total) || 0 })
  } catch (error) {
    console.error('[mensagens/nao-lidas] Erro:', error.message)
    return res.status(500).json({ mensagem: "Erro ao consultar mensagens não lidas" })
  }
})

// Histórico de mensagens com um usuário específico
router.get("/mensagens/:outroUsuarioId", autenticarToken, async (req, res) => {
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

    const page = require('../message-pagination').messagePage(req.query)
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
      WHERE ((m.remetente_id = ? AND m.destinatario_id = ?)
         OR (m.remetente_id = ? AND m.destinatario_id = ?))${page.condition}
      ORDER BY m.id ${page.order} LIMIT ?
    `, [req.user.id, outroId, outroId, req.user.id, ...page.params, page.limit + 1])

    const [[receipt]] = await pool.execute('SELECT MAX(id) AS ultimo FROM mensagens WHERE remetente_id = ? AND destinatario_id = ? AND lida = TRUE', [req.user.id, outroId])
    return res.json({
      parceiro: { ...partnerRows[0], foto: profilePhoto(partnerRows[0]) },
      lidas_ate: Number(receipt.ultimo) || 0,
      ...require('../message-pagination').pageResult(messages, page)
    })
  } catch (error) {
    console.error('[mensagens/historico] Erro:', error.message)
    return res.status(error.status || 500).json({ mensagem: error.status ? error.message : "Erro ao buscar histórico de mensagens" })
  }
})

// Marcar mensagens de um usuário como lidas
router.put("/mensagens/:outroUsuarioId/lidas", autenticarToken, async (req, res) => {
  const outroId = parseInt(req.params.outroUsuarioId, 10)
  if (isNaN(outroId)) {
    return res.status(400).json({ mensagem: "ID de usuário inválido" })
  }

  try {
    const until = req.body?.ate_id === undefined ? null : integer(req.body.ate_id)
    if (until !== null && !(until > 0)) return res.status(400).json({ mensagem: 'Limite de leitura inválido.' })
    await pool.execute(
      'UPDATE mensagens SET lida = TRUE WHERE remetente_id = ? AND destinatario_id = ? AND lida = FALSE' + (until === null ? '' : ' AND id <= ?'),
      [outroId, req.user.id, ...(until === null ? [] : [until])]
    )
    return res.json({ sucesso: true, mensagem: "Mensagens marcadas como lidas" })
  } catch (error) {
    console.error('[mensagens/lidas] Erro:', error.message)
    return res.status(500).json({ mensagem: "Erro ao atualizar status das mensagens" })
  }
})
return router
}
