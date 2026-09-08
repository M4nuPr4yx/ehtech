const express = require('express')

const SORTS = {
  recentes: 's.id_servico DESC',
  'menor-preco': '(s.preco_base IS NULL), s.preco_base ASC, s.id_servico DESC',
  'maior-preco': '(s.preco_base IS NULL), s.preco_base DESC, s.id_servico DESC'
}
const MODALITIES = new Set(['presencial', 'remoto', 'hibrido'])

function boundedInteger(value, fallback, maximum) {
  const number = Number.parseInt(value, 10)
  return Number.isFinite(number) && number > 0 ? Math.min(number, maximum) : fallback
}

function parseHighlights(value) {
  if (Array.isArray(value)) return value
  try {
    const parsed = JSON.parse(value || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function normalizeService(service) {
  return {
    ...service,
    preco_base: service.preco_base === null ? null : Number(service.preco_base),
    prestador_nota: Number(service.prestador_nota) || 0,
    prestador_avaliacoes: Number(service.prestador_avaliacoes) || 0,
    destaques: parseHighlights(service.destaques)
  }
}

function createServicesRouter(pool) {
  const router = express.Router()
  const fields = `s.id_servico, s.slug, s.titulo, s.descricao, s.categoria, s.preco_base,
    s.tipo_preco, s.prazo, s.modalidade, s.regiao, s.destaques, s.prestador_id,
    s.created_at, COALESCE(u.nome, u.username, 'Especialista EHtech') AS prestador, u.foto AS prestador_foto,
    COALESCE(reputacao.media, 0) AS prestador_nota, COALESCE(reputacao.total, 0) AS prestador_avaliacoes`
  const ratingJoin = `LEFT JOIN (
    SELECT prestador_id, ROUND(AVG(nota), 1) AS media, COUNT(*) AS total
    FROM avaliacoes_servico GROUP BY prestador_id
  ) reputacao ON reputacao.prestador_id = s.prestador_id`

  router.get('/', async (req, res) => {
    const page = boundedInteger(req.query.page, 1, 100000)
    const limit = boundedInteger(req.query.limit, 9, 24)
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : ''
    const category = typeof req.query.categoria === 'string' ? req.query.categoria.trim().slice(0, 60) : ''
    const modality = MODALITIES.has(req.query.modalidade) ? req.query.modalidade : ''
    const orderBy = SORTS[req.query.ordenacao] || SORTS.recentes
    const conditions = ["s.status = 'ativo'"]
    const values = []

    if (search) {
      conditions.push('(s.titulo LIKE ? OR s.descricao LIKE ? OR s.categoria LIKE ?)')
      const term = `%${search}%`
      values.push(term, term, term)
    }
    if (category) { conditions.push('s.categoria = ?'); values.push(category) }
    if (modality) { conditions.push('s.modalidade = ?'); values.push(modality) }

    const where = `WHERE ${conditions.join(' AND ')}`
    try {
      const [[count]] = await pool.execute(`SELECT COUNT(*) AS total FROM servicos s ${where}`, values)
      const total = Number(count.total) || 0
      const totalPages = Math.max(1, Math.ceil(total / limit))
      const currentPage = Math.min(page, totalPages)
      const offset = (currentPage - 1) * limit
      const [rows] = await pool.execute(
        `SELECT ${fields} FROM servicos s LEFT JOIN usuarios u ON u.id_usuario = s.prestador_id ${ratingJoin}
         ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
        [...values, limit, offset]
      )
      res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
      return res.json({ items: rows.map(normalizeService), total, page: currentPage, limit, totalPages })
    } catch (error) {
      console.error('[servicos/catalogo] Erro:', error.message)
      return res.status(500).json({ mensagem: 'Não foi possível carregar os serviços.' })
    }
  })

  router.get('/reputacao/prestador/:id', async (req, res) => {
    const providerId = Number.parseInt(req.params.id, 10)
    if (!Number.isInteger(providerId) || providerId <= 0) return res.status(400).json({ mensagem: 'Prestador inválido.' })
    try {
      const [[summary]] = await pool.execute(
        'SELECT ROUND(AVG(nota), 1) AS media, COUNT(*) AS total FROM avaliacoes_servico WHERE prestador_id = ?',
        [providerId]
      )
      const [reviews] = await pool.execute(
        `SELECT a.nota, a.comentario, a.created_at,
          COALESCE(cliente.nome, cliente.username, 'Cliente EHtech') AS avaliador,
          s.titulo AS servico
         FROM avaliacoes_servico a
         JOIN usuarios cliente ON cliente.id_usuario = a.cliente_id
         JOIN servicos s ON s.id_servico = a.servico_id
         WHERE a.prestador_id = ? ORDER BY a.created_at DESC, a.id_avaliacao DESC LIMIT 20`,
        [providerId]
      )
      res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
      return res.json({ media: Number(summary.media) || 0, total: Number(summary.total) || 0, avaliacoes: reviews })
    } catch (error) {
      console.error('[servicos/reputacao] Erro:', error.message)
      return res.status(500).json({ mensagem: 'Não foi possível carregar a reputação técnica.' })
    }
  })

  router.get('/:slug', async (req, res) => {
    const slug = String(req.params.slug || '').trim().slice(0, 160)
    if (!/^[a-z0-9-]+$/.test(slug)) return res.status(400).json({ mensagem: 'Serviço inválido.' })
    try {
      const [rows] = await pool.execute(
        `SELECT ${fields} FROM servicos s LEFT JOIN usuarios u ON u.id_usuario = s.prestador_id ${ratingJoin}
         WHERE s.slug = ? AND s.status = 'ativo' LIMIT 1`,
        [slug]
      )
      if (!rows.length) return res.status(404).json({ mensagem: 'Serviço não encontrado.' })
      res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
      return res.json(normalizeService(rows[0]))
    } catch (error) {
      console.error('[servicos/detalhe] Erro:', error.message)
      return res.status(500).json({ mensagem: 'Não foi possível carregar este serviço.' })
    }
  })

  return router
}

module.exports = createServicesRouter
