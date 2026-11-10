const { createHmac } = require('node:crypto')
const { ipKeyGenerator } = require('express-rate-limit')
const { transaction, problem } = require('./addresses')
const { setTimeout: delay } = require('node:timers/promises')

const WINDOW_MS = 15 * 60 * 1000
function createPasswordAttempts(pool, secret) {
  let cleanedWindow = -1, cleanup
  return async function reserve(req, email) {
    const window = Math.floor(Date.now() / WINDOW_MS)
    if (cleanedWindow !== window) {
      if (!cleanup) cleanup = pool.execute('DELETE FROM auth_tentativas WHERE janela < ?', [window - 96]).then(() => { cleanedWindow = window }).finally(() => { cleanup = null })
      await cleanup
    }
    const network = ipKeyGenerator(req.ip || '127.0.0.1')
    const digest = value => createHmac('sha256', secret).update(value).digest('hex')
    const limits = new Map([
      [digest('password:network:' + network), 100],
      [digest('password:account-network:' + network + ':' + email.trim().toLowerCase()), 10]
    ])
    const keys = [...limits.keys()].sort()
    const reserveAttempt = () => transaction(pool, async connection => {
      await connection.execute('INSERT IGNORE INTO auth_tentativas (chave, janela, tentativas) VALUES (?, ?, 0), (?, ?, 0)', [keys[0], window, keys[1], window])
      const [rows] = await connection.execute('SELECT chave, janela, tentativas FROM auth_tentativas WHERE chave IN (?, ?) ORDER BY chave FOR UPDATE', keys)
      if (rows.length !== 2) throw problem(503, 'Não foi possível validar o acesso. Tente novamente.')
      for (const row of rows) {
        if (Number(row.janela) === window && Number(row.tentativas) >= limits.get(row.chave)) {
          throw problem(429, 'Muitas tentativas incorretas. Aguarde alguns minutos ou entre com Google.', { retryAfter: Math.max(1, Math.ceil(((window + 1) * WINDOW_MS - Date.now()) / 1000)) })
        }
      }
      for (const row of rows) {
        await connection.execute('UPDATE auth_tentativas SET janela = ?, tentativas = ? WHERE chave = ?', [window, Number(row.janela) === window ? Number(row.tentativas) + 1 : 1, row.chave])
      }
    })
    // O banco desfaz a transação vítima de deadlock. Repetir somente essa
    // reserva, antes de verificar a senha, não duplica tentativas confirmadas.
    for (let attempt = 0; ; attempt++) {
      try { await reserveAttempt(); break }
      catch (error) {
        if (!['ER_LOCK_DEADLOCK', '40P01', '40001'].includes(error.code)) throw error
        if (attempt === 4) throw problem(503, 'Não foi possível validar o acesso. Tente novamente.')
        await delay(20 * (2 ** attempt) + Math.floor(Math.random() * 20))
      }
    }
    return { async success() {
      await pool.execute('UPDATE auth_tentativas SET tentativas = tentativas - 1 WHERE chave IN (?, ?) AND janela = ? AND tentativas > 0', [...keys, window])
    } }
  }
}

module.exports = { createPasswordAttempts }
