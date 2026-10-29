const express = require('express')
const { autenticarToken } = require('../middleware/auth')
const { transaction, problem } = require('../addresses')
const { validId, clean, comboSelect, comboView } = require('../differentials')

function createCombosRouter(pool) {
  const router = express.Router()
  router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next() })
  const route = handler => async (req, res) => {
    try { await handler(req, res) } catch (error) {
      if (!error.status) console.error('[combos] Falha ao processar operação.')
      res.status(error.status || 500).json({ mensagem: error.status ? error.message : 'Não foi possível processar o combo.' })
    }
  }
  router.get('/', route(async (req, res) => {
    const productId = req.query.produto_id
    if (productId !== undefined && !validId(productId)) throw problem(400, 'Produto inválido.')
    const [rows] = await pool.execute(`${comboSelect}${productId ? ' AND c.produto_id = ?' : ''} ORDER BY c.id DESC LIMIT 60`, productId ? [productId] : [])
    res.json(rows.map(comboView))
  }))
  router.use(autenticarToken)
  router.get('/opcoes', route(async (req, res) => {
    const [products] = await pool.execute("SELECT id_produto, nome FROM produtos WHERE vendedor_id = ? AND status_aprovacao = 'aprovado' ORDER BY id_produto DESC LIMIT 100", [req.user.id])
    const [services] = await pool.execute("SELECT id_servico, titulo FROM servicos WHERE prestador_id = ? AND status = 'ativo' AND status_aprovacao = 'aprovado' ORDER BY id_servico DESC LIMIT 100", [req.user.id])
    res.json({ produtos: products, servicos: services })
  }))
  router.get('/meus', route(async (req, res) => {
    const [rows] = await pool.execute('SELECT * FROM combos_instalacao WHERE criador_id = ? ORDER BY id DESC LIMIT 100', [req.user.id])
    res.json(rows)
  }))
  router.post('/', route(async (req, res) => {
    const title = clean(req.body.titulo, 5, 120), description = clean(req.body.descricao, 20, 2000)
    if (!title || !description || !validId(req.body.produto_id) || !validId(req.body.servico_id)) throw problem(400, 'Informe título, descrição, produto e serviço válidos.')
    const id = await transaction(pool, async connection => {
      const [products] = await connection.execute("SELECT id_produto FROM produtos WHERE id_produto = ? AND vendedor_id = ? AND status_aprovacao = 'aprovado' FOR UPDATE", [req.body.produto_id, req.user.id])
      const [services] = await connection.execute("SELECT id_servico FROM servicos WHERE id_servico = ? AND prestador_id = ? AND status = 'ativo' AND status_aprovacao = 'aprovado' FOR UPDATE", [req.body.servico_id, req.user.id])
      if (!products.length || !services.length) throw problem(403, 'O anúncio aprovado e o serviço ativo precisam pertencer à sua conta.')
      const [existing] = await connection.execute('SELECT id FROM combos_instalacao WHERE produto_id = ? AND servico_id = ? AND ativo = TRUE', [req.body.produto_id, req.body.servico_id])
      if (existing.length) throw problem(409, 'Já existe um combo ativo para esse produto e serviço.')
      const [result] = await connection.execute('INSERT INTO combos_instalacao (produto_id, servico_id, criador_id, titulo, descricao) VALUES (?, ?, ?, ?, ?)', [req.body.produto_id, req.body.servico_id, req.user.id, title, description])
      return result.insertId
    })
    res.status(201).json({ id, mensagem: 'Combo publicado. A instalação depende de orçamento e aceite.' })
  }))
  router.delete('/:id', route(async (req, res) => {
    if (!validId(req.params.id)) throw problem(400, 'Combo inválido.')
    const [result] = await pool.execute('UPDATE combos_instalacao SET ativo = FALSE WHERE id = ? AND criador_id = ?', [req.params.id, req.user.id])
    if (!result.affectedRows) throw problem(404, 'Combo não encontrado na sua conta.')
    res.json({ mensagem: 'Combo desativado. Contratações existentes foram preservadas.' })
  }))
  return router
}
module.exports = createCombosRouter
