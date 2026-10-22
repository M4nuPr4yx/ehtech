import { apiRequest } from '../../lib/api-request'
import { siteOrigin, xmlEscape } from '../../lib/seo.mjs'
export const dynamic = 'force-dynamic'
export async function GET() {
  try {
    const data = await apiRequest('/produtos/mapa?pagina=1')
    const locations = Array.from({ length: data.paginas + 1 }, (_, index) => `${siteOrigin()}/sitemaps/${index}`)
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${locations.map(url => `<sitemap><loc>${xmlEscape(url)}</loc></sitemap>`).join('')}</sitemapindex>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' } })
  } catch { return new Response('Mapa temporariamente indisponível.', { status: 503, headers: { 'Retry-After': '60' } }) }
}
