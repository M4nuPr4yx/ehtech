async function initializeDifferentials(pool) {
  await pool.execute(`CREATE TABLE IF NOT EXISTS certificados_usado (
    id INT AUTO_INCREMENT PRIMARY KEY, passaporte_id INT NOT NULL,
    produto_id INT NOT NULL, contratacao_id INT NOT NULL,
    solicitante_id INT NOT NULL, tecnico_id INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pendente', ficha_hash VARCHAR(64) NOT NULL, ficha_snapshot TEXT NOT NULL,
    checklist TEXT NULL, laudo TEXT NULL, emitido_em DATETIME NULL, expira_em DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_certificado_produto (produto_id), INDEX idx_certificado_tecnico (tecnico_id),
    INDEX idx_certificado_dono (solicitante_id),
    FOREIGN KEY (passaporte_id) REFERENCES passaportes(id) ON DELETE CASCADE
  )`)
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
