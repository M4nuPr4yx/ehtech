const crypto = require('node:crypto'), jwt = require('jsonwebtoken')
function createGoogleFixture() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 })
  const clientId = 'ehtech-test.apps.googleusercontent.com'
  const key = { ...publicKey.export({ format: 'jwk' }), kid: 'ehtech-test-key', use: 'sig', alg: 'RS256' }
  return { clientId, keys: [key], privateKey: privateKey.export({ format: 'pem', type: 'pkcs8' }), token({ nonce, email = 'google.user@gmail.com', sub = 'google-test-subject', ...extra }) {
    return jwt.sign({ sub, email, email_verified: true, nonce, aud: clientId, iss: 'https://accounts.google.com', ...extra }, privateKey, { algorithm: 'RS256', keyid: key.kid, expiresIn: 300 })
  } }
}
module.exports = { createGoogleFixture }
