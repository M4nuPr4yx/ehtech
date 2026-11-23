async function initializeDifferentials(pool) {
  await pool.execute(`CREATE TABLE IF NOT EXISTS combos_instalacao (
    id INT AUTO_INCREMENT PRIMARY KEY, produto_id INT NOT NULL, servico_id INT NOT NULL,
    criador_id INT NOT NULL, titulo VARCHAR(120) NOT NULL, descricao TEXT NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_combo_produto (produto_id), INDEX idx_combo_criador (criador_id)
  )`)
  try {
    await pool.execute('ALTER TABLE contratacoes_servico ADD COLUMN combo_snapshot TEXT NULL')
  } catch (error) {
    if (!['ER_DUP_FIELDNAME', '42701'].includes(error.code)) throw error
  }
}

module.exports = { initializeDifferentials }
