const express = require('express')
const crypto = require('node:crypto')
const google = require('../google-identity')
const oauth = require('../google-oauth')
const { autenticarToken } = require('../middleware/auth')
const { transaction, problem } = require('../addresses')

module.exports = function createGoogleRedirectRouter(pool, { authLimiter, api_chave, action, cookie, cookieOptions, finish }) {
  const router = express.Router()
  router.use((req, res, next) => { res.set('Referrer-Policy', 'no-referrer'); next() })
  router.post('/redirecionar', authLimiter, (req, res, next) => req.body?.acao === 'vincular' ? autenticarToken(req, res, next) : next(), action(async (req, res) => {
    const config = oauth.configuration()
    if (!config) throw problem(503, 'O login com Google ainda não foi ativado. Configure Client ID, Client Secret e URL de retorno na API.')
    if (Object.keys(req.body).some(key => !['acao', 'destino'].includes(key)) || !['entrar', 'vincular'].includes(req.body.acao)) throw problem(400, 'Ação inválida.')
    const secret = crypto.randomBytes(32).toString('hex'), hash = google.digest(secret)
    const nonce = crypto.randomBytes(32).toString('hex'), state = crypto.randomBytes(32).toString('hex'), verifier = crypto.randomBytes(48).toString('base64url')
    await transaction(pool, async connection => {
      await connection.execute('DELETE FROM google_auth_desafios WHERE expira_em <= ?', [Date.now()])
      try { await connection.execute('DELETE FROM google_auth_desafios WHERE cookie_hash = ?', [cookie(req)]) } catch (error) { if (error.status !== 401) throw error }
      await connection.execute('INSERT INTO google_auth_desafios (cookie_hash, nonce_hash, usuario_id, expira_em) VALUES (?, ?, ?, ?)', [hash, google.digest(nonce), req.user?.id || null, Date.now() + 600000])
      await connection.execute('INSERT INTO google_oauth_fluxos (cookie_hash, estado_hash, verificador, destino) VALUES (?, ?, ?, ?)', [hash, google.digest(state), oauth.encrypt(verifier, api_chave, hash), req.user ? '/perfil?aba=seguranca' : oauth.destination(req.body.destino)])
    })
    res.cookie('ehtech_google', secret, cookieOptions())
    return { url: oauth.authorizationUrl(config, { nonce, state, verifier }) }
  }))
  router.get('/callback', authLimiter, async (req, res) => {
    const config = oauth.configuration()
    // Somente um endereço fixo da aplicação recebe o navegador; não replica parâmetros do Google.
    const returnTo = config ? `${config.site}/login/google` : '/login/google'
    try {
      if (!config) throw problem(503, 'Google não configurado.')
      const hash = cookie(req), { state, code, error } = req.query
      if (typeof state !== 'string' || !/^[a-f0-9]{64}$/.test(state) || (error === undefined && (typeof code !== 'string' || !code.length || code.length > 4096))) throw problem(401, 'Retorno inválido.')
      const row = await transaction(pool, async connection => {
        const [rows] = await connection.execute(`SELECT f.*, d.nonce_hash, d.expira_em FROM google_oauth_fluxos f
          JOIN google_auth_desafios d ON d.cookie_hash = f.cookie_hash WHERE f.cookie_hash = ? FOR UPDATE`, [hash])
        const current = rows[0]
        if (!current || current.processado || Number(current.expira_em) <= Date.now() || current.estado_hash !== google.digest(state)) throw problem(401, 'Retorno inválido ou já utilizado.')
        await connection.execute('UPDATE google_oauth_fluxos SET processado = TRUE WHERE cookie_hash = ?', [hash])
        return current
      })
      if (error !== undefined) { await pool.execute('DELETE FROM google_auth_desafios WHERE cookie_hash = ?', [hash]); return res.redirect(303, returnTo + '?erro=cancelado') }
      const credential = await oauth.exchangeCode(config, code, oauth.decrypt(row.verificador, api_chave, hash))
      await google.verifyIdToken(credential, row.nonce_hash)
      const [saved] = await pool.execute('UPDATE google_oauth_fluxos SET credencial = ?, verificador = NULL WHERE cookie_hash = ?', [oauth.encrypt(credential, api_chave, hash), hash])
      if (!saved.affectedRows) throw problem(401, 'Tentativa encerrada.')
      res.redirect(303, returnTo)
    } catch { res.redirect(303, returnTo + '?erro=acesso') }
  })
  async function returned(req) {
    const hash = cookie(req)
    const [rows] = await pool.execute(`SELECT f.destino, f.credencial, d.usuario_id, d.expira_em, d.tentativas FROM google_oauth_fluxos f
      JOIN google_auth_desafios d ON d.cookie_hash = f.cookie_hash WHERE f.cookie_hash = ?`, [hash])
    const row = rows[0]
    if (!row?.credencial || Number(row.expira_em) <= Date.now() || Number(row.tentativas) >= 5) throw problem(401, 'Tentativa encerrada. Inicie novamente pelo Google.')
    return { ...row, hash }
  }
  router.get('/retorno', action(async req => {
    const row = await returned(req)
    return { acao: row.usuario_id == null ? 'entrar' : 'vincular', destino: row.destino }
  }))
  router.post('/concluir', authLimiter, async (req, res, next) => {
    try { req.googleReturn = await returned(req); return req.googleReturn.usuario_id == null ? next() : autenticarToken(req, res, next) }
    catch (error) { res.status(error.status || 500).json({ mensagem: error.status ? error.message : 'Não foi possível concluir o acesso.' }) }
  }, action(async (req, res) => {
    if (Object.keys(req.body).some(key => key !== 'senha')) throw problem(400, 'Envie somente a senha quando solicitada.')
    const row = req.googleReturn
    req.body = { ...req.body, credential: oauth.decrypt(row.credencial, api_chave, row.hash) }
    req.googleRedirect = true
    const result = await finish(req, res, row.usuario_id != null)
    return result.failure ? result : { ...result, destino: row.destino }
  }))
  return router
}
