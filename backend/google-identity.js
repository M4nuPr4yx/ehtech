const crypto = require('node:crypto')
const jwt = require('jsonwebtoken')
const validator = require('validator')
const { problem } = require('./addresses')

const digest = value => crypto.createHash('sha256').update(value).digest('hex')
function clientId() {
  const value = process.env.GOOGLE_CLIENT_ID?.trim() || ''
  return /^[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(value) ? value : ''
}
function createVerifier(fetchImpl = (...args) => fetch(...args)) {
  let keys = [], expires = 0, lastRefresh = 0, pending
  async function refresh() {
    if (!pending) {
      lastRefresh = Date.now()
      pending = (async () => {
        const response = await fetchImpl('https://www.googleapis.com/oauth2/v3/certs', { signal: AbortSignal.timeout(5000), redirect: 'error' })
        if (!response.ok) throw new Error('certificates unavailable')
        const data = await response.json()
        if (!Array.isArray(data.keys) || !data.keys.length || data.keys.length > 10) throw new Error('invalid certificates')
        keys = data.keys.filter(key => key.kty === 'RSA' && key.alg === 'RS256' && key.use === 'sig')
        const seconds = Number(/max-age=(\d+)/.exec(response.headers.get('cache-control') || '')?.[1]) || 300
        expires = Date.now() + Math.min(seconds, 3600) * 1000
      })().finally(() => { pending = null })
    }
    return pending
  }
  return async (credential, nonceHash) => {
    const audience = clientId()
    if (!audience) throw problem(503, 'O login com Google ainda não foi configurado.')
    if (typeof credential !== 'string' || credential.length > 8192) throw problem(400, 'Credencial Google inválida.')
    const decoded = jwt.decode(credential, { complete: true })
    if (!decoded || decoded.header.alg !== 'RS256' || typeof decoded.header.kid !== 'string' || !/^[\w-]{1,120}$/.test(decoded.header.kid)) throw problem(401, 'Não foi possível validar o acesso pelo Google.')
    try {
      if (Date.now() >= expires || (!keys.some(key => key.kid === decoded.header.kid) && Date.now() - lastRefresh > 10000)) await refresh()
    } catch { throw problem(503, 'O Google está temporariamente indisponível. Tente novamente.') }
    const jwk = keys.find(key => key.kid === decoded.header.kid)
    if (!jwk) throw problem(401, 'Não foi possível validar o acesso pelo Google.')
    try {
      const claims = jwt.verify(credential, crypto.createPublicKey({ key: jwk, format: 'jwk' }), { algorithms: ['RS256'], audience, issuer: ['accounts.google.com', 'https://accounts.google.com'], clockTolerance: 5 })
      if (claims.aud !== audience || (claims.azp && claims.azp !== audience) || !Number.isFinite(claims.exp) || !Number.isFinite(claims.iat) || claims.iat > Date.now() / 1000 + 60 || claims.exp <= claims.iat || typeof claims.sub !== 'string' || !claims.sub.length || claims.sub.length > 255 || claims.email_verified !== true || typeof claims.email !== 'string' || !validator.isEmail(claims.email) || typeof claims.nonce !== 'string' || digest(claims.nonce) !== nonceHash) throw new Error('invalid identity')
      return { sub: claims.sub, email: claims.email.trim().toLowerCase() }
    } catch { throw problem(401, 'Não foi possível validar o acesso pelo Google. Inicie uma nova tentativa.') }
  }
}
module.exports = { clientId, digest, createVerifier, verifyIdToken: createVerifier() }
