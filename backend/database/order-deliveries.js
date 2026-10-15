async function initializeOrderDeliveries(pool) {
  await pool.execute(`CREATE TABLE IF NOT EXISTS pedido_entregas (
    id INT AUTO_INCREMENT PRIMARY KEY, pedido_id INT NOT NULL,
    grupo_id VARCHAR(80) NOT NULL, vendedor_id INT NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'aguardando_proposta', versao INT NOT NULL DEFAULT 0,
    dados TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_pedido_entrega (pedido_id, grupo_id),
    FOREIGN KEY (pedido_id) REFERENCES pedidos_produto(id_pedido) ON DELETE CASCADE
  )`)
  await pool.execute(`CREATE TABLE IF NOT EXISTS pedido_entrega_eventos (
    id INT AUTO_INCREMENT PRIMARY KEY, entrega_id INT NOT NULL, autor_id INT NOT NULL,
    acao VARCHAR(30) NOT NULL, versao INT NOT NULL, dados TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entrega_id) REFERENCES pedido_entregas(id) ON DELETE CASCADE
  )`)
}

module.exports = { initializeOrderDeliveries }
