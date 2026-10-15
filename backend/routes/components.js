const express = require('express')
const { integer } = require('../validation')
const { TYPES, normalizeInput, decode } = require('../components/catalog')
const { normalizeSelection, verify } = require('../components/check')
const rateLimit = require('express-rate-limit')
const { createCompatibilityAssistant, AssistantError } = require('../components/ai')

function createComponentsRouter(pool, verifyAdmin = require('../middleware/auth').verifyAdmin, { assistant = createCompatibilityAssistant() } = {}) {
  const router = express.Router()
  const route = handler => async (req, res) => {
    try { await handler(req, res) } catch (error) {
      if (error instanceof AssistantError) {
        if (error.status === 429) res.set('Retry-After', '60')
        if (!res.destroyed) res.status(error.status).json({ mensagem: error.message, codigo: error.code })
        return
      }
      if (['ER_DUP_ENTRY', '23505'].includes(error.code)) return res.status(409).json({ mensagem: 'Já existe uma ficha com este identificador.' })
      console.error('[componentes] Falha ao processar operação.')
      res.status(500).json({ mensagem: 'Não foi possível consultar ou atualizar as fichas técnicas.' })
    }
  }
  router.get('/', route(async (req, res) => {
    const tipo = req.query.tipo
    const search = req.query.busca || ''
    if ((tipo && !TYPES.includes(tipo)) || typeof search !== 'string' || search.length > 100) return res.status(400).json({ mensagem: 'Filtro inválido.' })
    const params = []
    let where = "ativo = TRUE AND status = 'verificado'"
    if (tipo) { where += ' AND tipo = ?'; params.push(tipo) }
    if (search) { where += ' AND (LOWER(modelo) LIKE ? OR LOWER(marca) LIKE ?)'; params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`) }
    const [rows] = await pool.execute(`SELECT * FROM componentes_tecnicos WHERE ${where} ORDER BY marca, modelo LIMIT 100`, params)
    res.json({ items: rows.map(decode), limite: 100 })
  }))
  async function readAnalysis(body) {
    const selection = normalizeSelection(body)
    if (!selection) throw new AssistantError('selecao_invalida', 'Selecione modelos válidos, até quatro kits distintos (quantidade de 1 a 4) e uma BIOS de quatro dígitos.', 400)
    const ids = [selection.processador_id, selection.placa_mae_id, ...selection.memorias.map(item => item.componente_id)].filter(Boolean)
    let rows = []
    if (ids.length) [rows] = await pool.execute(`SELECT * FROM componentes_tecnicos WHERE id IN (${ids.map(() => '?').join(', ')})`, ids)
    const catalogue = rows.map(decode)
    for (const [id, type] of [[selection.processador_id, 'processador'], [selection.placa_mae_id, 'placa_mae'], ...selection.memorias.map(item => [item.componente_id, 'memoria'])]) {
      if (catalogue.some(item => item.id === id && item.tipo !== type)) throw new AssistantError('categoria_invalida', 'Um componente foi selecionado na categoria errada.', 400)
    }
    return verify(selection, catalogue)
  }
  router.post('/verificar', route(async (req, res) => {
    res.set('Cache-Control', 'no-store').json(await readAnalysis(req.body))
  }))
  router.get('/ia/status', route(async (req, res) => {
    res.set('Cache-Control', 'no-store').json(await assistant.status())
  }))
  const aiLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false, message: { mensagem: 'Limite de explicações por IA atingido. Aguarde alguns minutos.', codigo: 'limite_ia' } })
  router.post('/ia/explicar', aiLimiter, route(async (req, res) => {
    res.set('Cache-Control', 'no-store')
    if (!req.body || Object.keys(req.body).some(key => !['processador_id', 'placa_mae_id', 'bios', 'memorias'].includes(key)) || Buffer.byteLength(JSON.stringify(req.body)) > 4096) throw new AssistantError('selecao_invalida', 'Envie somente a seleção de peças e a BIOS. A análise é calculada pelo servidor.', 400)
    const analysis = await readAnalysis(req.body)
    const controller = new AbortController()
    const disconnect = () => { if (!res.writableEnded) controller.abort() }
    res.on('close', disconnect)
    try {
      const explanation = await assistant.explain(analysis, { signal: controller.signal })
      if (!res.destroyed) res.json({ verificacao: analysis, ia: explanation })
    } finally { res.removeListener('close', disconnect) }
  }))
  router.get('/admin', verifyAdmin, route(async (req, res) => {
    const [rows] = await pool.execute('SELECT * FROM componentes_tecnicos ORDER BY tipo, marca, modelo')
    res.json(rows.map(decode))
  }))
  router.post('/admin', verifyAdmin, route(async (req, res) => {
    const data = normalizeInput(req.body)
    if (!data) return res.status(400).json({ mensagem: 'Confira identificação, especificações, status, atividade e fontes HTTPS da ficha.' })
    const [result] = await pool.execute('INSERT INTO componentes_tecnicos (slug, tipo, marca, modelo, especificacoes, fontes, status, ativo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [data.slug, data.tipo, data.marca, data.modelo, JSON.stringify(data.especificacoes), JSON.stringify(data.fontes), data.status, data.ativo])
    res.status(201).json({ id: Number(result.insertId), mensagem: 'Ficha técnica cadastrada.' })
  }))
  router.put('/admin/:id', verifyAdmin, route(async (req, res) => {
    const id = integer(req.params.id), revision = integer(req.body.revisao), data = normalizeInput(req.body)
    if (!data || !Number.isInteger(id) || id <= 0 || !Number.isInteger(revision) || revision < 1) return res.status(400).json({ mensagem: 'Ficha ou revisão inválida.' })
    const [rows] = await pool.execute('SELECT slug, tipo FROM componentes_tecnicos WHERE id = ?', [id])
    if (!rows.length) return res.status(404).json({ mensagem: 'Ficha não encontrada.' })
    if (rows[0].slug !== data.slug || rows[0].tipo !== data.tipo) return res.status(400).json({ mensagem: 'O identificador e a categoria não podem mudar. Cadastre outro modelo.' })
    const [result] = await pool.execute('UPDATE componentes_tecnicos SET marca = ?, modelo = ?, especificacoes = ?, fontes = ?, status = ?, ativo = ?, revisao = revisao + 1, revisado_em = CURRENT_TIMESTAMP WHERE id = ? AND revisao = ?',
      [data.marca, data.modelo, JSON.stringify(data.especificacoes), JSON.stringify(data.fontes), data.status, data.ativo, id, revision])
    if (!result.affectedRows) return res.status(409).json({ mensagem: 'A ficha foi alterada em outra sessão. Recarregue antes de salvar.' })
    res.json({ mensagem: 'Ficha revisada. Novas verificações utilizarão esta versão.' })
  }))
  return router
}

module.exports = createComponentsRouter
