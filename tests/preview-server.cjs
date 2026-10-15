// Ambiente descartável para revisão das páginas no navegador.
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const crypto = require('node:crypto')
const mysql = require('mysql2/promise')

async function main() {
  const config = require('./helpers/mysql-config.cjs').mysqlTestConfig()
  const database = `ehtech_test_${process.pid}_${Date.now()}`
  const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'ehtech-test-preview-'))
  const connection = await mysql.createConnection(config)
  let pool, server, closing = false
  async function close() {
    if (closing) return
    closing = true
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
    if (pool) await pool.end()
    if (!/^ehtech_test_\d+_\d+$/.test(database)) throw new Error('Nome de banco inseguro')
    await connection.query(`DROP DATABASE IF EXISTS \`${database}\``)
    await connection.end()
    if (!path.resolve(uploads).startsWith(path.resolve(os.tmpdir()) + path.sep + 'ehtech-test-preview-')) throw new Error('Diretório inseguro')
    fs.rmSync(uploads, { recursive: true, force: true })
    console.log('Prévia encerrada; banco e uploads temporários removidos.')
    process.exit(process.exitCode || 0)
  }
  process.on('SIGINT', close)
  process.on('SIGTERM', close)
  process.stdin.on('data', data => { if (String(data).trim() === 'stop') close() })
  try {
    await connection.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4`)
    for (const key of ['DATABASE_URL', 'POSTGRES_URL', 'POSTGRESQL_URL', 'MYSQL_URL', 'CLEARDB_DATABASE_URL', 'PGHOST', 'VERCEL', 'SMTP_HOST', 'SMTP_USER']) delete process.env[key]
    Object.assign(process.env, { NODE_ENV: 'test', DB_HOST: config.host, DB_PORT: String(config.port), DB_USER: config.user, DB_PASSWORD: config.password, DB_DATABASE: database, DB_SSL: 'false', API_SEGREDO: crypto.randomBytes(32).toString('hex'), UPLOADS_DIR: uploads, FRONTEND_URL: 'http://localhost:3003' })
    const app = require('../backend/index')
    pool = require('../backend/db')
    await app.initDatabaseTables()
    const password = await require('bcrypt').hash('Preview-Test-2026', 10)
    for (const [username, role] of [['preview_seller', 'user'], ['preview_buyer', 'user'], ['preview_admin', 'admin']]) {
      await pool.execute('INSERT INTO usuarios (username,email,senha,role,nome) VALUES (?,?,?,?,?)', [username, `${username}@gmail.com`, password, role, username])
    }
    const image = '/uploads/img-1-preview.png'
    fs.copyFileSync(path.join(__dirname, '../public/ehtech-logo.png'), path.join(uploads, 'img-1-preview.png'))
    await pool.execute("INSERT INTO produtos (nome,descricao,preco,estoque,categoria,imagem,vendedor,vendedor_id,status_aprovacao) VALUES ('Notebook de demonstração','Produto fictício para verificar as páginas do projeto.',1500,5,'notebooks',?,'preview_seller',1,'aprovado')", [JSON.stringify([image, image])])
    const { ADDRESS_FIELDS, validateAddress, addressFingerprint, addressSnapshot } = require('../backend/addresses')
    const address = validateAddress({ destinatario: 'Pessoa Demonstração', telefone: '11999991234', identificacao: 'Depósito de teste', cep: '01001000', uf: 'SP', cidade: 'São Paulo', bairro: 'Sé', logradouro: 'Praça da Sé', numero: '10', salvar: true, principal: true }).value
    for (const userId of [1, 2, 3]) {
      const [saved] = await pool.execute(`INSERT INTO enderecos (usuario_id, ${ADDRESS_FIELDS.join(', ')}, fingerprint, confirmado_em) VALUES (${Array(ADDRESS_FIELDS.length + 2).fill('?').join(', ')}, CURRENT_TIMESTAMP)`, [userId, ...ADDRESS_FIELDS.map(field => address[field]), addressFingerprint(address)])
      if (userId === 1) await pool.execute('UPDATE produtos SET origem_endereco_id = ?, origem_snapshot = ?, origem_uf = ?, origem_cidade = ?, data_criacao = CURRENT_TIMESTAMP WHERE vendedor_id = ?', [saved.insertId, JSON.stringify(addressSnapshot(address)), address.uf, address.cidade, userId])
    }
    await require('../backend/database/init').initializeDatabase(pool)
    server = await app.startServer({ port: 3002 })
    console.log('Prévia de teste pronta em 127.0.0.1:3002. Dados fictícios; envie stop para limpar.')
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
    await close()
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
