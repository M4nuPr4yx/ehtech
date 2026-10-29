async function initializeGoogleIdentity(pool) {
  try { await pool.execute('ALTER TABLE usuarios ADD COLUMN senha_definida BOOLEAN NOT NULL DEFAULT TRUE') }
  catch (error) { if (!['ER_DUP_FIELDNAME', '42701'].includes(error.code)) throw error }
  await pool.execute(`CREATE TABLE IF NOT EXISTS usuario_identidades (
    id INT AUTO_INCREMENT PRIMARY KEY, usuario_id INT NOT NULL,
    provedor VARCHAR(30) NOT NULL, sujeito VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_identidade_sujeito (provedor, sujeito), UNIQUE KEY uq_identidade_usuario (usuario_id, provedor),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
  )`)
  await pool.execute(`CREATE TABLE IF NOT EXISTS google_auth_desafios (
    cookie_hash VARCHAR(64) PRIMARY KEY, nonce_hash VARCHAR(64) NOT NULL,
    usuario_id INT NULL, expira_em BIGINT NOT NULL, tentativas INT NOT NULL DEFAULT 0,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
  )`)
  await pool.execute(`CREATE TABLE IF NOT EXISTS google_oauth_fluxos (
    cookie_hash VARCHAR(64) PRIMARY KEY, estado_hash VARCHAR(64) NOT NULL,
    verificador TEXT NULL, credencial TEXT NULL, destino VARCHAR(1000) NOT NULL,
    processado BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (cookie_hash) REFERENCES google_auth_desafios(cookie_hash) ON DELETE CASCADE
  )`)
}
module.exports = { initializeGoogleIdentity }
