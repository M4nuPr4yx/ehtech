const { integer } = require('./validation')
const { problem } = require('./addresses')
function messagePage(query = {}) {
  const limit = query.limit === undefined ? 40 : integer(query.limit)
  const before = query.antes === undefined ? null : integer(query.antes)
  const after = query.depois === undefined ? null : integer(query.depois)
  if (!(limit > 0 && limit <= 100) || (before !== null && !(before > 0)) || (after !== null && !(after > 0)) || (before !== null && after !== null)) throw problem(400, 'Paginação inválida. Use limite de 1 a 100 e apenas um cursor antes ou depois.')
  return { limit, before, after, condition: before !== null ? ' AND m.id < ?' : after !== null ? ' AND m.id > ?' : '', params: before !== null ? [before] : after !== null ? [after] : [], order: after !== null ? 'ASC' : 'DESC' }
}
function pageResult(rows, page) {
  const more = rows.length > page.limit
  const items = rows.slice(0, page.limit)
  if (page.after === null) items.reverse()
  return { mensagens: items, paginacao: { limite: page.limit, cursor_anterior: items[0]?.id || null, cursor_posterior: items.at(-1)?.id || null, tem_anteriores: page.after === null && more, tem_mais: page.after !== null && more } }
}
module.exports = { messagePage, pageResult }
