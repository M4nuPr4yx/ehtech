const express = require('express')
const crypto = require('crypto')
const { findComponent, LABELS } = require('../components/catalog')
const { integer } = require('../validation')

const TYPES = ['Computador', 'Notebook', 'Celular', 'Tablet', 'Periférico', 'Outro']
const EVENTS = ['manutencao', 'upgrade', 'reparo', 'inspecao']
const token = () => crypto.randomBytes(32).toString('hex')
const hash = value => crypto.createHash('sha256').update(value).digest('hex')
const validToken = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
const validId = value => /^[1-9]\d*$/.test(String(value)) && Number.isSafeInteger(Number(value))
const clean = (value, min, max) => typeof value === 'string' && value.trim().length >= min && value.trim().length <= max && !/[\x00-\x1f]/.test(value) ? value.trim() : null

async function equipment(body, pool) {
  const nome = clean(body.nome, 3, 100)
  const tipo = TYPES.includes(body.tipo) ? body.tipo : null
  const modelo = clean(body.modelo, 0, 120)
  const componentes = body.componentes
  if (!nome || !tipo || modelo === null || !Array.isArray(componentes) || componentes.length > 20) return null
  const normalized = []
  for (const item of componentes) {
    if (!item || typeof item !== 'object') return null
    if (item.componente_id === undefined || item.componente_id === null || item.componente_id === '') {
      const manual = { tipo: clean(item.tipo, 2, 50), modelo: clean(item.modelo, 2, 120) }
      if (!manual.tipo || !manual.modelo) return null
      normalized.push(manual)
      continue
    }
    const component = await findComponent(pool, item.componente_id)
    const quantity = integer(item.quantidade ?? 1)
    if (!component || !Number.isInteger(quantity) || quantity < 1 || quantity > 4 || (component.tipo !== 'memoria' && quantity !== 1)) return null
    normalized.push({ tipo: LABELS[component.tipo], modelo: `${component.marca} ${component.modelo}`, componente_id: component.id, revisao: component.revisao, quantidade: quantity })
  }
  return { nome, tipo, modelo, componentes: JSON.stringify(normalized) }
}

function fail(status, message) { throw Object.assign(new Error(message), { status }) }
const fields = 'id, nome, tipo, modelo, componentes, created_at, updated_at'
const recordFields = 'r.id, r.tipo, r.titulo, r.ocorrido_em, r.origem, r.garantia_fim_em'
const decode = row => ({ ...row, componentes: JSON.parse(row.componentes) })

function createPassportsRouter(pool, authenticate = require('../middleware/auth').autenticarToken) {
  const router = express.Router()
  // Capability links must never be cached, indexed or propagated as referrers.
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store')
    res.set('X-Robots-Tag', 'noindex, nofollow')
    res.set('Referrer-Policy', 'no-referrer')
    next()
  })
  const route = handler => async (req, res) => {
    try { await handler(req, res) } catch (error) {
      if (error.code === 'ER_DUP_ENTRY' || error.code === '23505') return res.status(409).json({ mensagem: 'Este serviço já está vinculado a um passaporte.' })
      if (!error.status) console.error('[passaportes] Falha ao processar operação.')
      res.status(error.status || 500).json({ mensagem: error.status ? error.message : 'Não foi possível processar o passaporte. Tente novamente.' })
    }
  }
  async function owned(req, action) {
    if (!validId(req.params.id)) fail(400, 'Passaporte inválido.')
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      const [rows] = await connection.execute('SELECT * FROM passaportes WHERE id = ? AND proprietario_id = ? FOR UPDATE', [req.params.id, req.user.id])
      if (!rows.length) fail(404, 'Passaporte não encontrado na sua conta.')
      const result = await action(connection, rows[0])
      await connection.commit()
      return result
    } catch (error) {
      await connection.rollback()
      throw error
    } finally { connection.release() }
  }
  async function record(connection, id, tipo, titulo, date, origin = 'manual') {
    await connection.execute('INSERT INTO passaporte_registros (passaporte_id, tipo, titulo, ocorrido_em, origem) VALUES (?, ?, ?, ?, ?)', [id, tipo, titulo, date, origin])
  }

  router.get('/publico/:codigo', route(async (req, res) => {
    if (!validToken(req.params.codigo)) fail(404, 'Link indisponível ou revogado.')
    const [rows] = await pool.execute(`SELECT ${fields} FROM passaportes WHERE publico_codigo = ?`, [req.params.codigo])
    if (!rows.length) fail(404, 'Link indisponível ou revogado.')
    const [registros] = await pool.execute(`SELECT ${recordFields} FROM passaporte_registros r JOIN passaportes p ON p.id = r.passaporte_id WHERE p.id = ? AND p.publico_codigo = ? ORDER BY r.ocorrido_em DESC, r.id DESC`, [rows[0].id, req.params.codigo])
    res.json({ ...decode(rows[0]), registros })
  }))

  router.use(authenticate)
  router.get('/', route(async (req, res) => {
    const [rows] = await pool.execute(`SELECT ${fields} FROM passaportes WHERE proprietario_id = ? ORDER BY updated_at DESC, id DESC`, [req.user.id])
    res.json(rows.map(decode))
  }))
  router.post('/', route(async (req, res) => {
    const data = await equipment(req.body, pool)
    if (!data) fail(400, 'Informe nome, tipo, modelo e até 20 componentes válidos.')
    const [result] = await pool.execute('INSERT INTO passaportes (proprietario_id, nome, tipo, modelo, componentes) VALUES (?, ?, ?, ?, ?)', [req.user.id, data.nome, data.tipo, data.modelo, data.componentes])
    res.status(201).json({ id: Number(result.insertId), mensagem: 'Passaporte criado. O histórico começa aqui.' })
  }))
  router.post('/receber', route(async (req, res) => {
    if (!validToken(req.body.codigo)) fail(400, 'Informe o código completo do convite.')
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      const [rows] = await connection.execute('SELECT id FROM passaportes WHERE transferencia_hash = ? AND destinatario_id = ? AND transferencia_expira_em > CURRENT_TIMESTAMP FOR UPDATE', [hash(req.body.codigo), req.user.id])
      if (!rows.length) fail(404, 'Convite inválido, expirado ou destinado a outra conta.')
      const id = rows[0].id
      await connection.execute('UPDATE passaportes SET proprietario_id = ?, publico_codigo = NULL, transferencia_hash = NULL, destinatario_id = NULL, transferencia_expira_em = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [req.user.id, id])
      await record(connection, id, 'transferencia', 'Passaporte recebido por um novo proprietário', new Date(), 'plataforma')
      await connection.commit()
      res.json({ id, mensagem: 'Passaporte recebido. O link público anterior foi revogado.' })
    } catch (error) { await connection.rollback(); throw error } finally { connection.release() }
  }))
  router.get('/:id', route(async (req, res) => {
    if (!validId(req.params.id)) fail(400, 'Passaporte inválido.')
    const [rows] = await pool.execute(`SELECT ${fields}, publico_codigo, transferencia_expira_em FROM passaportes WHERE id = ? AND proprietario_id = ?`, [req.params.id, req.user.id])
    if (!rows.length) fail(404, 'Passaporte não encontrado na sua conta.')
    const [registros] = await pool.execute(`SELECT ${recordFields} FROM passaporte_registros r JOIN passaportes p ON p.id = r.passaporte_id WHERE p.id = ? AND p.proprietario_id = ? ORDER BY r.ocorrido_em DESC, r.id DESC`, [req.params.id, req.user.id])
    res.json({ ...decode(rows[0]), registros })
  }))
  router.put('/:id', route(async (req, res) => {
    const data = await equipment(req.body, pool)
    if (!data) fail(400, 'Informe nome, tipo, modelo e até 20 componentes válidos.')
    await owned(req, async connection => {
      await connection.execute('UPDATE passaportes SET nome = ?, tipo = ?, modelo = ?, componentes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [data.nome, data.tipo, data.modelo, data.componentes, req.params.id])
      await record(connection, req.params.id, 'cadastro', 'Ficha de componentes atualizada pelo proprietário', new Date(), 'manual')
    })
    res.json({ mensagem: 'Ficha atualizada e alteração registrada no histórico.' })
  }))
  router.delete('/:id', route(async (req, res) => {
    await owned(req, connection => connection.execute('DELETE FROM passaportes WHERE id = ?', [req.params.id]))
    res.json({ mensagem: 'Passaporte e seu histórico excluídos.' })
  }))
  router.post('/:id/registros', route(async (req, res) => {
    const titulo = clean(req.body.titulo, 5, 180)
    const date = typeof req.body.data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.body.data) ? new Date(req.body.data + 'T00:00:00Z') : new Date(NaN)
    if (!titulo || !EVENTS.includes(req.body.tipo) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== req.body.data || date > new Date() || date.getUTCFullYear() < 1970) fail(400, 'Informe um título, categoria e data válida, sem data futura.')
    await owned(req, async connection => {
      await record(connection, req.params.id, req.body.tipo, titulo, date)
      await connection.execute('UPDATE passaportes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [req.params.id])
    })
    res.status(201).json({ mensagem: 'Registro manual adicionado.' })
  }))
  router.post('/:id/servicos', route(async (req, res) => {
    if (!validId(req.body.contratacao_id)) fail(400, 'Contratação inválida.')
    await owned(req, async connection => {
      const [rows] = await connection.execute(`SELECT s.titulo, c.concluido_em, c.garantia_fim_em FROM contratacoes_servico c JOIN servicos s ON s.id_servico = c.servico_id WHERE c.id_contratacao = ? AND c.cliente_id = ? AND c.status = 'concluido'`, [req.body.contratacao_id, req.user.id])
      if (!rows.length) fail(404, 'Escolha um serviço concluído contratado pela sua conta.')
      await connection.execute("INSERT INTO passaporte_registros (passaporte_id, tipo, titulo, ocorrido_em, origem, contratacao_id, garantia_fim_em) VALUES (?, 'servico', ?, ?, 'ehtech', ?, ?)", [req.params.id, rows[0].titulo, rows[0].concluido_em, req.body.contratacao_id, rows[0].garantia_fim_em])
      await connection.execute('UPDATE passaportes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [req.params.id])
    })
    res.status(201).json({ mensagem: 'Serviço concluído vinculado. O vínculo com este equipamento foi informado por você.' })
  }))
  router.post('/:id/compartilhamento', route(async (req, res) => {
    const codigo = token()
    await owned(req, connection => connection.execute('UPDATE passaportes SET publico_codigo = ? WHERE id = ?', [codigo, req.params.id]))
    res.json({ codigo, mensagem: 'Link ativado. Quem tiver o link poderá consultar a ficha e o histórico.' })
  }))
  router.delete('/:id/compartilhamento', route(async (req, res) => {
    await owned(req, connection => connection.execute('UPDATE passaportes SET publico_codigo = NULL WHERE id = ?', [req.params.id]))
    res.json({ mensagem: 'Link público revogado.' })
  }))
  router.post('/:id/transferencia', route(async (req, res) => {
    const username = clean(req.body.username, 3, 30)
    if (!username) fail(400, 'Informe o nome de usuário do destinatário.')
    const codigo = token()
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await owned(req, async connection => {
      const [users] = await connection.execute('SELECT id_usuario FROM usuarios WHERE username = ?', [username])
      if (!users.length || Number(users[0].id_usuario) === Number(req.user.id)) fail(400, 'Escolha outra conta existente para receber o equipamento.')
      await connection.execute('UPDATE passaportes SET transferencia_hash = ?, destinatario_id = ?, transferencia_expira_em = ? WHERE id = ?', [hash(codigo), users[0].id_usuario, expires, req.params.id])
    })
    res.json({ codigo, expira_em: expires.toISOString(), mensagem: 'Convite válido por 24 horas. Só a conta indicada poderá aceitá-lo.' })
  }))
  router.delete('/:id/transferencia', route(async (req, res) => {
    await owned(req, connection => connection.execute('UPDATE passaportes SET transferencia_hash = NULL, destinatario_id = NULL, transferencia_expira_em = NULL WHERE id = ?', [req.params.id]))
    res.json({ mensagem: 'Convite cancelado.' })
  }))
  return router
}

module.exports = createPassportsRouter
