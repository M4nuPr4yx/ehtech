import { apiRequest } from '../../../lib/api-request'
import { siteOrigin, xmlEscape } from '../../../lib/seo.mjs'
export const dynamic = 'force-dynamic'
export async function GET(request, { params }) {
  const { pagina } = await params
  if (!/^\d{1,6}$/.test(pagina)) return new Response('Mapa não encontrado.', { status: 404 })
  try {
    let urls
    if (pagina === '0') urls = ['/', '/produtos', '/servicos', '/sobre', '/compatibilidade', '/missoes', '/combos'].map(path => siteOrigin() + path)
    else {
      const data = await apiRequest(`/produtos/mapa?pagina=${pagina}`)
      if (Number(pagina) > data.paginas) return new Response('Mapa não encontrado.', { status: 404 })
      urls = data.itens.map(item => `${siteOrigin()}/produtos/${item.id_produto}`)
    }
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(url => `<url><loc>${xmlEscape(url)}</loc></url>`).join('')}</urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' } })
  } catch { return new Response('Mapa temporariamente indisponível.', { status: 503, headers: { 'Retry-After': '60' } }) }
}
