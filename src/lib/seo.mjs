export function siteOrigin() {
  const configured = process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3001')
  try { const url = new URL(configured); if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password) return url.origin } catch {}
  return 'http://localhost:3001'
}
export const xmlEscape = value => String(value).replace(/[<>&"']/g, character => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[character])
export function productMetadata(product, origin = siteOrigin()) {
  const title = `${product.nome} | EHtech`
  const description = String(product.descricao || `Confira o anúncio de ${product.nome} na EHtech.`).replace(/\s+/g, ' ').trim().slice(0, 160)
  let images = product.imagem
  try { if (typeof images === 'string' && images.startsWith('[')) images = JSON.parse(images) } catch { images = null }
  const main = Array.isArray(images) ? images[0] : images
  let image = `${origin}/ehtech-logo.png`
  try {
    const candidate = new URL(main, origin)
    if (typeof main === 'string' && ((main.startsWith('/uploads/') && !main.includes('..')) || (candidate.protocol === 'https:' && !candidate.username && !candidate.password && !/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(candidate.hostname)))) image = candidate.href
  } catch {}
  const url = `${origin}/produtos/${product.id_produto}`
  return { title, description, alternates: { canonical: url }, openGraph: { type: 'website', locale: 'pt_BR', siteName: 'EHtech', title, description, url, images: [{ url: image, alt: product.nome }] }, twitter: { card: 'summary_large_image', title, description, images: [image] } }
}
