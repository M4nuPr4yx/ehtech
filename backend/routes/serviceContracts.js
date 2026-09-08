const express = require('express')
const crypto = require('crypto')
const { autenticarToken } = require('../middleware/auth')

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
  c.status, c.valor_proposto, c.escopo_proposto, c.prazo_proposto, c.garantia_dias,
  c.observacoes_prestador, c.garantia_codigo, c.garantia_inicio_em, c.garantia_fim_em,
  c.orcamento_enviado_em, c.aceito_em, c.iniciado_em,
  c.concluido_em, c.cancelado_em, c.created_at, c.updated_at,
  s.slug, s.titulo AS servico_titulo, s.categoria,
  COALESCE(cliente.nome, cliente.username, 'Cliente') AS cliente_nome,
  COALESCE(prestador.nome, prestador.username, 'Prestador') AS prestador_nome,
  avaliacao.nota AS avaliacao_nota, avaliacao.comentario AS avaliacao_comentario,
  avaliacao.created_at AS avaliacao_em`

function textValue(value, maximum) {
  return typeof value === 'string' ? value.trim().slice(0, maximum) : ''
}

function moneyValue(value, { required = false } = {}) {
  if (value === '' || value === null || value === undefined) return required ? NaN : null
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 && number <= 10000000 ? Math.round(number * 100) / 100 : NaN
}

function normalizeContract(row, userId) {
  return {
    ...row,
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
    const serviceId = Number.parseInt(req.body.servico_id, 10)
    const description = textValue(req.body.descricao_problema, 2000)
    const modality = MODALITIES.has(req.body.modalidade) ? req.body.modalidade : ''
    const urgency = URGENCIES.has(req.body.urgencia) ? req.body.urgencia : ''
    const maximumBudget = moneyValue(req.body.orcamento_max)
    const availability = textValue(req.body.disponibilidade, 300)

    if (!Number.isInteger(serviceId) || serviceId <= 0) return res.status(400).json({ mensagem: 'Serviço inválido.' })
    if (description.length < 20) return res.status(400).json({ mensagem: 'Descreva a necessidade com pelo menos 20 caracteres.' })
    if (!modality || !urgency) return res.status(400).json({ mensagem: 'Modalidade ou urgência inválida.' })
    if (Number.isNaN(maximumBudget)) return res.status(400).json({ mensagem: 'Orçamento máximo inválido.' })
    if (availability.length < 5) return res.status(400).json({ mensagem: 'Informe sua disponibilidade para o atendimento.' })

    try {
      const [services] = await pool.execute(
        "SELECT id_servico, titulo, prestador_id FROM servicos WHERE id_servico = ? AND status = 'ativo' LIMIT 1",
        [serviceId]
      )
      if (!services.length) return res.status(404).json({ mensagem: 'Serviço não encontrado.' })
      const service = services[0]
      if (Number(service.prestador_id) === Number(req.user.id)) {
        return res.status(400).json({ mensagem: 'Você não pode solicitar o próprio serviço.' })
      }

      const [active] = await pool.execute(
        `SELECT id_contratacao FROM contratacoes_servico
         WHERE servico_id = ? AND cliente_id = ? AND status NOT IN ('concluido', 'cancelado') LIMIT 1`,
        [serviceId, req.user.id]
      )
      if (active.length) return res.status(409).json({ mensagem: 'Você já possui uma solicitação ativa para este serviço.' })

      const [result] = await pool.execute(
        `INSERT INTO contratacoes_servico
          (servico_id, cliente_id, prestador_id, descricao_problema, modalidade, urgencia, orcamento_max, disponibilidade)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [serviceId, req.user.id, service.prestador_id, description, modality, urgency, maximumBudget, availability]
      )
      await notify(pool, service.prestador_id, 'servico_solicitado', `Nova solicitação de orçamento para “${service.titulo}”.`)
      return res.status(201).json({ id: result.insertId, status: 'solicitado', mensagem: 'Solicitação enviada ao prestador.' })
    } catch (error) {
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
    const id = Number.parseInt(req.params.id, 10)
    const value = moneyValue(req.body.valor_proposto, { required: true })
    const scope = textValue(req.body.escopo_proposto, 3000)
    const deadline = textValue(req.body.prazo_proposto, 120)
    const warranty = Number.parseInt(req.body.garantia_dias, 10)
    const notes = textValue(req.body.observacoes_prestador, 2000)

    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ mensagem: 'Contratação inválida.' })
    if (!Number.isFinite(value) || value <= 0) return res.status(400).json({ mensagem: 'Informe um valor proposto válido.' })
    if (scope.length < 20 || deadline.length < 2) return res.status(400).json({ mensagem: 'Informe o escopo e o prazo da proposta.' })
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
    const id = Number.parseInt(req.params.id, 10)
    const nextStatus = textValue(req.body.status, 30)
    if (!Number.isInteger(id) || id <= 0 || !STATUS_LABELS[nextStatus]) {
      return res.status(400).json({ mensagem: 'Contratação ou status inválido.' })
    }

    try {
      const [rows] = await pool.execute(
        `SELECT c.cliente_id, c.prestador_id, c.status, c.garantia_dias, s.titulo
         FROM contratacoes_servico c JOIN servicos s ON s.id_servico = c.servico_id
         WHERE c.id_contratacao = ? LIMIT 1`,
        [id]
      )
      if (!rows.length) return res.status(404).json({ mensagem: 'Contratação não encontrada.' })
      const contract = rows[0]
      const isClient = Number(contract.cliente_id) === Number(req.user.id)
      const isProvider = Number(contract.prestador_id) === Number(req.user.id)
      if (!isClient && !isProvider) return res.status(403).json({ mensagem: 'Você não participa desta contratação.' })

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
      if (!allowed?.includes(nextStatus)) return res.status(409).json({ mensagem: 'Essa mudança de etapa não é permitida.' })

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

      const [result] = await pool.execute(
        `UPDATE contratacoes_servico SET ${assignments.join(', ')}
         WHERE id_contratacao = ? AND status = ?`,
        [...updateValues, id, contract.status]
      )
      if (!result.affectedRows) return res.status(409).json({ mensagem: 'A etapa mudou em outra sessão. Atualize a página.' })

      const recipientId = isProvider ? contract.cliente_id : contract.prestador_id
      const message = warrantyCode
        ? `“${contract.titulo}” foi concluído e a garantia ${warrantyCode} está ativa.`
        : `“${contract.titulo}” avançou para: ${STATUS_LABELS[nextStatus]}.`
      await notify(pool, recipientId, `servico_${nextStatus}`, message)
      return res.json({ status: nextStatus, garantia_codigo: warrantyCode, mensagem: warrantyCode ? 'Serviço concluído e garantia registrada.' : `Etapa atualizada para ${STATUS_LABELS[nextStatus]}.` })
    } catch (error) {
      console.error('[contratacoes/status] Erro:', error.message)
      return res.status(500).json({ mensagem: 'Não foi possível atualizar a etapa.' })
    }
  })

  router.post('/:id/avaliacao', async (req, res) => {
    const id = Number.parseInt(req.params.id, 10)
    const rating = Number.parseInt(req.body.nota, 10)
    const comment = textValue(req.body.comentario, 1000)
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ mensagem: 'Contratação inválida.' })
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ mensagem: 'A nota deve estar entre 1 e 5.' })
    if (comment && comment.length < 10) return res.status(400).json({ mensagem: 'O comentário deve ter pelo menos 10 caracteres.' })

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
