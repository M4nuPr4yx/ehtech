const createRouter = require('./router')
const { autenticarToken, verifyAdmin } = require('../middleware/auth')
const bcrypt = require('bcrypt')
const validator = require('validator')
const { isValidPassword } = require('../user-validation')
module.exports = function createAdminRouter(pool, { criarNotificacao }) {
const router = createRouter()
router.get("/admin/sessao", verifyAdmin, (req, res) => {
  return res.json({ id: req.user.id, email: req.user.email, role: 'admin' })
})

router.get("/admin/users", verifyAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id_usuario, username, email, role, data_criacao FROM usuarios ORDER BY id_usuario DESC')
    return res.json(rows)
  } catch (error) {
    console.error('[admin/users] Erro ao listar:', error.message)
    return res.status(500).json({ mensagem: "Erro ao listar usuários" })
  }
})

router.put("/admin/users/:id", verifyAdmin, async (req, res) => {
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

  if (typeof email !== 'string' || !validator.isEmail(email.trim())) {
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

    const [existing] = await pool.execute('SELECT id_usuario FROM usuarios WHERE email = ? AND id_usuario != ?', [normalizedEmail, numericId])
    if (existing.length) return res.status(409).json({ mensagem: 'Este e-mail já está em uso por outra conta' })
    const [result] = await pool.execute('UPDATE usuarios SET email = ?, role = ? WHERE id_usuario = ?', [normalizedEmail, role, numericId])
    if (!result.affectedRows) return res.status(404).json({ mensagem: 'Usuário não encontrado' })
    return res.json({ mensagem: "Usuário atualizado com sucesso" })
  } catch (error) {
    console.error('[admin/users/update] Erro:', error.message)
    return res.status(500).json({ mensagem: "Erro ao atualizar usuário" })
  }
})

router.delete("/admin/users/:id", verifyAdmin, async (req, res) => {
  const { id } = req.params
  const numericId = parseInt(id, 10)

  if (isNaN(numericId)) {
    return res.status(400).json({ mensagem: "ID de usuário inválido" })
  }

  if (numericId === Number(req.user.id)) {
    return res.status(400).json({ mensagem: "Você não pode deletar a sua própria conta enquanto estiver logado." })
  }

  try {
    const [result] = await pool.execute('DELETE FROM usuarios WHERE id_usuario = ?', [numericId])
    if (!result.affectedRows) return res.status(404).json({ mensagem: 'Usuário não encontrado' })
    return res.json({ mensagem: "Usuário deletado com sucesso" })
  } catch (error) {
    console.error('[admin/users/delete] Erro:', error.message)
    return res.status(500).json({ mensagem: "Erro ao deletar usuário" })
  }
})

router.put("/admin/users/:id/senha", verifyAdmin, async (req, res) => {
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
    const [result] = await pool.execute('UPDATE usuarios SET senha = ?, session_version = session_version + 1 WHERE id_usuario = ?', [hash, numericId])
    if (!result.affectedRows) return res.status(404).json({ mensagem: 'Usuário não encontrado' })
    return res.json({ mensagem: "Senha alterada com sucesso" })
  } catch (error) {
    console.error('[admin/users/senha] Erro:', error.message)
    return res.status(500).json({ mensagem: "Erro ao alterar senha" })
  }
})

router.get("/admin/produtos", verifyAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM produtos ORDER BY id_produto DESC')
    return res.json(rows)
  } catch (error) {
    console.error('[admin/produtos] Erro:', error.message)
    return res.status(500).json({ mensagem: "Erro ao listar produtos" })
  }
})

router.put("/admin/produtos/:id/aprovacao", verifyAdmin, async (req, res) => {
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
      : status === 'pendente'
        ? `Seu anúncio "${produto.nome}" está aguardando análise da administração.`
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
return router
}
