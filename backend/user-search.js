const { problem } = require('./addresses')

function userSearch(query, currentUserId) {
  if (typeof query.q !== 'string') throw problem(400, 'Digite pelo menos 2 caracteres do nome ou @usuário.')
  const term = query.q.trim().replace(/^@/, '').toLowerCase()
  if (term.length < 2 || term.length > 80 || /[\x00-\x1f]/.test(term)) throw problem(400, 'Busque por nome ou @usuário com 2 a 80 caracteres.')
  const page = query.page === undefined ? 1 : Number(query.page)
  if (!Number.isSafeInteger(page) || page < 1 || page > 100) throw problem(400, 'Página de usuários inválida.')
  const escaped = term.replace(/[!%_]/g, character => `!${character}`)
  return {
    page, limit: 12,
    where: "id_usuario <> ? AND (LOWER(username) LIKE ? ESCAPE '!' OR LOWER(nome) LIKE ? ESCAPE '!')",
    params: [currentUserId, `%${escaped}%`, `%${escaped}%`],
    order: "CASE WHEN LOWER(username) = ? THEN 0 WHEN LOWER(username) LIKE ? ESCAPE '!' THEN 1 WHEN LOWER(nome) = ? THEN 2 ELSE 3 END, LOWER(username), id_usuario",
    orderParams: [term, `${escaped}%`, term]
  }
}
module.exports = { userSearch }
