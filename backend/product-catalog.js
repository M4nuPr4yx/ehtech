const { STATES, problem } = require('./addresses')

function dateFilter(value) {
  if (value === undefined || value === '') return null
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw problem(400, 'Informe datas válidas no formato AAAA-MM-DD.')
  const date = new Date(`${value}T00:00:00Z`)
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value || value < '1970-01-01' || value > '9998-12-31') throw problem(400, 'Data de publicação inválida.')
  return value
}
const like = value => value.replace(/[!%_]/g, match => `!${match}`)
function catalogQuery(query) {
  const page = Math.min(Math.max(Number.parseInt(query.page, 10) || 1, 1), 100000)
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 12, 1), 24)
  const search = typeof query.search === 'string' ? query.search.trim().slice(0, 100).toLowerCase() : ''
  const category = typeof query.categoria === 'string' ? query.categoria.trim().slice(0, 60).toLowerCase() : ''
  const uf = typeof query.uf === 'string' ? query.uf.trim().toUpperCase() : ''
  const city = typeof query.cidade === 'string' ? query.cidade.trim().slice(0, 100).toLowerCase() : ''
  if (uf && !STATES.includes(uf)) throw problem(400, 'Selecione uma UF brasileira válida.')
  const start = dateFilter(query.dataInicio), end = dateFilter(query.dataFim)
  if (start && end && start > end) throw problem(400, 'A data inicial deve ser anterior ou igual à final.')
  const min = Number.parseFloat(query.precoMin), max = Number.parseFloat(query.precoMax)
  if (Number.isFinite(min) && Number.isFinite(max) && min >= 0 && max >= 0 && min > max) throw problem(400, 'O preço mínimo não pode ser maior que o máximo.')
  const filters = ["status_aprovacao = 'aprovado'"], params = []
  if (search) { filters.push("(LOWER(nome) LIKE ? ESCAPE '!' OR LOWER(descricao) LIKE ? ESCAPE '!')"); params.push(`%${like(search)}%`, `%${like(search)}%`) }
  if (category) {
    const aliases = category === 'audio' ? ['audio', 'áudio', 'fones de ouvido'] : [category]
    filters.push(`LOWER(categoria) IN (${aliases.map(() => '?').join(',')})`); params.push(...aliases)
  }
  if (uf) { filters.push('origem_uf = ?'); params.push(uf) }
  if (city) { filters.push('LOWER(origem_cidade) = ?'); params.push(city) }
  if (start) { filters.push('data_criacao >= ?'); params.push(`${start} 00:00:00`) }
  if (end) {
    const next = new Date(`${end}T00:00:00Z`); next.setUTCDate(next.getUTCDate() + 1)
    filters.push('data_criacao < ?'); params.push(`${next.toISOString().slice(0, 10)} 00:00:00`)
  }
  if (Number.isFinite(min) && min >= 0) { filters.push('preco >= ?'); params.push(min) }
  if (Number.isFinite(max) && max >= 0) { filters.push('preco <= ?'); params.push(max) }
  const sort = ['recentes', 'antigos', 'relevancia', 'menor-preco', 'maior-preco'].includes(query.ordenacao) ? query.ordenacao : 'recentes'
  const recent = 'CASE WHEN data_criacao IS NULL THEN 1 ELSE 0 END, data_criacao DESC, id_produto DESC'
  const sorting = { recentes: recent, antigos: 'CASE WHEN data_criacao IS NULL THEN 1 ELSE 0 END, data_criacao ASC, id_produto ASC', 'menor-preco': 'preco ASC, id_produto DESC', 'maior-preco': 'preco DESC, id_produto DESC', relevancia: recent }
  let relevance = '', orderParams = []
  if (sort === 'relevancia' && search) {
    relevance = "CASE WHEN LOWER(nome) = ? THEN 4 WHEN LOWER(nome) LIKE ? ESCAPE '!' THEN 3 WHEN LOWER(nome) LIKE ? ESCAPE '!' THEN 2 ELSE 1 END DESC, "
    orderParams = [search, `${like(search)}%`, `%${like(search)}%`]
  }
  return { page, limit, where: filters.join(' AND '), params, order: `(estoque <= 0) ASC, ${relevance}${sorting[sort]}`, orderParams }
}
module.exports = { catalogQuery, dateFilter }
