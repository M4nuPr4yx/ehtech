// Gera um único bloco PostgreSQL atômico para revisão/execução por um administrador.
// Nunca abre conexão, executa migrações ou altera registros existentes.
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const catalog = require('./fixtures/demo-catalog.cjs')
const { hashPassword } = require('../backend/passwords')
const { validateAddress, ADDRESS_FIELDS, addressFingerprint, addressSnapshot } = require('../backend/addresses')
const { FIELDS, POLICY_VERSION, listingInput } = require('../backend/service-listings')

function validateCatalog() {
  if (catalog.users.length !== 10 || catalog.products.length !== 20 || catalog.services.length !== 10) throw Error('Contagens do lote inválidas.')
  for (const user of catalog.users) {
    if (!/^demo_20261029_\d{2}$/.test(user.username) || !user.email.endsWith('@example.test') || !user.nome.startsWith('Demonstração — ')) throw Error('Identidade de demonstração inválida.')
    const address = validateAddress(user.address)
    if (!address.valid) throw Error('Endereço fictício inválido: ' + JSON.stringify(address.errors))
  }
  for (const product of catalog.products) {
    if (!product.nome.startsWith('[DEMO]') || !product.descricao.startsWith(catalog.notice) || product.descricao.length > 5000 || !Number.isFinite(product.preco) || product.preco <= 0 || !Number.isInteger(product.estoque) || product.estoque < 1) throw Error('Produto de demonstração inválido.')
    if (!catalog.users.some(user => user.username === product.seller)) throw Error('Vendedor ausente.')
    for (const image of product.imagem) {
      const url = new URL(image)
      if (url.origin !== 'https://ehtech-gc18.vercel.app' || url.search || url.hash || !/^\/demo\/products\/[a-z0-9-]+\.(jpg|png)$/.test(url.pathname) || !fs.existsSync(path.join(__dirname, '..', 'public', url.pathname))) throw Error('Imagem correspondente ausente.')
    }
  }
  for (const service of catalog.services) {
    const { key, seller, ...fields } = service
    if (!key.startsWith(catalog.batch) || !catalog.users.some(user => user.username === seller) || !fields.titulo.startsWith('[DEMO]')) throw Error('Serviço sem identificação.')
    listingInput({ ...fields, politicas_versao: POLICY_VERSION })
  }
}
function sqlLiteral(value) {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
  if (typeof value === 'number') { if (!Number.isFinite(value)) throw Error('Número SQL inválido.'); return String(value) }
  if (typeof value !== 'string' || value.includes('\0')) throw Error('Valor SQL inválido.')
  return "E'" + value.replaceAll('\\', '\\\\').replaceAll("'", "''") + "'"
}
function bind(sql, values) {
  let index = 0
  const text = sql.replace(/\?/g, () => { if (index >= values.length) throw Error('Parâmetros ausentes.'); return sqlLiteral(values[index++]) })
  if (index !== values.length) throw Error('Parâmetros excedentes.')
  return text
}
async function buildPgBlock({ database, scale = 1, passwordHashes, allowPublic = false } = {}) {
  validateCatalog()
  if (!/^ehtech_(test|e2e)_\d+_\d+$/.test(database || '') && !(allowPublic && database === 'neondb' && scale === 1)) throw Error('Selecione uma base temporária ou autorize explicitamente o lote público neondb de 20/10.')
  if (!Number.isInteger(scale) || scale < 1 || scale > 100) throw Error('Escala local deve estar entre 1 e 100.')
  const commands = [], guards = []
  for (const user of catalog.users) {
    const hash = passwordHashes?.[user.username] || await hashPassword(crypto.randomBytes(32).toString('hex'))
    guards.push(bind("IF EXISTS (SELECT 1 FROM usuarios WHERE (username = ? OR email = ?) AND NOT (username = ? AND email = ? AND nome = ? AND role = 'user')) THEN RAISE EXCEPTION 'Conflito de identidade: lote cancelado sem alterações'; END IF", [user.username, user.email, user.username, user.email, user.nome]))
    commands.push({ sql: "INSERT INTO usuarios (username,email,senha,nome,role) SELECT ?,?,?,?,'user' WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE username = ? OR email = ?)", values: [user.username, user.email, hash, user.nome, user.username, user.email] })
    const address = validateAddress(user.address).value, fingerprint = addressFingerprint(address)
    commands.push({ sql: `INSERT INTO enderecos (usuario_id,${ADDRESS_FIELDS.join(',')},fingerprint,confirmado_em)
      SELECT u.id_usuario,${ADDRESS_FIELDS.map(() => '?').join(',')},?,CURRENT_TIMESTAMP FROM usuarios u
      WHERE u.username = ? AND u.email = ? AND NOT EXISTS (SELECT 1 FROM enderecos e WHERE e.usuario_id = u.id_usuario AND e.fingerprint = ?)`,
    values: [...ADDRESS_FIELDS.map(field => address[field]), fingerprint, user.username, user.email, fingerprint] })
  }
  const names = [], slugs = []
  for (let copy = 0; copy < scale; copy++) {
    for (const product of catalog.products) {
      const user = catalog.users.find(user => user.username === product.seller), address = validateAddress(user.address).value
      const name = product.nome + (copy ? ` [carga ${copy + 1}]` : ''); names.push(name)
      commands.push({ sql: `INSERT INTO produtos (nome,descricao,preco,estoque,categoria,imagem,vendedor,vendedor_id,status_aprovacao,exige_entrega,origem_endereco_id,origem_snapshot,origem_uf,origem_cidade,data_criacao)
        SELECT ?,?,?,?,?,?,u.username,u.id_usuario,'aprovado',TRUE,e.id,?,?,?,CURRENT_TIMESTAMP
        FROM usuarios u JOIN enderecos e ON e.usuario_id = u.id_usuario AND e.fingerprint = ? AND e.excluido = FALSE
        WHERE u.username = ? AND u.email = ? AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.nome = ? AND p.vendedor_id = u.id_usuario)`,
      values: [name, product.descricao, product.preco, product.estoque, product.categoria, JSON.stringify(product.imagem), JSON.stringify(addressSnapshot(address)), address.uf, address.cidade, addressFingerprint(address), user.username, user.email, name] })
    }
    for (const service of catalog.services) {
      const user = catalog.users.find(user => user.username === service.seller)
      const slug = service.key + (copy ? `-carga-${copy + 1}` : ''); slugs.push(slug)
      const fields = listingInput({ ...Object.fromEntries(FIELDS.map(key => [key, service[key]])), politicas_versao: POLICY_VERSION })
      guards.push(bind("IF EXISTS (SELECT 1 FROM servicos s JOIN usuarios u ON u.id_usuario = s.prestador_id WHERE s.slug = ? AND (u.username <> ? OR u.email <> ?)) THEN RAISE EXCEPTION 'Conflito de proprietário: lote cancelado'; END IF", [slug, user.username, user.email]))
      commands.push({ sql: `INSERT INTO servicos (${FIELDS.join(',')},slug,prestador_id,status,status_aprovacao,origem,politicas_versao)
        SELECT ${FIELDS.map(() => '?').join(',')},?,u.id_usuario,'ativo','aprovado','usuario',? FROM usuarios u
        WHERE u.username = ? AND u.email = ? AND NOT EXISTS (SELECT 1 FROM servicos WHERE slug = ?)`,
      values: [...FIELDS.map(key => key === 'destaques' ? JSON.stringify(fields[key]) : fields[key]), slug, POLICY_VERSION, user.username, user.email, slug] })
    }
  }
  const usernames = catalog.users.map(user => sqlLiteral(user.username)).join(',')
  const countProducts = `SELECT COUNT(*) FROM produtos p JOIN usuarios u ON u.id_usuario=p.vendedor_id WHERE u.username IN (${usernames}) AND p.nome IN (${names.map(sqlLiteral).join(',')})`
  const countServices = `SELECT COUNT(*) FROM servicos s JOIN usuarios u ON u.id_usuario=s.prestador_id WHERE u.username IN (${usernames}) AND s.slug IN (${slugs.map(sqlLiteral).join(',')})`
  const body = `BEGIN\n  PERFORM set_config('lock_timeout','5s',true);\n  PERFORM set_config('statement_timeout','60s',true);\n  IF current_database() <> ${sqlLiteral(database)} THEN RAISE EXCEPTION 'Banco incorreto: nenhuma alteração aplicada'; END IF;\n  PERFORM pg_advisory_xact_lock(hashtext('${catalog.batch}'));\n  ${guards.join(';\n  ')};\n  ${commands.map(command => bind(command.sql, command.values)).join(';\n  ')};\n  IF (${countProducts}) <> ${20 * scale} OR (${countServices}) <> ${10 * scale} THEN RAISE EXCEPTION 'Contagens inesperadas: lote revertido'; END IF;\nEND`
  // Conteúdo externo (créditos de fotos) não pode fechar o dollar quote do bloco.
  let tag = '$ehdemo_' + crypto.createHash('sha256').update(body).digest('hex').slice(0, 16) + '$'
  while (body.includes(tag)) tag = tag.slice(0, -1) + 'x$'
  const sql = `DO ${tag}\n${body}\n${tag};\n`
  return { sql, expected: { users: 10, products: 20 * scale, services: 10 * scale }, names, slugs }
}
if (require.main === module) {
  const args = process.argv.slice(2), outputIndex = args.indexOf('--output')
  if (!args.includes('--public-demo-neondb') || outputIndex === -1) throw Error('Use --public-demo-neondb --output scratch/demo-catalog/production.sql. O comando somente gera SQL; não o executa.')
  const output = path.resolve(args[outputIndex + 1] || '')
  const scratch = path.resolve(__dirname, '..', 'scratch', 'demo-catalog')
  if (path.dirname(output) !== scratch || path.extname(output) !== '.sql') throw Error('Grave o lote somente em scratch/demo-catalog/*.sql, fora do Git.')
  buildPgBlock({ database: 'neondb', allowPublic: true }).then(result => {
    fs.mkdirSync(scratch, { recursive: true }); fs.writeFileSync(output, result.sql, { flag: 'wx' })
    console.log(JSON.stringify({ generated: path.basename(output), expected: result.expected, execution: 'não executado; revisão administrativa necessária' }))
  }).catch(error => { console.error(error.message); process.exitCode = 1 })
}
module.exports = { validateCatalog, buildPgBlock, sqlLiteral }
