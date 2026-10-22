// Migrações aditivas: preservam contas, avaliações e anúncios existentes.
async function initializeTrust(pool) {
  try { await pool.execute('CREATE INDEX idx_mensagens_cursor ON mensagens (remetente_id, destinatario_id, id)') }
  catch (error) { if (!['ER_DUP_KEYNAME', '42P07'].includes(error.code)) throw error }
  for (const [table, column, definition] of [
    ['usuarios', 'session_version', 'INT NOT NULL DEFAULT 0'],
    ['avaliacoes', 'pedido_id', 'INT NULL']
  ]) {
    try { await pool.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`) }
    catch (error) { if (!['ER_DUP_FIELDNAME', '42701'].includes(error.code)) throw error }
  }
  await pool.execute(`CREATE TABLE IF NOT EXISTS favoritos (
    id INT AUTO_INCREMENT PRIMARY KEY, usuario_id INT NOT NULL, produto_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_favorito (usuario_id, produto_id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (produto_id) REFERENCES produtos(id_produto) ON DELETE CASCADE
  )`)
  await pool.execute(`CREATE TABLE IF NOT EXISTS bloqueios (
    id INT AUTO_INCREMENT PRIMARY KEY, usuario_id INT NOT NULL, bloqueado_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_bloqueio (usuario_id, bloqueado_id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (bloqueado_id) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
  )`)
  await pool.execute(`CREATE TABLE IF NOT EXISTS denuncias (
    id INT AUTO_INCREMENT PRIMARY KEY, denunciante_id INT NOT NULL,
    tipo VARCHAR(20) NOT NULL, alvo_id INT NOT NULL, motivo VARCHAR(40) NOT NULL,
    detalhes VARCHAR(2000) NOT NULL, evidencia TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'aberta', decisao VARCHAR(2000) NULL,
    moderador_id INT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_denuncias_status (status)
  )`)
  await pool.execute(`CREATE TABLE IF NOT EXISTS denuncia_decisoes (
    id INT AUTO_INCREMENT PRIMARY KEY, denuncia_id INT NOT NULL, moderador_id INT NOT NULL,
    status VARCHAR(20) NOT NULL, justificativa VARCHAR(2000) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (denuncia_id) REFERENCES denuncias(id) ON DELETE CASCADE
  )`)
}
module.exports = { initializeTrust }
