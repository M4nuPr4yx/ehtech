async function initializeProductSpecifications(pool) {
  try { await pool.execute('ALTER TABLE produtos ADD COLUMN especificacoes TEXT NULL') }
  catch (error) { if (!['ER_DUP_FIELDNAME', '42701'].includes(error.code)) throw error }
}

module.exports = { initializeProductSpecifications }
