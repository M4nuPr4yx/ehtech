// Teste de conversão de SQL de MySQL para PostgreSQL
const sqlSamples = [
  `CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    foto LONGTEXT DEFAULT NULL,
    nome VARCHAR(255) DEFAULT NULL,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS avaliacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    produto_id INT NOT NULL,
    avaliador_id INT NOT NULL,
    nota INT NOT NULL,
    comentario TEXT,
    data_avaliacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_avaliacao (produto_id, avaliador_id),
    INDEX idx_produto (produto_id),
    INDEX idx_avaliador (avaliador_id)
  )`,
  `SELECT * FROM usuarios WHERE email = ? AND role = ?`,
  `INSERT INTO usuarios (username, email, senha, role) VALUES (?, ?, ?, ?)`,
  `UPDATE produtos SET nome = ?, preco = ? WHERE id_produto = ?`
];

function convertSqlForPostgres(sql) {
  let converted = sql;

  if (/create\s+table/i.test(converted)) {
    converted = converted
      .replace(/id_usuario\s+INT\s+AUTO_INCREMENT\s+PRIMARY\s+KEY/gi, 'id_usuario SERIAL PRIMARY KEY')
      .replace(/id_produto\s+INT\s+AUTO_INCREMENT\s+PRIMARY\s+KEY/gi, 'id_produto SERIAL PRIMARY KEY')
      .replace(/id\s+INT\s+AUTO_INCREMENT\s+PRIMARY\s+KEY/gi, 'id SERIAL PRIMARY KEY')
      .replace(/INT\s+AUTO_INCREMENT\s+PRIMARY\s+KEY/gi, 'SERIAL PRIMARY KEY')
      .replace(/AUTO_INCREMENT/gi, '')
      .replace(/LONGTEXT/gi, 'TEXT')
      .replace(/DATETIME/gi, 'TIMESTAMP')
      .replace(/UNIQUE\s+KEY\s+(\w+)\s*\(([^)]+)\)/gi, 'UNIQUE ($2)')
      .replace(/,\s*INDEX\s+\w+\s*\([^)]+\)/gi, '')
      .replace(/INDEX\s+\w+\s*\([^)]+\),?/gi, '')
      .replace(/,\s*\)/g, '\n)');
  }

  if (/^\s*INSERT\s+INTO/i.test(converted) && !/RETURNING/i.test(converted)) {
    converted = converted.trim().replace(/;?$/, '') + ' RETURNING *';
  }

  let idx = 1;
  converted = converted.replace(/\?/g, () => `$${idx++}`);

  return converted;
}

console.log('--- TEST RESULTS ---');
for (const sql of sqlSamples) {
  console.log('\n[ORIGINAL]:\n', sql);
  console.log('\n[CONVERTED FOR POSTGRES / NEON]:\n', convertSqlForPostgres(sql));
}
