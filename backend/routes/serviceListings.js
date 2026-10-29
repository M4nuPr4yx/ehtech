const express = require('express')
const crypto = require('crypto')
const { autenticarToken, verifyAdmin } = require('../middleware/auth')
const { transaction, problem } = require('../addresses')
const { integer } = require('../validation')
const { FIELDS, listingInput, managedView, requireVersion } = require('../service-listings')

module.exports = function createServiceListingsRouter(pool) {
  const router = express.Router()
  const limit = require('express-rate-limit')({ windowMs: 10 * 60 * 1000, limit: 40, standardHeaders: true, legacyHeaders: false, message: { mensagem: 'Muitas alterações de serviços. Aguarde alguns minutos.' } })
  const action = handler => async (req, res) => {
    res.set('Cache-Control', 'no-store')
    try {
      if (req.method !== 'GET' && (!req.body || Buffer.byteLength(JSON.stringify(req.body)) > 20000)) throw problem(400, 'Envie até 20 KB por anúncio.')
      const result = await handler(req)
      res.status(req.method === 'POST' ? 201 : 200).json(result)
    } catch (error) { res.status(error.status || 500).json({ mensagem: error.status ? error.message : 'Não foi possível atualizar os anúncios de serviço.' }) }
  }
  async function locked(connection, req, admin = false) {
    const id = integer(req.params.id)
    if (!(id > 0)) throw problem(400, 'Serviço inválido.')
    const [rows] = await connection.execute(`SELECT * FROM servicos WHERE id_servico = ?${admin ? '' : ' AND prestador_id = ?'} FOR UPDATE`, admin ? [id] : [id, req.user.id])
    if (!rows.length) throw problem(404, 'Serviço não encontrado.')
    requireVersion(req.body, rows[0]); return rows[0]
  }
  router.get('/meus', autenticarToken, action(async req => {
    const [rows] = await pool.execute('SELECT * FROM servicos WHERE prestador_id = ? ORDER BY id_servico DESC LIMIT 100', [req.user.id])
    return rows.map(managedView)
  }))
  router.post('/meus', autenticarToken, limit, action(req => transaction(pool, async connection => {
    const data = listingInput(req.body)
    const slug = `${data.titulo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120) || 'servico'}-${crypto.randomBytes(8).toString('hex')}`
    const [inserted] = await connection.execute(`INSERT INTO servicos
      (${FIELDS.join(', ')}, slug, prestador_id, status_aprovacao, origem, revisao_pendente, politicas_versao)
      VALUES (${[...FIELDS, 'slug', 'prestador_id', 'status_aprovacao', 'origem', 'revisao_pendente', 'politicas_versao'].map(() => '?').join(', ')})`,
    [...FIELDS.map(key => key === 'destaques' ? JSON.stringify(data[key]) : data[key]), slug, req.user.id, 'pendente', 'usuario', JSON.stringify(data), req.body.politicas_versao])
    return { id_servico: Number(inserted.insertId), slug, mensagem: 'Serviço enviado para aprovação. Ele ainda não está público.' }
  })))
  router.put('/meus/:id', autenticarToken, limit, action(req => transaction(pool, async connection => {
    const data = listingInput(req.body), row = await locked(connection, req)
    await connection.execute('UPDATE servicos SET revisao_pendente = ?, motivo_reprovacao = NULL, politicas_versao = ?, versao = versao + 1 WHERE id_servico = ?', [JSON.stringify(data), req.body.politicas_versao, row.id_servico])
    return { mensagem: 'Revisão enviada. A versão pública aprovada permanece até a análise.' }
  })))
  router.patch('/meus/:id/status', autenticarToken, limit, action(req => transaction(pool, async connection => {
    if (Object.keys(req.body).some(key => !['versao', 'status'].includes(key)) || !['ativo', 'pausado', 'arquivado'].includes(req.body.status)) throw problem(400, 'Status inválido.')
    const row = await locked(connection, req)
    if (req.body.status === 'ativo' && (row.status_aprovacao !== 'aprovado' || row.origem === 'demonstracao')) throw problem(409, 'Envie seu próprio conteúdo e aguarde a aprovação antes de ativar.')
    await connection.execute('UPDATE servicos SET status = ?, versao = versao + 1 WHERE id_servico = ?', [req.body.status, row.id_servico])
    return { mensagem: 'Disponibilidade atualizada. Contratações anteriores foram preservadas.' }
  })))
  router.get('/moderacao', verifyAdmin, action(async () => {
    const [rows] = await pool.execute(`SELECT s.*, u.username AS prestador FROM servicos s JOIN usuarios u ON u.id_usuario = s.prestador_id
      ORDER BY CASE WHEN s.revisao_pendente IS NOT NULL THEN 0 ELSE 1 END, s.id_servico DESC LIMIT 100`)
    return rows.map(managedView)
  }))
  router.patch('/moderacao/:id', verifyAdmin, limit, action(req => transaction(pool, async connection => {
    const { decisao, motivo } = req.body
    if (Object.keys(req.body).some(key => !['versao', 'decisao', 'motivo'].includes(key)) || !['aprovar', 'reprovar', 'suspender'].includes(decisao)) throw problem(400, 'Decisão inválida.')
    if (decisao !== 'aprovar' && (typeof motivo !== 'string' || motivo.trim().length < 5 || motivo.length > 500 || /[<>\u0000-\u001f]/.test(motivo))) throw problem(400, 'Informe o motivo da decisão, de 5 a 500 caracteres.')
    const row = await locked(connection, req, true)
    if (decisao !== 'suspender' && !row.revisao_pendente) throw problem(409, 'Não há revisão pendente para analisar.')
    if (decisao === 'aprovar') {
      const data = JSON.parse(row.revisao_pendente)
      await connection.execute(`UPDATE servicos SET ${FIELDS.map(key => `${key} = ?`).join(', ')}, status_aprovacao = 'aprovado', origem = 'usuario', revisao_pendente = NULL, motivo_reprovacao = NULL, versao = versao + 1 WHERE id_servico = ?`, [...FIELDS.map(key => key === 'destaques' ? JSON.stringify(data[key]) : data[key]), row.id_servico])
    } else if (decisao === 'suspender') {
      await connection.execute("UPDATE servicos SET status = 'pausado', status_aprovacao = 'reprovado', motivo_reprovacao = ?, versao = versao + 1 WHERE id_servico = ?", [motivo.trim(), row.id_servico])
    } else {
      await connection.execute("UPDATE servicos SET revisao_pendente = NULL, status_aprovacao = ?, motivo_reprovacao = ?, versao = versao + 1 WHERE id_servico = ?", [row.status_aprovacao === 'aprovado' ? 'aprovado' : 'reprovado', motivo.trim(), row.id_servico])
    }
    await connection.execute('INSERT INTO notificacoes (usuario_id, produto_id, tipo, mensagem) VALUES (?, NULL, ?, ?)', [row.prestador_id, 'servico_moderado', `Anúncio de serviço #${row.id_servico}: ${decisao === 'aprovar' ? 'revisão aprovada' : `${decisao === 'suspender' ? 'suspenso' : 'revisão reprovada'}. ${motivo.trim()}`}.`])
    return { mensagem: 'Decisão registrada e prestador notificado.' }
  })))
  return router
}
