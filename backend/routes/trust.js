const express = require('express')
const rateLimit = require('express-rate-limit')
const { autenticarToken, verifyAdmin } = require('../middleware/auth')
const { integer } = require('../validation')
const { problem, transaction } = require('../addresses')
const { publicProduct } = require('../product-origins')
const MOTIVES = ['fraude', 'conteudo_inadequado', 'assedio', 'spam', 'outro']
async function blocked(pool, a, b) {
  const [rows] = await pool.execute('SELECT id FROM bloqueios WHERE (usuario_id = ? AND bloqueado_id = ?) OR (usuario_id = ? AND bloqueado_id = ?) LIMIT 1', [a, b, b, a])
  return rows.length > 0
}
function createTrustRouter(pool) {
  const router = express.Router()
  const action = handler => async (req, res) => {
    res.set('Cache-Control', 'no-store')
    try { await handler(req, res) }
    catch (error) { res.status(error.status || 500).json({ mensagem: error.status ? error.message : 'Não foi possível concluir esta operação.' }) }
  }
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { mensagem: 'Muitas solicitações. Aguarde antes de tentar novamente.' } })
  const id = value => { const parsed = integer(value); if (!(parsed > 0)) throw problem(400, 'Identificador inválido.'); return parsed }
  router.get('/favoritos', autenticarToken, action(async (req, res) => {
    const [rows] = await pool.execute(`SELECT p.* FROM favoritos f JOIN produtos p ON p.id_produto = f.produto_id
      WHERE f.usuario_id = ? AND p.status_aprovacao = 'aprovado' ORDER BY f.id DESC LIMIT 200`, [req.user.id])
    res.json({ itens: rows.map(publicProduct), limite: 200 })
  }))
  router.put('/favoritos/:id', autenticarToken, limiter, action(async (req, res) => {
    const productId = id(req.params.id)
    const [rows] = await pool.execute("SELECT id_produto FROM produtos WHERE id_produto = ? AND status_aprovacao = 'aprovado'", [productId])
    if (!rows.length) throw problem(404, 'Anúncio indisponível.')
    await pool.execute('INSERT IGNORE INTO favoritos (usuario_id, produto_id) VALUES (?, ?)', [req.user.id, productId])
    res.json({ mensagem: 'Anúncio salvo nos favoritos.' })
  }))
  router.delete('/favoritos/:id', autenticarToken, action(async (req, res) => {
    await pool.execute('DELETE FROM favoritos WHERE usuario_id = ? AND produto_id = ?', [req.user.id, id(req.params.id)])
    res.json({ mensagem: 'Anúncio removido dos favoritos.' })
  }))
  router.get('/bloqueios', autenticarToken, action(async (req, res) => {
    const [rows] = await pool.execute(`SELECT b.bloqueado_id, u.username FROM bloqueios b JOIN usuarios u ON u.id_usuario = b.bloqueado_id
      WHERE b.usuario_id = ? ORDER BY b.id DESC`, [req.user.id])
    res.json({ itens: rows })
  }))
  router.put('/bloqueios/:id', autenticarToken, limiter, action(async (req, res) => {
    const target = id(req.params.id)
    if (target === Number(req.user.id)) throw problem(400, 'Você não pode bloquear sua própria conta.')
    const [users] = await pool.execute('SELECT id_usuario FROM usuarios WHERE id_usuario = ?', [target])
    if (!users.length) throw problem(404, 'Usuário não encontrado.')
    await pool.execute('INSERT IGNORE INTO bloqueios (usuario_id, bloqueado_id) VALUES (?, ?)', [req.user.id, target])
    res.json({ mensagem: 'Usuário bloqueado. Novas mensagens ficam impedidas nas duas direções.' })
  }))
  router.delete('/bloqueios/:id', autenticarToken, action(async (req, res) => {
    await pool.execute('DELETE FROM bloqueios WHERE usuario_id = ? AND bloqueado_id = ?', [req.user.id, id(req.params.id)])
    res.json({ mensagem: 'Seu bloqueio foi removido.' })
  }))
  router.post('/denuncias', autenticarToken, limiter, action(async (req, res) => {
    const { tipo, motivo, detalhes } = req.body
    const target = id(req.body.alvo_id)
    if (!['produto', 'usuario', 'mensagem', 'servico', 'pedido', 'contratacao'].includes(tipo) || !MOTIVES.includes(motivo) || typeof detalhes !== 'string' || detalhes.trim().length < 10 || detalhes.length > 2000) throw problem(400, 'Selecione um motivo e descreva a situação entre 10 e 2.000 caracteres.')
    let rows
    if (tipo === 'produto') [rows] = await pool.execute("SELECT id_produto, nome, descricao, vendedor_id FROM produtos WHERE id_produto = ? AND status_aprovacao = 'aprovado' AND vendedor_id <> ?", [target, req.user.id])
    if (tipo === 'usuario') [rows] = await pool.execute('SELECT id_usuario, username FROM usuarios WHERE id_usuario = ? AND id_usuario <> ?', [target, req.user.id])
    if (tipo === 'mensagem') [rows] = await pool.execute('SELECT id, remetente_id, destinatario_id, conteudo, created_at FROM mensagens WHERE id = ? AND destinatario_id = ? AND remetente_id <> ?', [target, req.user.id, req.user.id])
    if (tipo === 'servico') [rows] = await pool.execute("SELECT id_servico, titulo, descricao, prestador_id FROM servicos WHERE id_servico = ? AND status = 'ativo' AND status_aprovacao = 'aprovado' AND prestador_id <> ?", [target, req.user.id])
    if (tipo === 'contratacao') [rows] = await pool.execute('SELECT id_contratacao, servico_id, cliente_id, prestador_id, status, servico_snapshot, escopo_proposto FROM contratacoes_servico WHERE id_contratacao = ? AND (cliente_id = ? OR prestador_id = ?)', [target, req.user.id, req.user.id])
    if (tipo === 'pedido') {
      const { view } = await require('../order-deliveries').readOrder(pool, target, req.user.id)
      rows = [{ id_pedido: view.id_pedido, papel: view.papel, status: view.status, itens: view.itens }]
    }
    if (!rows?.length) throw problem(404, 'Conteúdo indisponível para denúncia.')
    const [duplicates] = await pool.execute("SELECT id FROM denuncias WHERE denunciante_id = ? AND tipo = ? AND alvo_id = ? AND status IN ('aberta', 'em_analise') LIMIT 1", [req.user.id, tipo, target])
    if (duplicates.length) throw problem(409, 'Você já tem uma denúncia aberta para este conteúdo.')
    const [result] = await pool.execute('INSERT INTO denuncias (denunciante_id, tipo, alvo_id, motivo, detalhes, evidencia) VALUES (?, ?, ?, ?, ?, ?)', [req.user.id, tipo, target, motivo, detalhes.trim(), JSON.stringify(rows[0])])
    res.status(201).json({ id: result.insertId, mensagem: 'Denúncia registrada para análise da administração.' })
  }))
  router.get('/admin/denuncias', verifyAdmin, action(async (req, res) => {
    const status = req.query.status || 'aberta'
    if (!['aberta', 'em_analise', 'resolvida', 'arquivada'].includes(status)) throw problem(400, 'Status inválido.')
    const [rows] = await pool.execute('SELECT * FROM denuncias WHERE status = ? ORDER BY id DESC LIMIT 100', [status])
    const ids = rows.map(row => row.id)
    const [history] = ids.length ? await pool.execute(`SELECT * FROM denuncia_decisoes WHERE denuncia_id IN (${ids.map(() => '?').join(',')}) ORDER BY id`, ids) : [[]]
    res.json({ itens: rows.map(row => ({ ...row, historico: history.filter(event => Number(event.denuncia_id) === Number(row.id)) })), limite: 100 })
  }))
  router.patch('/admin/denuncias/:id', verifyAdmin, limiter, action(async (req, res) => {
    const target = id(req.params.id), { status, justificativa } = req.body
    if (!['em_analise', 'resolvida', 'arquivada'].includes(status) || typeof justificativa !== 'string' || justificativa.trim().length < 10 || justificativa.length > 2000) throw problem(400, 'Informe status e justificativa de 10 a 2.000 caracteres.')
    await transaction(pool, async connection => {
      const [rows] = await connection.execute('SELECT id FROM denuncias WHERE id = ? FOR UPDATE', [target])
      if (!rows.length) throw problem(404, 'Denúncia não encontrada.')
      await connection.execute('UPDATE denuncias SET status = ?, decisao = ?, moderador_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, justificativa.trim(), req.user.id, target])
      await connection.execute('INSERT INTO denuncia_decisoes (denuncia_id, moderador_id, status, justificativa) VALUES (?, ?, ?, ?)', [target, req.user.id, status, justificativa.trim()])
    })
    res.json({ mensagem: 'Decisão registrada no histórico.' })
  }))
  return router
}
module.exports = { createTrustRouter, blocked }
