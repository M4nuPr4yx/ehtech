const createRouter = require('./router')
const { autenticarToken, verifyAdmin } = require('../middleware/auth')
module.exports = function createNotificationsRouter(pool) {
const router = createRouter()
router.get("/notificacoes", autenticarToken, async (req, res) => {
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

router.put("/notificacoes/:id/lida", autenticarToken, async (req, res) => {
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

router.put("/notificacoes/lidas", autenticarToken, async (req, res) => {
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
return router
}
