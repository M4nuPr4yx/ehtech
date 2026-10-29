const { integer, money } = require('./validation')
const { problem } = require('./addresses')

const POLICY_VERSION = '2026-10-22'
const CATEGORIES = ['montagem', 'manutencao', 'suporte', 'redes', 'dados', 'consultoria', 'programacao', 'design', 'audiovisual', 'fotografia', 'marketing', 'redacao', 'aulas']
const FIELDS = ['titulo', 'descricao', 'categoria', 'preco_base', 'tipo_preco', 'prazo', 'modalidade', 'regiao', 'destaques', 'entregaveis', 'criterios_aceite', 'revisoes']
function clean(value, min, max, name) {
  if (typeof value !== 'string' || value.trim().length < min || value.length > max || /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) throw problem(400, `Confira o campo ${name}.`)
  return value.trim()
}
function listingInput(body) {
  if (!body || Array.isArray(body) || Object.keys(body).some(key => ![...FIELDS, 'versao', 'politicas_versao'].includes(key))) throw problem(400, 'Envie somente os campos do anúncio de serviço.')
  if (body.politicas_versao !== POLICY_VERSION) throw problem(400, 'Leia e aceite a versão atual das políticas antes de publicar.')
  if (!CATEGORIES.includes(body.categoria) || !['presencial', 'remoto', 'hibrido'].includes(body.modalidade) || !['fixo', 'a_partir_de', 'sob_consulta'].includes(body.tipo_preco)) throw problem(400, 'Categoria, modalidade ou tipo de preço inválido.')
  const price = body.tipo_preco === 'sob_consulta' ? null : money(body.preco_base)
  if (price !== null && (!Number.isFinite(price) || Math.abs(price * 100 - Math.round(price * 100)) > 0.000001)) throw problem(400, 'Informe preço positivo com até duas casas decimais.')
  if (body.tipo_preco === 'sob_consulta' && body.preco_base !== null && body.preco_base !== '') throw problem(400, 'Serviço sob consulta não tem preço base definido.')
  const revisions = integer(body.revisoes)
  if (!(revisions >= 0 && revisions <= 20)) throw problem(400, 'Informe de 0 a 20 revisões incluídas.')
  if (!Array.isArray(body.destaques) || body.destaques.length > 8) throw problem(400, 'Informe até oito destaques.')
  return {
    titulo: clean(body.titulo, 5, 180, 'título'), descricao: clean(body.descricao, 30, 5000, 'descrição'), categoria: body.categoria,
    preco_base: price, tipo_preco: body.tipo_preco, prazo: clean(body.prazo, 3, 80, 'prazo'), modalidade: body.modalidade,
    regiao: clean(body.regiao, body.modalidade === 'remoto' ? 0 : 3, 120, 'região'), destaques: body.destaques.map(item => clean(item, 2, 120, 'destaques')),
    entregaveis: clean(body.entregaveis, 10, 2000, 'entregáveis'), criterios_aceite: clean(body.criterios_aceite, 10, 2000, 'critérios de aceite'), revisoes: revisions
  }
}
function managedView(row) {
  return { ...row, preco_base: row.preco_base === null ? null : Number(row.preco_base), versao: Number(row.versao), revisoes: Number(row.revisoes), destaques: JSON.parse(row.destaques || '[]'), revisao_pendente: row.revisao_pendente ? JSON.parse(row.revisao_pendente) : null }
}
function snapshotListing(row) {
  return { ...Object.fromEntries(FIELDS.map(key => [key, row[key] ?? null])), preco_base: row.preco_base == null ? null : Number(row.preco_base), revisoes: Number(row.revisoes || 0), destaques: JSON.parse(row.destaques || '[]'), politicas_versao: row.politicas_versao || null }
}
function requireVersion(body, row) {
  if (!Number.isSafeInteger(integer(body?.versao)) || integer(body.versao) < 0) throw problem(400, 'Informe a versão do anúncio.')
  if (integer(body.versao) !== Number(row.versao)) throw problem(409, 'O anúncio mudou. Atualize a página e revise os dados.')
}
module.exports = { POLICY_VERSION, CATEGORIES, FIELDS, listingInput, managedView, snapshotListing, requireVersion }
