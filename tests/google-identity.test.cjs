const { test } = require('node:test'), assert = require('node:assert/strict')
const crypto = require('node:crypto'), jwt = require('jsonwebtoken')
const { createVerifier, digest } = require('../backend/google-identity')
const { createGoogleFixture } = require('./helpers/google-fixture.cjs')

test('Google verifica assinatura, emissor, destinatário, expiração, nonce e e-mail verificado', async () => {
  const fixture = createGoogleFixture(), previous = process.env.GOOGLE_CLIENT_ID
  process.env.GOOGLE_CLIENT_ID = fixture.clientId
  let calls = 0
  const verify = createVerifier(async url => { assert.equal(url, 'https://www.googleapis.com/oauth2/v3/certs'); calls++; return Response.json({ keys: fixture.keys }, { headers: { 'cache-control': 'max-age=300' } }) })
  const nonce = crypto.randomBytes(32).toString('hex'), hash = digest(nonce)
  try {
    assert.equal((await verify(fixture.token({ nonce }), hash)).sub, 'google-test-subject')
    assert.equal((await verify(fixture.token({ nonce }), hash)).email, 'google.user@gmail.com'); assert.equal(calls, 1)
    for (const extra of [{ nonce: 'outra-tentativa' }, { aud: 'outro.apps.googleusercontent.com' }, { iss: 'https://attacker.invalid' }, { email_verified: false }, { email_verified: 'true' }, { email: 'invalido' }, { sub: '' }, { iat: Math.floor(Date.now() / 1000) + 600 }, { azp: 'outro-client' }]) await assert.rejects(verify(fixture.token({ nonce, ...extra }), hash), error => error.status === 401)
    const expired = jwt.sign({ sub: 's', email: 'a@gmail.com', email_verified: true, nonce, aud: fixture.clientId, iss: 'https://accounts.google.com', exp: Math.floor(Date.now() / 1000) - 30 }, fixture.privateKey, { algorithm: 'RS256', keyid: fixture.keys[0].kid })
    await assert.rejects(verify(expired, hash), error => error.status === 401)
    const unsigned = jwt.sign({ nonce }, 'wrong-secret', { algorithm: 'HS256' })
    await assert.rejects(verify(unsigned, hash), error => error.status === 401)
    const other = createGoogleFixture()
    await assert.rejects(verify(other.token({ nonce }), hash), error => error.status === 401)
    const unavailable = createVerifier(async () => { throw new Error('offline') })
    await assert.rejects(unavailable(fixture.token({ nonce }), hash), error => error.status === 503)
    process.env.GOOGLE_CLIENT_ID = ''
    await assert.rejects(verify(fixture.token({ nonce }), hash), error => error.status === 503)
  } finally { if (previous === undefined) delete process.env.GOOGLE_CLIENT_ID; else process.env.GOOGLE_CLIENT_ID = previous }
})

test('migração Google é aditiva, idempotente e mantém vínculos únicos com exclusão em cascata', async () => {
  let migrated = false
  const queries = [], pool = { async execute(sql) { queries.push(sql); if (sql.startsWith('ALTER')) { if (migrated) throw Object.assign(new Error('duplicate'), { code: '42701' }); migrated = true } return [[], []] } }
  const { initializeGoogleIdentity } = require('../backend/database/google-identity')
  await initializeGoogleIdentity(pool); await initializeGoogleIdentity(pool)
  assert.equal(queries.length, 8)
  assert.ok(queries.some(sql => sql.includes('UNIQUE KEY uq_identidade_sujeito')))
  assert.ok(queries.some(sql => sql.includes('ON DELETE CASCADE')))
  assert.ok(queries.every(sql => !/DELETE FROM|DROP TABLE|UPDATE usuarios/.test(sql)))
})

test('redirecionamento Google restringe retorno, protege PKCE e criptografa dados temporários por tentativa', () => {
  const oauth = require('../backend/google-oauth'), prior = { ...process.env }
  try {
    Object.assign(process.env, { GOOGLE_CLIENT_ID: 'test.apps.googleusercontent.com', GOOGLE_CLIENT_SECRET: 'local-test-secret', GOOGLE_REDIRECT_URI: 'http://localhost:3001/api/auth/google/callback', NODE_ENV: 'test' })
    const config = oauth.configuration()
    assert.equal(config.site, 'http://localhost:3001')
    for (const uri of ['https://attacker.invalid/elsewhere', 'https://user:pass@site.invalid/api/auth/google/callback', 'http://example.com/api/auth/google/callback', 'http://localhost:3001/api/auth/google/callback?next=1']) { process.env.GOOGLE_REDIRECT_URI = uri; assert.equal(oauth.configuration(), null) }
    process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3001/api/auth/google/callback'; process.env.NODE_ENV = 'production'; assert.equal(oauth.configuration(), null)
    const encrypted = oauth.encrypt('secret-pkce', 'server-secret', 'attempt-A')
    assert.equal(oauth.decrypt(encrypted, 'server-secret', 'attempt-A'), 'secret-pkce')
    assert.throws(() => oauth.decrypt(encrypted, 'server-secret', 'attempt-B'))
    assert.throws(() => oauth.decrypt(encrypted, 'other-secret', 'attempt-A'))
    assert.ok(!encrypted.includes('secret-pkce'))
    const url = new URL(oauth.authorizationUrl(config, { nonce: 'nonce', state: 'state', verifier: 'secret-pkce' }))
    assert.equal(url.origin, 'https://accounts.google.com'); assert.equal(url.searchParams.get('prompt'), 'select_account'); assert.equal(url.searchParams.get('response_type'), 'code')
    assert.equal(url.searchParams.get('code_challenge_method'), 'S256'); assert.equal(url.searchParams.get('code_challenge'), crypto.createHash('sha256').update('secret-pkce').digest('base64url'))
    assert.ok(!url.href.includes('local-test-secret')); assert.ok(!url.href.includes('secret-pkce'))
    for (const path of ['//attacker.invalid', '/\\attacker.invalid', 'https://attacker.invalid', '/login/google', '/\n/evil']) assert.equal(oauth.destination(path), '/perfil')
    assert.equal(oauth.destination('/pedidos?pagina=2'), '/pedidos?pagina=2')
  } finally { for (const key of Object.keys(process.env)) if (!(key in prior)) delete process.env[key]; Object.assign(process.env, prior) }
})
