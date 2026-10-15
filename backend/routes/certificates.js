const express = require('express')
const { autenticarToken } = require('../middleware/auth')
const { transaction, problem } = require('../addresses')
const { CHECKS, validId, clean, fingerprint, checklistResult, certificateStatus } = require('../differentials')

function createCertificatesRouter(pool) {
  const router = express.Router()
  router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next() })
  const route = handler => async (req, res) => {
    try { await handler(req, res) } catch (error) {
      if (!error.status) console.error('[certificados] Falha ao processar operação.')
      res.status(error.status || 500).json({ mensagem: error.status ? error.message : 'Não foi possível processar o certificado.' })
    }
  }
  async function context(connection, certificate, lock = false) {
    const suffix = lock ? ' FOR UPDATE' : ''
    const [passports] = await connection.execute(`SELECT * FROM passaportes WHERE id = ?${suffix}`, [certificate.passaporte_id])
    const [products] = await connection.execute(`SELECT * FROM produtos WHERE id_produto = ?${suffix}`, [certificate.produto_id])
    return { passport: passports[0], product: products[0] }
  }
  async function notify(connection, userId, productId, message) {
    await connection.execute('INSERT INTO notificacoes (usuario_id, produto_id, tipo, mensagem) VALUES (?, ?, ?, ?)', [userId, productId, 'certificado', message])
  }

  router.get('/produto/:id', route(async (req, res) => {
    if (!validId(req.params.id)) throw problem(400, 'Produto inválido.')
    const [rows] = await pool.execute("SELECT * FROM certificados_usado WHERE produto_id = ? AND status = 'emitido' ORDER BY id DESC LIMIT 20", [req.params.id])
    for (const row of rows) {
      const { passport, product } = await context(pool, row)
      if (certificateStatus(row, passport, product) !== 'emitido') continue
      return res.json({ certificado: { id: row.id, checklist: JSON.parse(row.checklist), laudo: row.laudo, emitido_em: row.emitido_em, expira_em: row.expira_em, equipamento: { nome: passport.nome, tipo: passport.tipo, modelo: passport.modelo }, aviso: 'Inspeção declarada pelo prestador do atendimento. Não é certificação oficial, garantia de desempenho ou substituto da garantia legal.' } })
    }
    res.json({ certificado: null })
  }))

  router.use(autenticarToken)
  router.get('/', route(async (req, res) => {
    const [rows] = await pool.execute('SELECT * FROM certificados_usado WHERE solicitante_id = ? OR tecnico_id = ? ORDER BY id DESC LIMIT 100', [req.user.id, req.user.id])
    const result = []
    for (const row of rows) {
      const { passport, product } = await context(pool, row)
      result.push({ id: row.id, passaporte_id: row.passaporte_id, produto_id: row.produto_id, contratacao_id: row.contratacao_id, status: certificateStatus(row, passport, product), papel: Number(row.tecnico_id) === Number(req.user.id) ? 'tecnico' : 'solicitante', equipamento: JSON.parse(row.ficha_snapshot), produto_nome: product?.nome || 'Anúncio removido', checklist: row.checklist ? JSON.parse(row.checklist) : null, laudo: row.laudo, emitido_em: row.emitido_em, expira_em: row.expira_em })
    }
    res.json({ itens: result, criterios: CHECKS })
  }))
  router.post('/', route(async (req, res) => {
    const { passaporte_id: passportId, produto_id: productId, contratacao_id: contractId } = req.body
    if (![passportId, productId, contractId].every(validId) || req.body.produto_usado !== true) throw problem(400, 'Selecione passaporte, anúncio, atendimento e confirme que é um produto usado.')
    const id = await transaction(pool, async connection => {
      const [passports] = await connection.execute('SELECT * FROM passaportes WHERE id = ? AND proprietario_id = ? FOR UPDATE', [passportId, req.user.id])
      const [products] = await connection.execute("SELECT * FROM produtos WHERE id_produto = ? AND vendedor_id = ? AND status_aprovacao = 'aprovado' FOR UPDATE", [productId, req.user.id])
      if (!passports.length || !products.length) throw problem(404, 'Selecione um passaporte e um anúncio aprovado da sua conta.')
      const [contracts] = await connection.execute(`SELECT c.prestador_id FROM contratacoes_servico c JOIN passaporte_registros r ON r.contratacao_id = c.id_contratacao
        WHERE c.id_contratacao = ? AND c.cliente_id = ? AND c.status = 'concluido' AND r.passaporte_id = ?`, [contractId, req.user.id, passportId])
      if (!contracts.length || Number(contracts[0].prestador_id) === Number(req.user.id)) throw problem(409, 'Vincule ao passaporte um atendimento concluído por outro prestador.')
      const [pending] = await connection.execute("SELECT id FROM certificados_usado WHERE produto_id = ? AND status = 'pendente'", [productId])
      if (pending.length) throw problem(409, 'O anúncio já possui uma inspeção pendente.')
      await connection.execute("UPDATE certificados_usado SET status = 'revogado' WHERE produto_id = ? AND status = 'emitido'", [productId])
      const passport = passports[0]
      const snapshot = JSON.stringify({ nome: passport.nome, tipo: passport.tipo, modelo: passport.modelo, componentes: JSON.parse(passport.componentes) })
      const [result] = await connection.execute(`INSERT INTO certificados_usado (passaporte_id, produto_id, contratacao_id, solicitante_id, tecnico_id, ficha_hash, ficha_snapshot) VALUES (?, ?, ?, ?, ?, ?, ?)`, [passportId, productId, contractId, req.user.id, contracts[0].prestador_id, fingerprint(passport, products[0]), snapshot])
      await notify(connection, contracts[0].prestador_id, productId, `Solicitação de inspeção #${result.insertId}. Confira o equipamento em Certificados de usados.`)
      return result.insertId
    })
    res.status(201).json({ id, mensagem: 'Solicitação enviada. Somente o prestador desse atendimento pode emitir o laudo.' })
  }))
  router.post('/:id/laudo', route(async (req, res) => {
    const status = checklistResult(req.body.checklist)
    const report = clean(req.body.laudo, 20, 2000)
    if (!validId(req.params.id) || !status || !report || req.body.confirmo_inspecao !== true) throw problem(400, 'Preencha todos os critérios, o laudo e confirme a inspeção deste equipamento.')
    await transaction(pool, async connection => {
      const [rows] = await connection.execute('SELECT * FROM certificados_usado WHERE id = ? AND tecnico_id = ? FOR UPDATE', [req.params.id, req.user.id])
      if (!rows.length) throw problem(404, 'Inspeção não encontrada para este prestador.')
      const row = rows[0]
      if (row.status !== 'pendente') throw problem(409, 'Esta inspeção já foi respondida ou revogada.')
      const { passport, product } = await context(connection, row, true)
      if (!passport || !product || Number(passport.proprietario_id) !== Number(row.solicitante_id) || product.status_aprovacao !== 'aprovado' || fingerprint(passport, product) !== row.ficha_hash) throw problem(409, 'A ficha, o anúncio ou o dono mudou. Revogue e solicite uma nova inspeção.')
      const issued = new Date(), expires = new Date(issued.getTime() + 90 * 86400000)
      await connection.execute('UPDATE certificados_usado SET status = ?, checklist = ?, laudo = ?, emitido_em = ?, expira_em = ? WHERE id = ?', [status, JSON.stringify(req.body.checklist), report, issued, expires, row.id])
      await connection.execute('INSERT INTO passaporte_registros (passaporte_id, tipo, titulo, ocorrido_em, origem) VALUES (?, ?, ?, ?, ?)', [row.passaporte_id, 'inspecao', `Inspeção de usado #${row.id}: ${status === 'emitido' ? 'aprovada (validade de 90 dias)' : 'reprovada'}`, issued, 'ehtech'])
      await notify(connection, row.solicitante_id, row.produto_id, `Inspeção #${row.id}: ${status === 'emitido' ? 'certificado emitido por 90 dias' : 'reprovada; consulte o laudo'}.`)
    })
    res.json({ mensagem: status === 'emitido' ? 'Certificado emitido por 90 dias.' : 'Inspeção reprovada. O anúncio não receberá o selo.' })
  }))
  router.delete('/:id', route(async (req, res) => {
    if (!validId(req.params.id)) throw problem(400, 'Certificado inválido.')
    await transaction(pool, async connection => {
      const [rows] = await connection.execute('SELECT * FROM certificados_usado WHERE id = ? AND (solicitante_id = ? OR tecnico_id = ?) FOR UPDATE', [req.params.id, req.user.id, req.user.id])
      if (!rows.length) throw problem(404, 'Certificado não encontrado na sua conta.')
      const row = rows[0]
      await connection.execute("UPDATE certificados_usado SET status = 'revogado' WHERE id = ?", [row.id])
      await notify(connection, Number(row.solicitante_id) === Number(req.user.id) ? row.tecnico_id : row.solicitante_id, row.produto_id, `Inspeção #${row.id} revogada. O selo não está mais disponível.`)
    })
    res.json({ mensagem: 'Inspeção revogada.' })
  }))
  return router
}
module.exports = createCertificatesRouter
