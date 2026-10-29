const { FIELDS, snapshotListing } = require('../service-listings')
async function initializeServiceListings(pool, seeds) {
  for (const [column, definition] of [
    ['status_aprovacao', "VARCHAR(20) NOT NULL DEFAULT 'aprovado'"], ['origem', "VARCHAR(20) NOT NULL DEFAULT 'legado'"],
    ['versao', 'INT NOT NULL DEFAULT 0'], ['revisao_pendente', 'TEXT NULL'], ['motivo_reprovacao', 'VARCHAR(500) NULL'],
    ['entregaveis', 'TEXT NULL'], ['criterios_aceite', 'TEXT NULL'], ['revisoes', 'INT NOT NULL DEFAULT 0'], ['politicas_versao', 'VARCHAR(30) NULL']
  ]) {
    try { await pool.execute(`ALTER TABLE servicos ADD COLUMN ${column} ${definition}`) }
    catch (error) { if (!['ER_DUP_FIELDNAME', '42701'].includes(error.code)) throw error }
  }
  // Somente exemplos que ainda correspondem integralmente ao catálogo antigo.
  // O proprietário e as contratações são preservados; não reexecuta em itens já classificados.
  for (const seed of seeds) await pool.execute(
    `UPDATE servicos SET origem = 'demonstracao', status = 'pausado'
     WHERE origem = 'legado' AND slug = ? AND titulo = ? AND descricao = ? AND categoria = ?
     AND preco_base = ? AND tipo_preco = ? AND prazo = ? AND modalidade = ? AND regiao = ? AND destaques = ?`,
    [seed.slug, seed.titulo, seed.descricao, seed.categoria, seed.precoBase, seed.tipoPreco, seed.prazo, seed.modalidade, seed.regiao, JSON.stringify(seed.destaques)])
  try { await pool.execute('ALTER TABLE contratacoes_servico ADD COLUMN servico_snapshot TEXT NULL') }
  catch (error) { if (!['ER_DUP_FIELDNAME', '42701'].includes(error.code)) throw error }
  const [contracts] = await pool.execute(`SELECT c.id_contratacao, ${FIELDS.map(key => `s.${key}`).join(', ')}, s.politicas_versao
    FROM contratacoes_servico c JOIN servicos s ON s.id_servico = c.servico_id WHERE c.servico_snapshot IS NULL`)
  for (const row of contracts) await pool.execute('UPDATE contratacoes_servico SET servico_snapshot = ? WHERE id_contratacao = ? AND servico_snapshot IS NULL', [JSON.stringify(snapshotListing(row)), row.id_contratacao])
}
module.exports = { initializeServiceListings }
