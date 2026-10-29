const crypto = require('node:crypto')
const { clientId } = require('./google-identity')
const { problem } = require('./addresses')

function configuration() {
  const id = clientId(), secret = process.env.GOOGLE_CLIENT_SECRET?.trim()
  try {
    const redirect = new URL(process.env.GOOGLE_REDIRECT_URI || '')
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(redirect.hostname)
    if (!id || !secret || redirect.username || redirect.password || redirect.search || redirect.hash || redirect.pathname !== '/api/auth/google/callback' || (redirect.protocol !== 'https:' && !(redirect.protocol === 'http:' && local && process.env.NODE_ENV !== 'production'))) return null
    return { clientId: id, secret, redirectUri: redirect.href, site: redirect.origin }
  } catch { return null }
}
function destination(value) {
  if (typeof value !== 'string' || value.length > 1000 || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value)) return '/perfil'
  try { const url = new URL(value, 'https://ehtech.invalid'); return url.origin === 'https://ehtech.invalid' && url.pathname !== '/login/google' ? url.pathname + url.search + url.hash : '/perfil' } catch { return '/perfil' }
}
function encrypt(value, secret, context) {
  const iv = crypto.randomBytes(12), key = crypto.createHash('sha256').update(secret).digest()
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  cipher.setAAD(Buffer.from(context))
  const content = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), content]).toString('base64url')
}
function decrypt(value, secret, context) {
  try {
    const content = Buffer.from(value, 'base64url'), key = crypto.createHash('sha256').update(secret).digest()
    const cipher = crypto.createDecipheriv('aes-256-gcm', key, content.subarray(0, 12))
    cipher.setAuthTag(content.subarray(12, 28)); cipher.setAAD(Buffer.from(context))
    return Buffer.concat([cipher.update(content.subarray(28)), cipher.final()]).toString('utf8')
  } catch { throw problem(401, 'Tentativa encerrada. Inicie novamente pelo Google.') }
}
function authorizationUrl(config, { nonce, state, verifier }) {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.redirectUri, response_type: 'code', scope: 'openid email', prompt: 'select_account', state, nonce, code_challenge: crypto.createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' }).toString()
  return url.href
}
async function exchangeCode(config, code, verifier) {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: config.clientId, client_secret: config.secret, redirect_uri: config.redirectUri, grant_type: 'authorization_code', code_verifier: verifier }), signal: AbortSignal.timeout(8000), redirect: 'error' })
    if (!response.ok) throw problem(401, 'O acesso Google não pôde ser concluído. Inicie novamente.')
    const data = await response.json()
    if (typeof data.id_token !== 'string' || data.id_token.length > 8192) throw problem(401, 'O Google não retornou uma identificação válida.')
    return data.id_token
  } catch (error) { if (error.status) throw error; throw problem(503, 'O Google está temporariamente indisponível. Tente novamente.') }
}
module.exports = { configuration, destination, encrypt, decrypt, authorizationUrl, exchangeCode }
