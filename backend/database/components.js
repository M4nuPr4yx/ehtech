const { SEEDS } = require('../components/seeds')

async function initializeComponents(pool) {
  await pool.execute(`CREATE TABLE IF NOT EXISTS componentes_tecnicos (
    id INT AUTO_INCREMENT PRIMARY KEY, slug VARCHAR(140) NOT NULL UNIQUE,
    tipo VARCHAR(30) NOT NULL, marca VARCHAR(60) NOT NULL, modelo VARCHAR(140) NOT NULL,
    especificacoes TEXT NOT NULL, fontes TEXT NOT NULL, status VARCHAR(20) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE, revisao INT NOT NULL DEFAULT 1,
    revisado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_componentes_tipo (tipo, status, ativo)
  )`)
  try {
    await pool.execute('ALTER TABLE produtos ADD COLUMN componente_id INT NULL')
  } catch (error) {
    if (!['ER_DUP_FIELDNAME', '42701'].includes(error.code) && !/duplicate column|already exists/i.test(error.message)) throw error
  }
  for (const item of SEEDS) {
    await pool.execute("INSERT IGNORE INTO componentes_tecnicos (slug, tipo, marca, modelo, especificacoes, fontes, status, ativo, revisao, revisado_em) VALUES (?, ?, ?, ?, ?, ?, 'verificado', TRUE, 1, ?)",
      [item.slug, item.tipo, item.marca, item.modelo, JSON.stringify(item.especificacoes), JSON.stringify(item.fontes), new Date('2026-10-06T12:00:00Z')])
  }
}

module.exports = { initializeComponents }
