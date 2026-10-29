const { randomBytes, scrypt, timingSafeEqual } = require('node:crypto')
const { promisify } = require('node:util')
const bcrypt = require('bcrypt')

const derive = promisify(scrypt)
const PREFIX = 'scrypt$32768$8$3$'
const OPTIONS = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 }
const validInput = value => typeof value === 'string' && value.length > 0 && Buffer.byteLength(value, 'utf8') <= 1024

async function hashPassword(value) {
  if (!validInput(value)) throw new Error('Senha inválida ou maior que 1024 bytes.')
  const salt = randomBytes(16)
  const hash = await derive(value, salt, 64, OPTIONS)
  return PREFIX + salt.toString('hex') + '$' + hash.toString('hex')
}

async function verifyPassword(value, stored) {
  if (!validInput(value)) return false
  if (typeof stored === 'string' && /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(stored)) {
    const [valid] = await Promise.all([bcrypt.compare(value, stored), derive(value, Buffer.alloc(16), 64, OPTIONS)])
    return valid
  }
  const match = typeof stored === 'string' && /^scrypt\$32768\$8\$3\$([a-f0-9]{32})\$([a-f0-9]{128})$/.exec(stored)
  if (!match) {
    // Conta inexistente não retorna antes do trabalho de verificação de senha.
    await derive(value, Buffer.alloc(16), 64, OPTIONS)
    return false
  }
  const actual = await derive(value, Buffer.from(match[1], 'hex'), 64, OPTIONS)
  return timingSafeEqual(actual, Buffer.from(match[2], 'hex'))
}

module.exports = { hashPassword, verifyPassword, validPasswordInput: validInput }
