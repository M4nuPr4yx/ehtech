const express = require('express')
const crypto = require('crypto')
const { autenticarToken } = require('../middleware/auth')
const { integer, money, cleanText } = require('../validation')
const { findCombo } = require('../differentials')
const { FIELDS, snapshotListing } = require('../service-listings')
const { problem, transaction } = require('../addresses')

const MODALITIES = new Set(['presencial', 'remoto', 'hibrido'])
const URGENCIES = new Set(['flexivel', 'normal', 'urgente'])
const STATUS_LABELS = {
  solicitado: 'Solicitado',
  orcamento_enviado: 'Orçamento enviado',
  aceito: 'Aceito',
  em_execucao: 'Em execução',
  concluido: 'Concluído',
  cancelado: 'Cancelado'
}

const contractFields = `c.id_contratacao, c.servico_id, c.cliente_id, c.prestador_id,
  c.descricao_problema, c.modalidade, c.urgencia, c.orcamento_max, c.disponibilidade,
  c.status, c.servico_snapshot, c.valor_proposto, c.escopo_proposto, c.prazo_proposto, c.garantia_dias,
  c.observacoes_prestador, c.garantia_codigo, c.garantia_inicio_em, c.garantia_fim_em,
  c.orcamento_enviado_em, c.aceito_em, c.iniciado_em,
  c.concluido_em, c.cancelado_em, c.created_at, c.updated_at, c.combo_snapshot,
  s.slug, s.titulo AS servico_titulo, s.categoria,
  COALESCE(cliente.nome, cliente.username, 'Cliente') AS cliente_nome,
  COALESCE(prestador.nome, prestador.username, 'Prestador') AS prestador_nome,
  avaliacao.nota AS avaliacao_nota, avaliacao.comentario AS avaliacao_comentario,
  avaliacao.created_at AS avaliacao_em`

function moneyValue(value, { required = false } = {}) {
  if (value === '' || value === null || value === undefined) return required ? NaN : null
  return money(value, { min: required ? 0.01 : 0, max: 10000000 })
}

function quoteRevision(row) {
  if (row.status !== 'orcamento_enviado') return null
  return crypto.createHash('sha256').update(JSON.stringify([
    row.id_contratacao, Number(row.valor_proposto), row.escopo_proposto, row.prazo_proposto,
    Number(row.garantia_dias), row.observacoes_prestador ?? null,
  ])).digest('hex')
}

function normalizeContract(row, userId) {
  const snapshot = row.servico_snapshot ? JSON.parse(row.servico_snapshot) : null
  return {
    ...row,
    servico_titulo: snapshot?.titulo || row.servico_titulo,
    categoria: snapshot?.categoria || row.categoria,
    servico_snapshot: snapshot,
    combo_snapshot: row.combo_snapshot ? JSON.parse(row.combo_snapshot) : null,
    orcamento_revisao: quoteRevision(row),
    orcamento_max: row.orcamento_max === null ? null : Number(row.orcamento_max),
    valor_proposto: row.valor_proposto === null ? null : Number(row.valor_proposto),
    garantia_dias: row.garantia_dias === null ? null : Number(row.garantia_dias),
    papel: Number(row.prestador_id) === Number(userId) ? 'prestador' : 'cliente'
  }
}

async function notify(pool, usuarioId, tipo, mensagem) {
  try {
    await pool.execute(
      'INSERT INTO notificacoes (usuario_id, produto_id, tipo, mensagem) VALUES (?, NULL, ?, ?)',
      [usuarioId, tipo, mensagem]
    )
  } catch (error) {
    console.error('[contratacoes/notificacao] Erro:', error.message)
  }
}

function createServiceContractsRouter(pool) {
  const router = express.Router()
  router.use(autenticarToken)

  router.post('/', async (req, res) => {
    const serviceId = integer(req.body.servico_id)
    const description = cleanText(req.body.descricao_problema, 2000, { multiline: true })
    const modality = MODALITIES.has(req.body.modalidade) ? req.body.modalidade : ''
    const urgency = URGENCIES.has(req.body.urgencia) ? req.body.urgencia : ''
    const maximumBudget = moneyValue(req.body.orcamento_max)
    const availability = cleanText(req.body.disponibilidade, 300)

    if (!Number.isInteger(serviceId) || serviceId <= 0) return res.status(400).json({ mensagem: 'Serviço inválido.' })
    if (!description || description.length < 20) return res.status(400).json({ mensagem: 'Descreva a necessidade com pelo menos 20 caracteres.' })
    if (!modality || !urgency) return res.status(400).json({ mensagem: 'Modalidade ou urgência inválida.' })
    if (Number.isNaN(maximumBudget)) return res.status(400).json({ mensagem: 'Orçamento máximo inválido.' })
    if (!availability || availability.length < 5) return res.status(400).json({ mensagem: 'Informe sua disponibilidade para o atendimento.' })

    try {
      const combo = req.body.combo_id === undefined ? null : await findCombo(pool, req.body.combo_id)
      if (combo && Number(combo.servico_id) !== serviceId) throw problem(400, 'O serviço não pertence ao combo selecionado.')
      if (combo && Number(combo.criador_id) === Number(req.user.id)) throw problem(400, 'Você não pode solicitar seu próprio combo.')
      const { id, service } = await transaction(pool, async connection => {
        // Serializa solicitações concorrentes para o mesmo anúncio.
        const [[service]] = await connection.execute(
          `SELECT id_servico, ${FIELDS.join(', ')}, politicas_versao, prestador_id
           FROM servicos WHERE id_servico = ? AND status = 'ativo' AND status_aprovacao = 'aprovado' FOR UPDATE`,
          [serviceId]
        )
        if (!service) throw problem(404, 'Serviço não encontrado.')
        if (service.modalidade !== 'hibrido' && modality !== service.modalidade) throw problem(400, 'Escolha uma modalidade oferecida neste anúncio.')
        if (Number(service.prestador_id) === Number(req.user.id)) throw problem(400, 'Você não pode solicitar o próprio serviço.')

        const [active] = await connection.execute(
          `SELECT id_contratacao FROM contratacoes_servico
           WHERE servico_id = ? AND cliente_id = ? AND status NOT IN ('concluido', 'cancelado') LIMIT 1`,
          [serviceId, req.user.id]
        )
        if (active.length) throw problem(409, 'Você já possui uma solicitação ativa para este serviço.')

        const [result] = await connection.execute(
          `INSERT INTO contratacoes_servico
            (servico_id, cliente_id, prestador_id, descricao_problema, modalidade, urgencia, orcamento_max, disponibilidade, combo_snapshot, servico_snapshot)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [serviceId, req.user.id, service.prestador_id, description, modality, urgency, maximumBudget, availability, combo ? JSON.stringify({ id: combo.id, titulo: combo.titulo, produto_id: combo.produto_id, produto_nome: combo.produto_nome, produto_preco: combo.produto_preco, servico_preco_base: combo.preco_base, total_estimado: combo.total_estimado }) : null, JSON.stringify(snapshotListing(service))]
        )
        return { id: result.insertId, service }
      })
      await notify(pool, service.prestador_id, 'servico_solicitado', `Nova solicitação de orçamento para “${service.titulo}”.`)
      return res.status(201).json({ id, status: 'solicitado', mensagem: 'Solicitação enviada ao prestador.' })
    } catch (error) {
      if (error.status) return res.status(error.status).json({ mensagem: error.message })
      console.error('[contratacoes/criar] Erro:', error.message)
      return res.status(500).json({ mensagem: 'Não foi possível enviar a solicitação.' })
    }
  })

  router.get('/', async (req, res) => {
    try {
      const [rows] = await pool.execute(
        `SELECT ${contractFields}
         FROM contratacoes_servico c
         JOIN servicos s ON s.id_servico = c.servico_id
         JOIN usuarios cliente ON cliente.id_usuario = c.cliente_id
         JOIN usuarios prestador ON prestador.id_usuario = c.prestador_id
         LEFT JOIN avaliacoes_servico avaliacao ON avaliacao.contratacao_id = c.id_contratacao
         WHERE c.cliente_id = ? OR c.prestador_id = ?
         ORDER BY c.updated_at DESC, c.id_contratacao DESC LIMIT 100`,
        [req.user.id, req.user.id]
      )
      return res.json(rows.map((row) => normalizeContract(row, req.user.id)))
    } catch (error) {
      console.error('[contratacoes/listar] Erro:', error.message)
      return res.status(500).json({ mensagem: 'Não foi possível carregar as contratações.' })
    }
  })

  router.patch('/:id/orcamento', async (req, res) => {
    const id = integer(req.params.id)
    const value = moneyValue(req.body.valor_proposto, { required: true })
    const scope = cleanText(req.body.escopo_proposto, 3000, { multiline: true })
    const deadline = cleanText(req.body.prazo_proposto, 120)
    const warranty = integer(req.body.garantia_dias)
    const notes = cleanText(req.body.observacoes_prestador ?? '', 2000, { multiline: true })

    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ mensagem: 'Contratação inválida.' })
    if (!Number.isFinite(value) || value <= 0) return res.status(400).json({ mensagem: 'Informe um valor proposto válido.' })
    if (!scope || scope.length < 20 || !deadline || deadline.length < 2) return res.status(400).json({ mensagem: 'Informe o escopo e o prazo da proposta.' })
    if (notes === null) return res.status(400).json({ mensagem: 'Informe observações válidas para a proposta.' })
    if (!Number.isInteger(warranty) || warranty < 0 || warranty > 3650) return res.status(400).json({ mensagem: 'Garantia inválida.' })

    try {
      const [rows] = await pool.execute(
        `SELECT c.cliente_id, c.prestador_id, c.status, s.titulo
         FROM contratacoes_servico c JOIN servicos s ON s.id_servico = c.servico_id
         WHERE c.id_contratacao = ? LIMIT 1`,
        [id]
      )
      if (!rows.length) return res.status(404).json({ mensagem: 'Contratação não encontrada.' })
      const contract = rows[0]
      if (Number(contract.prestador_id) !== Number(req.user.id)) return res.status(403).json({ mensagem: 'Apenas o prestador pode enviar o orçamento.' })
      if (!['solicitado', 'orcamento_enviado'].includes(contract.status)) return res.status(409).json({ mensagem: 'Este orçamento não pode mais ser alterado.' })

      const [result] = await pool.execute(
        `UPDATE contratacoes_servico SET valor_proposto = ?, escopo_proposto = ?, prazo_proposto = ?,
         garantia_dias = ?, observacoes_prestador = ?, status = 'orcamento_enviado',
         orcamento_enviado_em = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id_contratacao = ? AND prestador_id = ? AND status IN ('solicitado', 'orcamento_enviado')`,
        [value, scope, deadline, warranty, notes || null, id, req.user.id]
      )
      if (!result.affectedRows) return res.status(409).json({ mensagem: 'A etapa mudou em outra sessão. Atualize a página.' })
      await notify(pool, contract.cliente_id, 'orcamento_enviado', `Seu orçamento para “${contract.titulo}” está pronto para análise.`)
      return res.json({ status: 'orcamento_enviado', mensagem: 'Orçamento enviado ao cliente.' })
    } catch (error) {
      console.error('[contratacoes/orcamento] Erro:', error.message)
      return res.status(500).json({ mensagem: 'Não foi possível salvar o orçamento.' })
    }
  })

  router.patch('/:id/status', async (req, res) => {
    const id = integer(req.params.id)
    const nextStatus = cleanText(req.body.status, 30)
    const revision = req.body.orcamento_revisao
    if (!Number.isInteger(id) || id <= 0 || !Object.hasOwn(STATUS_LABELS, nextStatus)) {
      return res.status(400).json({ mensagem: 'Contratação ou status inválido.' })
    }
    if (revision !== undefined && (nextStatus !== 'aceito' || typeof revision !== 'string' || !/^[a-f0-9]{64}$/.test(revision))) {
      return res.status(400).json({ mensagem: 'Revisão do orçamento inválida.' })
    }

    try {
      const { contract, recipientId, warrantyCode } = await transaction(pool, async connection => {
        const [rows] = await connection.execute(
          `SELECT c.id_contratacao, c.cliente_id, c.prestador_id, c.status, c.garantia_dias,
             c.valor_proposto, c.escopo_proposto, c.prazo_proposto, c.observacoes_prestador,
             (SELECT titulo FROM servicos WHERE id_servico = c.servico_id) AS titulo
           FROM contratacoes_servico c WHERE c.id_contratacao = ? FOR UPDATE`,
          [id]
        )
        if (!rows.length) throw problem(404, 'Contratação não encontrada.')
        const contract = rows[0]
        const isClient = Number(contract.cliente_id) === Number(req.user.id)
        const isProvider = Number(contract.prestador_id) === Number(req.user.id)
        if (!isClient && !isProvider) throw problem(403, 'Você não participa desta contratação.')

        const clientTransitions = {
          solicitado: ['cancelado'],
          orcamento_enviado: ['aceito', 'cancelado'],
          aceito: ['cancelado']
        }
        const providerTransitions = {
          solicitado: ['cancelado'],
          orcamento_enviado: ['cancelado'],
          aceito: ['em_execucao', 'cancelado'],
          em_execucao: ['concluido']
        }
        const allowed = isProvider ? providerTransitions[contract.status] : clientTransitions[contract.status]
        if (!allowed?.includes(nextStatus)) throw problem(409, 'Essa mudança de etapa não é permitida.')
        if (revision !== undefined && revision !== quoteRevision(contract)) {
          throw problem(409, 'O prestador revisou o orçamento. Confira a nova proposta antes de aceitar.', { code: 'QUOTE_CHANGED' })
        }

        const timestampColumns = {
          aceito: 'aceito_em', em_execucao: 'iniciado_em', concluido: 'concluido_em', cancelado: 'cancelado_em'
        }
        const timestampColumn = timestampColumns[nextStatus]
        const now = new Date()
        const assignments = ['status = ?', `${timestampColumn} = ?`, 'updated_at = ?']
        const updateValues = [nextStatus, now, now]
        let warrantyCode = null

        if (nextStatus === 'concluido' && Number(contract.garantia_dias) > 0) {
          const warrantyDays = Math.min(Number(contract.garantia_dias), 3650)
          const warrantyEnd = new Date(now.getTime() + warrantyDays * 24 * 60 * 60 * 1000)
          warrantyCode = `EHT-${String(id).padStart(6, '0')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
          assignments.push('garantia_codigo = ?', 'garantia_inicio_em = ?', 'garantia_fim_em = ?')
          updateValues.push(warrantyCode, now, warrantyEnd)
        }

        const [result] = await connection.execute(
          `UPDATE contratacoes_servico SET ${assignments.join(', ')}
           WHERE id_contratacao = ? AND status = ?`,
          [...updateValues, id, contract.status]
        )
        if (!result.affectedRows) throw problem(409, 'A etapa mudou em outra sessão. Atualize a página.')

        return { contract, recipientId: isProvider ? contract.cliente_id : contract.prestador_id, warrantyCode }
      })
      const message = warrantyCode
        ? `“${contract.titulo}” foi concluído e a garantia ${warrantyCode} está ativa.`
        : `“${contract.titulo}” avançou para: ${STATUS_LABELS[nextStatus]}.`
      await notify(pool, recipientId, `servico_${nextStatus}`, message)
      return res.json({ status: nextStatus, garantia_codigo: warrantyCode, mensagem: warrantyCode ? 'Serviço concluído e garantia registrada.' : `Etapa atualizada para ${STATUS_LABELS[nextStatus]}.` })
    } catch (error) {
      if (error.status) return res.status(error.status).json({ mensagem: error.message, ...(error.code && { code: error.code }) })
      console.error('[contratacoes/status] Erro:', error.message)
      return res.status(500).json({ mensagem: 'Não foi possível atualizar a etapa.' })
    }
  })

  router.post('/:id/avaliacao', async (req, res) => {
    const id = integer(req.params.id)
    const rating = integer(req.body.nota)
    const comment = cleanText(req.body.comentario ?? '', 1000, { multiline: true })
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ mensagem: 'Contratação inválida.' })
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ mensagem: 'A nota deve estar entre 1 e 5.' })
    if (comment === null || (comment && comment.length < 10)) return res.status(400).json({ mensagem: 'Use um comentário válido com pelo menos 10 caracteres ou deixe o campo vazio.' })

    try {
      const [rows] = await pool.execute(
        `SELECT c.servico_id, c.cliente_id, c.prestador_id, c.status, s.titulo
         FROM contratacoes_servico c JOIN servicos s ON s.id_servico = c.servico_id
         WHERE c.id_contratacao = ? LIMIT 1`,
        [id]
      )
      if (!rows.length) return res.status(404).json({ mensagem: 'Contratação não encontrada.' })
      const contract = rows[0]
      if (Number(contract.cliente_id) !== Number(req.user.id)) return res.status(403).json({ mensagem: 'Apenas o cliente desta contratação pode avaliar.' })
      if (contract.status !== 'concluido') return res.status(409).json({ mensagem: 'A avaliação é liberada após a conclusão do serviço.' })

      const [existing] = await pool.execute('SELECT id_avaliacao FROM avaliacoes_servico WHERE contratacao_id = ? LIMIT 1', [id])
      if (existing.length) return res.status(409).json({ mensagem: 'Esta contratação já foi avaliada.' })

      await pool.execute(
        `INSERT INTO avaliacoes_servico (contratacao_id, servico_id, prestador_id, cliente_id, nota, comentario)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, contract.servico_id, contract.prestador_id, contract.cliente_id, rating, comment || null]
      )
      await notify(pool, contract.prestador_id, 'servico_avaliado', `Você recebeu uma avaliação de ${rating} estrela${rating === 1 ? '' : 's'} em “${contract.titulo}”.`)
      return res.status(201).json({ mensagem: 'Avaliação publicada na reputação técnica do prestador.' })
    } catch (error) {
      if (error?.code === 'ER_DUP_ENTRY' || error?.code === '23505' || /duplicate|unique/i.test(error?.message || '')) {
        return res.status(409).json({ mensagem: 'Esta contratação já foi avaliada.' })
      }
      console.error('[contratacoes/avaliacao] Erro:', error.message)
      return res.status(500).json({ mensagem: 'Não foi possível publicar a avaliação.' })
    }
  })

  return router
}

module.exports = createServiceContractsRouter
