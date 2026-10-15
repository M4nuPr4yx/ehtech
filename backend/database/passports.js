const TABLES = [
  `CREATE TABLE IF NOT EXISTS passaportes (
    id INT AUTO_INCREMENT PRIMARY KEY, proprietario_id INT NOT NULL,
    nome VARCHAR(100) NOT NULL, tipo VARCHAR(30) NOT NULL, modelo VARCHAR(120) NOT NULL,
    componentes TEXT NOT NULL, publico_codigo VARCHAR(64) NULL UNIQUE,
    transferencia_hash VARCHAR(64) NULL UNIQUE, destinatario_id INT NULL,
    transferencia_expira_em TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_passaportes_proprietario (proprietario_id),
    FOREIGN KEY (proprietario_id) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS passaporte_registros (
    id INT AUTO_INCREMENT PRIMARY KEY, passaporte_id INT NOT NULL,
    tipo VARCHAR(30) NOT NULL, titulo VARCHAR(180) NOT NULL,
    ocorrido_em DATETIME NOT NULL, origem VARCHAR(20) NOT NULL,
    contratacao_id INT NULL UNIQUE, garantia_fim_em TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_passaporte_registros (passaporte_id),
    FOREIGN KEY (passaporte_id) REFERENCES passaportes(id) ON DELETE CASCADE
  )`
]

async function initializePassports(pool) {
  for (const statement of TABLES) await pool.execute(statement)
}

module.exports = { initializePassports }
