const express = require('express')
const crypto = require('node:crypto')
const { hashPassword, verifyPassword, validPasswordInput } = require('../passwords')
const jwt = require('jsonwebtoken')
const google = require('../google-identity')
const { autenticarToken } = require('../middleware/auth')
const { transaction, problem } = require('../addresses')
const { isAllowedUserEmail } = require('../user-validation')
const { normalizeProfileName, NAME_MESSAGE } = require('../profile-name')
const { foto: defaultPhoto, profilePhoto } = require('../../shared/profile-defaults.cjs')

const COOKIE = 'ehtech_google', TTL = 10 * 60 * 1000
function cookie(req) {
  const value = (req.headers.cookie || '').split(';').map(item => item.trim()).find(item => item.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1)
  if (!value || !/^[a-f0-9]{64}$/.test(value)) throw problem(401, 'Inicie uma nova tentativa de acesso pelo Google.')
  return google.digest(value)
}
const cookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL), sameSite: 'lax', path: '/', maxAge: TTL })
module.exports = function createGoogleAuthRouter(pool, { authLimiter, api_chave }) {
  const router = express.Router()
  router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next() })
  const action = handler => async (req, res) => {
    try {
      if (!google.clientId()) throw problem(503, 'O login com Google ainda não foi configurado.')
      if (req.method !== 'GET' && (!req.is('application/json') || !req.body || Array.isArray(req.body) || Buffer.byteLength(JSON.stringify(req.body)) > 12000)) throw problem(400, 'Envie os dados do acesso em JSON, até 12 KB.')
      const result = await handler(req, res)
      if (result?.failure) return res.status(result.failure.status).json({ mensagem: result.failure.message })
      res.json(result)
    } catch (error) {
      const duplicate = ['ER_DUP_ENTRY', '23505'].includes(error.code)
      res.status(error.status || (duplicate ? 409 : 500)).json({ mensagem: error.status ? error.message : duplicate ? 'Os dados já estão vinculados a uma conta. Atualize e tente novamente.' : 'Não foi possível concluir o acesso pelo Google.' })
    }
  }
  router.get('/config', (req, res) => res.json({ habilitado: Boolean(google.clientId()), client_id: google.clientId() || null }))
  router.post('/desafio', authLimiter, (req, res, next) => req.body?.acao === 'vincular' ? autenticarToken(req, res, next) : next(), action(async (req, res) => {
    if (Object.keys(req.body).some(key => key !== 'acao') || !['entrar', 'vincular'].includes(req.body.acao)) throw problem(400, 'Ação inválida.')
    const secret = crypto.randomBytes(32).toString('hex'), nonce = crypto.randomBytes(32).toString('hex')
    await transaction(pool, async connection => {
      await connection.execute('DELETE FROM google_auth_desafios WHERE expira_em <= ?', [Date.now()])
      try { await connection.execute('DELETE FROM google_auth_desafios WHERE cookie_hash = ?', [cookie(req)]) } catch (error) { if (error.status !== 401) throw error }
      await connection.execute('INSERT INTO google_auth_desafios (cookie_hash, nonce_hash, usuario_id, expira_em) VALUES (?, ?, ?, ?)', [google.digest(secret), google.digest(nonce), req.user?.id || null, Date.now() + TTL])
    })
    res.cookie(COOKIE, secret, cookieOptions())
    return { nonce, expira_em: new Date(Date.now() + TTL).toISOString() }
  }))
  async function finish(req, res, linking = false) {
    const allowed = linking ? ['credential', 'senha'] : ['credential', 'senha', 'username', 'nome']
    if (Object.keys(req.body).some(key => !allowed.includes(key)) || (req.body.senha !== undefined && req.body.senha !== '' && !validPasswordInput(req.body.senha))) throw problem(400, 'Dados de autenticação inválidos.')
    const name = req.body.nome === undefined ? null : normalizeProfileName(req.body.nome)
    if (req.body.nome !== undefined && !name) throw problem(400, NAME_MESSAGE)
    const hash = cookie(req)
    const [pending] = await pool.execute('SELECT * FROM google_auth_desafios WHERE cookie_hash = ?', [hash])
    const validChallenge = row => row && Number(row.expira_em) > Date.now() && Number(row.tentativas) < 5 && (linking ? Number(row.usuario_id) === Number(req.user.id) : row.usuario_id == null)
    if (!validChallenge(pending[0])) throw problem(401, 'Tentativa expirada ou encerrada. Inicie novamente pelo Google.')
    const identity = await google.verifyIdToken(req.body.credential, pending[0].nonce_hash)
    const result = await transaction(pool, async connection => {
      const [challenges] = await connection.execute('SELECT * FROM google_auth_desafios WHERE cookie_hash = ? FOR UPDATE', [hash])
      if (!validChallenge(challenges[0])) throw problem(401, 'Tentativa expirada ou encerrada. Inicie novamente pelo Google.')
      const fail = async message => {
        await connection.execute('UPDATE google_auth_desafios SET tentativas = tentativas + 1 WHERE cookie_hash = ?', [hash])
        return { failure: { status: 401, message } }
      }
      const [linked] = await connection.execute("SELECT usuario_id FROM usuario_identidades WHERE provedor = 'google' AND sujeito = ?", [identity.sub])
      let user
      if (linked.length && !linking) {
        const [rows] = await connection.execute('SELECT * FROM usuarios WHERE id_usuario = ? FOR UPDATE', [linked[0].usuario_id]); user = rows[0]
        // Corrige também os perfis criados pelo fluxo antigo, preservando o identificador.
        if (user && !user.nome && /^usuario_[a-f0-9]{16}$/.test(user.username)) {
          if (!name) return { proxima_etapa: 'cadastro', email: identity.email }
          await connection.execute('UPDATE usuarios SET nome = ? WHERE id_usuario = ?', [name, user.id_usuario])
          user.nome = name
        }
      } else {
        const [rows] = await connection.execute(linking ? 'SELECT * FROM usuarios WHERE id_usuario = ? FOR UPDATE' : 'SELECT * FROM usuarios WHERE email = ? FOR UPDATE', [linking ? req.user.id : identity.email])
        user = rows[0]
        if (linking && (!user || user.email.toLowerCase() !== identity.email || (linked.length && Number(linked[0].usuario_id) !== Number(user.id_usuario)))) throw problem(409, 'Use a conta Google com o mesmo e-mail do seu perfil e sem vínculo com outra conta.')
        if (user) {
          if (!req.body.senha) return { proxima_etapa: 'vincular', email: identity.email }
          if (!req.body.senha || !user.senha_definida || !(await verifyPassword(req.body.senha, user.senha))) return fail('Senha da EHtech incorreta. Confirme sua senha para vincular o Google.')
          if (linking && Number(user.session_version) !== Number(req.user.session_version ?? 0)) throw problem(401, 'Sua sessão mudou. Entre novamente.')
          const [existing] = await connection.execute("SELECT sujeito FROM usuario_identidades WHERE usuario_id = ? AND provedor = 'google'", [user.id_usuario])
          if (existing.length) throw problem(409, 'Esta conta já possui um vínculo com o Google.')
        } else {
          if (!isAllowedUserEmail(identity.email)) throw problem(400, 'O cadastro aceita e-mails @gmail.com, @hotmail.com ou @outlook.com.')
          if (!name) return { proxima_etapa: 'cadastro', email: identity.email }
          const username = req.body.username === undefined ? `usuario_${crypto.randomBytes(8).toString('hex')}` : typeof req.body.username === 'string' ? req.body.username.trim() : ''
          if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(username)) throw problem(400, 'Escolha um nome de usuário de 3 a 30 caracteres, com letras, números, ponto, hífen ou underline.')
          const [existing] = await connection.execute('SELECT id_usuario FROM usuarios WHERE username = ?', [username])
          if (existing.length) throw problem(409, 'Nome de usuário já está em uso.')
          // Sem senha utilizável: a recuperação por e-mail permite definir uma depois.
          const password = await hashPassword(crypto.randomBytes(48).toString('hex'))
          const [inserted] = await connection.execute("INSERT INTO usuarios (username, email, senha, role, senha_definida, nome, foto) VALUES (?, ?, ?, 'user', FALSE, ?, ?)", [username, identity.email, password, name, defaultPhoto])
          const [created] = await connection.execute('SELECT * FROM usuarios WHERE id_usuario = ?', [inserted.insertId]); user = created[0]
        }
        await connection.execute("INSERT INTO usuario_identidades (usuario_id, provedor, sujeito) VALUES (?, 'google', ?)", [user.id_usuario, identity.sub])
      }
      await connection.execute('DELETE FROM google_auth_desafios WHERE cookie_hash = ?', [hash])
      if (linking) return { mensagem: 'Google vinculado com sucesso.' }
      const token = jwt.sign({ id: user.id_usuario, username: user.username, email: user.email, role: user.role || 'user', session_version: Number(user.session_version) }, api_chave, { expiresIn: '8h', algorithm: 'HS256' })
      return { mensagem: 'Login OK', token, username: user.username, nome: user.nome || null, email: user.email, userId: user.id_usuario, foto: profilePhoto(user) }
    })
    if (!result.failure && !result.proxima_etapa) { const options = cookieOptions(); delete options.maxAge; res.clearCookie(COOKIE, options) }
    return result
  }
  router.post('/entrar', authLimiter, action((req, res) => finish(req, res)))
  router.post('/vincular', autenticarToken, authLimiter, action((req, res) => finish(req, res, true)))
  router.use(require('./googleRedirect')(pool, { authLimiter, api_chave, action, cookie, cookieOptions, finish }))
  router.get('/conta', autenticarToken, async (req, res) => {
    try {
      const [[identities], [users]] = await Promise.all([pool.execute("SELECT id FROM usuario_identidades WHERE usuario_id = ? AND provedor = 'google'", [req.user.id]), pool.execute('SELECT senha_definida FROM usuarios WHERE id_usuario = ?', [req.user.id])])
      res.json({ vinculado: identities.length > 0, senha_definida: Boolean(users[0]?.senha_definida), habilitado: Boolean(google.clientId()) })
    } catch { res.status(503).json({ mensagem: 'Não foi possível consultar seus meios de acesso.' }) }
  })
  router.delete('/vinculo', autenticarToken, authLimiter, async (req, res) => {
    try {
      if (!validPasswordInput(req.body?.senha) || Object.keys(req.body).some(key => key !== 'senha')) throw problem(400, 'Informe a senha atual da EHtech.')
      await transaction(pool, async connection => {
        const [users] = await connection.execute('SELECT senha, senha_definida, session_version FROM usuarios WHERE id_usuario = ? FOR UPDATE', [req.user.id])
        if (!users[0]?.senha_definida) throw problem(409, 'Defina uma senha pela recuperação de e-mail antes de desvincular o Google.')
        if (Number(users[0].session_version) !== Number(req.user.session_version ?? 0) || !(await verifyPassword(req.body.senha, users[0].senha))) throw problem(401, 'Confira sua senha atual da EHtech.')
        await connection.execute("DELETE FROM usuario_identidades WHERE usuario_id = ? AND provedor = 'google'", [req.user.id])
        await connection.execute('UPDATE usuarios SET session_version = session_version + 1 WHERE id_usuario = ?', [req.user.id])
      })
      res.json({ mensagem: 'Google desvinculado. Entre novamente com e-mail e senha.' })
    } catch (error) { res.status(error.status || 500).json({ mensagem: error.status ? error.message : 'Não foi possível desvincular o Google.' }) }
  })
  return router
}
