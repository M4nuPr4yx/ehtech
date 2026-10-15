const express = require('express')
const { autenticarToken } = require('../middleware/auth')
const { integer } = require('../validation')
const { ADDRESS_FIELDS, validateAddress, addressFingerprint, transaction, problem, lookupCep } = require('../addresses')

module.exports = function createAddressesRouter(pool) {
  const router = express.Router()
  router.use(autenticarToken)
  router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next() })
  const action = callback => async (req, res) => {
    try { await callback(req, res) } catch (error) {
      res.status(error.status || 500).json({ mensagem: error.status ? error.message : 'Não foi possível atualizar seus endereços.', ...(error.errors ? { erros: error.errors } : {}) })
    }
  }
  async function owned(connection, req) {
    const id = integer(req.params.id)
    if (!(id > 0)) throw problem(400, 'Endereço inválido.')
    const [rows] = await connection.execute('SELECT * FROM enderecos WHERE id = ? AND usuario_id = ? AND excluido = FALSE FOR UPDATE', [id, req.user.id])
    if (!rows.length) throw problem(404, 'Endereço não encontrado.')
    return rows[0]
  }
  async function lockUser(connection, id) {
    await connection.execute('SELECT id_usuario FROM usuarios WHERE id_usuario = ? FOR UPDATE', [id])
  }
  router.get('/cep/:cep', action(async (req, res) => res.json(await lookupCep(req.params.cep))))
  router.get('/', action(async (req, res) => {
    const [rows] = await pool.execute('SELECT * FROM enderecos WHERE usuario_id = ? AND excluido = FALSE AND salvar = TRUE ORDER BY principal DESC, id DESC', [req.user.id])
    res.json(rows)
  }))
  router.post('/', action(async (req, res) => {
    const validation = validateAddress(req.body)
    if (!validation.valid) throw problem(400, 'Revise os campos do endereço.', { errors: validation.errors })
    const value = validation.value
    const row = await transaction(pool, async connection => {
      await lockUser(connection, req.user.id)
      const fingerprint = addressFingerprint(value)
      const [existing] = await connection.execute('SELECT * FROM enderecos WHERE usuario_id = ? AND fingerprint = ? AND excluido = FALSE', [req.user.id, fingerprint])
      if (existing.length) {
        if (value.principal) await connection.execute('UPDATE enderecos SET principal = FALSE WHERE usuario_id = ?', [req.user.id])
        await connection.execute('UPDATE enderecos SET principal = ?, salvar = ? WHERE id = ?', [value.principal, value.salvar, existing[0].id])
        return { ...existing[0], principal: value.principal, salvar: value.salvar }
      }
      const [count] = await connection.execute('SELECT id FROM enderecos WHERE usuario_id = ? AND excluido = FALSE', [req.user.id])
      if (count.length >= 30) throw problem(409, 'Limite de 30 endereços atingido. Exclua um endereço antes de continuar.')
      if (value.principal) await connection.execute('UPDATE enderecos SET principal = FALSE WHERE usuario_id = ?', [req.user.id])
      const [result] = await connection.execute(`INSERT INTO enderecos (usuario_id, ${ADDRESS_FIELDS.join(', ')}, fingerprint) VALUES (${Array(ADDRESS_FIELDS.length + 2).fill('?').join(', ')})`, [req.user.id, ...ADDRESS_FIELDS.map(field => value[field]), fingerprint])
      const [rows] = await connection.execute('SELECT * FROM enderecos WHERE id = ?', [result.insertId])
      return rows[0]
    })
    res.status(201).json(row)
  }))
  router.put('/:id', action(async (req, res) => {
    const validation = validateAddress(req.body)
    if (!validation.valid) throw problem(400, 'Revise os campos do endereço.', { errors: validation.errors })
    const row = await transaction(pool, async connection => {
      await lockUser(connection, req.user.id)
      const current = await owned(connection, req)
      if (integer(req.body.versao) !== Number(current.versao)) throw problem(409, 'Este endereço foi alterado. Recarregue antes de editar.')
      const value = validation.value
      const [duplicates] = await connection.execute('SELECT id FROM enderecos WHERE usuario_id = ? AND fingerprint = ? AND id <> ? AND excluido = FALSE', [req.user.id, addressFingerprint(value), current.id])
      if (duplicates.length) throw problem(409, 'Este endereço já está salvo. Selecione o cadastro existente.')
      if (value.principal) await connection.execute('UPDATE enderecos SET principal = FALSE WHERE usuario_id = ?', [req.user.id])
      await connection.execute(`UPDATE enderecos SET ${ADDRESS_FIELDS.map(field => `${field} = ?`).join(', ')}, fingerprint = ?, versao = versao + 1, confirmado_em = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [...ADDRESS_FIELDS.map(field => value[field]), addressFingerprint(value), current.id])
      const [rows] = await connection.execute('SELECT * FROM enderecos WHERE id = ?', [current.id])
      return rows[0]
    })
    res.json(row)
  }))
  router.post('/:id/confirmar', action(async (req, res) => {
    const row = await transaction(pool, async connection => {
      const current = await owned(connection, req)
      if (integer(req.body.versao) !== Number(current.versao)) throw problem(409, 'O endereço mudou. Revise os dados novamente.')
      if (!validateAddress(current).valid) throw problem(400, 'Endereço incompleto.')
      await connection.execute('UPDATE enderecos SET confirmado_em = CURRENT_TIMESTAMP WHERE id = ?', [current.id])
      return { ...current, confirmado_em: new Date().toISOString() }
    })
    res.json(row)
  }))
  router.post('/:id/principal', action(async (req, res) => {
    await transaction(pool, async connection => {
      await lockUser(connection, req.user.id)
      const row = await owned(connection, req)
      await connection.execute('UPDATE enderecos SET principal = FALSE WHERE usuario_id = ?', [req.user.id])
      await connection.execute('UPDATE enderecos SET principal = TRUE, salvar = TRUE WHERE id = ?', [row.id])
    })
    res.json({ mensagem: 'Endereço principal atualizado.' })
  }))
  router.delete('/:id', action(async (req, res) => {
    await transaction(pool, async connection => {
      await lockUser(connection, req.user.id)
      const row = await owned(connection, req)
      await connection.execute('UPDATE enderecos SET excluido = TRUE, principal = FALSE, confirmado_em = NULL, versao = versao + 1 WHERE id = ?', [row.id])
    })
    res.json({ mensagem: 'Endereço excluído. O histórico de pedidos foi preservado.' })
  }))
  return router
}
