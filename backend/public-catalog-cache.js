// Apenas vitrines anônimas de itens aprovados. Dados privados nunca entram no CDN.
function publicCatalogCache(req, res) {
  res.vary('Authorization')
  if (req.headers.authorization || req.headers.cookie) {
    res.set('Cache-Control', 'no-store')
    res.set('Vercel-CDN-Cache-Control', 'no-store')
    return
  }
  res.set('Cache-Control', 'public, max-age=0, must-revalidate')
  res.set('Vercel-CDN-Cache-Control', 'public, s-maxage=15, stale-while-revalidate=30')
}
module.exports = { publicCatalogCache }
