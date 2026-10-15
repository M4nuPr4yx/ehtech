const TABLES = [
  `CREATE TABLE IF NOT EXISTS enderecos (
    id INT AUTO_INCREMENT PRIMARY KEY, usuario_id INT NOT NULL,
    destinatario VARCHAR(150) NOT NULL, telefone VARCHAR(20) NOT NULL,
    identificacao VARCHAR(60) NOT NULL, cep VARCHAR(8) NOT NULL, uf VARCHAR(2) NOT NULL,
    cidade VARCHAR(100) NOT NULL, bairro VARCHAR(100) NOT NULL, logradouro VARCHAR(180) NOT NULL,
    numero VARCHAR(20) NOT NULL, sem_numero BOOLEAN NOT NULL DEFAULT FALSE,
    complemento VARCHAR(150) NOT NULL, referencia VARCHAR(200) NOT NULL, instrucoes VARCHAR(500) NOT NULL,
    principal BOOLEAN NOT NULL DEFAULT FALSE, salvar BOOLEAN NOT NULL DEFAULT TRUE,
    excluido BOOLEAN NOT NULL DEFAULT FALSE, versao INT NOT NULL DEFAULT 1,
    confirmado_em TIMESTAMP NULL, fingerprint VARCHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_enderecos_usuario (usuario_id, excluido)
  )`,
  `CREATE TABLE IF NOT EXISTS checkout_sessoes (
    id VARCHAR(36) PRIMARY KEY, usuario_id INT NOT NULL, itens TEXT NOT NULL, carrinho_hash VARCHAR(64) NOT NULL,
    endereco_id INT NULL, endereco_versao INT NULL, confirmado_em TIMESTAMP NULL,
    entrega TEXT NULL, pedido_id INT NULL, expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_checkout_usuario (usuario_id)
  )`
]

async function initializeAddresses(pool) {
  for (const sql of TABLES) await pool.execute(sql)
  for (const [table, field, definition] of [
    ['produtos', 'exige_entrega', 'BOOLEAN NOT NULL DEFAULT TRUE'],
    ['pedidos_produto', 'endereco_entrega', 'TEXT NULL'],
    ['pedidos_produto', 'entrega', 'TEXT NULL'],
    ['pedidos_produto', 'frete', 'DECIMAL(10,2) NOT NULL DEFAULT 0'],
    ['pedidos_produto', 'status_pagamento', "VARCHAR(30) NOT NULL DEFAULT 'nao_iniciado'"],
    ['pedidos_produto', 'checkout_id', 'VARCHAR(36) NULL']
  ]) {
    try {
      await pool.execute(`ALTER TABLE ${table} ADD COLUMN ${field} ${definition}`)
    } catch (error) {
      if (!['ER_DUP_FIELDNAME', '42701'].includes(error.code)) throw error
    }
  }
}

module.exports = { initializeAddresses }
