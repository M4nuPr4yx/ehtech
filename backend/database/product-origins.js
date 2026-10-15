async function initializeProductOrigins(pool) {
  for (const [table, field, definition] of [
    ['produtos', 'origem_endereco_id', 'INT NULL'],
    ['produtos', 'origem_snapshot', 'TEXT NULL'],
    ['produtos', 'origem_uf', 'VARCHAR(2) NULL'],
    ['produtos', 'origem_cidade', 'VARCHAR(100) NULL'],
    ['produtos', 'data_criacao', 'TIMESTAMP NULL DEFAULT NULL'],
    ['pedido_produto_itens', 'origem_envio', 'TEXT NULL']
  ]) {
    try { await pool.execute(`ALTER TABLE ${table} ADD COLUMN ${field} ${definition}`) }
    catch (error) { if (!['ER_DUP_FIELDNAME', '42701'].includes(error.code)) throw error }
  }
}
module.exports = { initializeProductOrigins }
