const crypto = require('node:crypto')

// Incremente quando o conjunto de migrações mudar. Cada versão concluída é imutável.
const SCHEMA_VERSION = '2026-10-29.2'
const MISSING_TABLE = new Set(['ER_NO_SUCH_TABLE', '42P01'])
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

async function ensureSchema(pool, initialize) {
  async function current() {
    const [rows] = await pool.execute('SELECT concluida FROM ehtech_schema_versoes WHERE versao = ?', [SCHEMA_VERSION])
    return rows[0]?.concluida === true || Number(rows[0]?.concluida) === 1
  }
  try { if (await current()) return false }
  catch (error) {
    if (!MISSING_TABLE.has(error.code)) throw error
    try {
      await pool.execute(`CREATE TABLE IF NOT EXISTS ehtech_schema_versoes (
        versao VARCHAR(80) PRIMARY KEY, concluida BOOLEAN NOT NULL DEFAULT FALSE,
        dono VARCHAR(64) NOT NULL, expira_em BIGINT NOT NULL
      )`)
    } catch (createError) {
      // PostgreSQL pode disputar a criação inicial do catálogo entre instâncias.
      if (!['23505', '42P07', 'ER_TABLE_EXISTS_ERROR'].includes(createError.code)) throw createError
    }
  }
  await pool.execute('INSERT IGNORE INTO ehtech_schema_versoes (versao, concluida, dono, expira_em) VALUES (?, FALSE, ?, ?)', [SCHEMA_VERSION, '', 0])
  const owner = crypto.randomBytes(24).toString('hex'), deadline = Date.now() + 50000
  while (Date.now() < deadline) {
    if (await current()) return false
    const now = Date.now()
    const [claim] = await pool.execute('UPDATE ehtech_schema_versoes SET dono = ?, expira_em = ? WHERE versao = ? AND concluida = FALSE AND expira_em <= ?', [owner, now + 120000, SCHEMA_VERSION, now])
    if (claim.affectedRows) {
      try {
        await initialize()
        const [saved] = await pool.execute('UPDATE ehtech_schema_versoes SET concluida = TRUE, expira_em = ? WHERE versao = ? AND dono = ?', [0, SCHEMA_VERSION, owner])
        if (!saved.affectedRows) throw new Error('Não foi possível confirmar a versão do banco.')
        return true
      } catch (error) {
        await pool.execute('UPDATE ehtech_schema_versoes SET expira_em = ? WHERE versao = ? AND dono = ? AND concluida = FALSE', [0, SCHEMA_VERSION, owner]).catch(() => {})
        throw error
      }
    }
    await delay(500)
  }
  throw new Error('Inicialização do banco em andamento. Tente novamente em instantes.')
}

module.exports = { SCHEMA_VERSION, ensureSchema }
