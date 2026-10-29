import { siteOrigin } from '../lib/seo.mjs'
export default function robots() {
  return { rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/admin', '/perfil', '/mensagens', '/pedidos', '/contratacoes', '/meus-servicos', '/carrinho', '/checkout', '/anunciar', '/editar-produto', '/favoritos', '/bloqueados', '/comparar', '/passaportes', '/certificados', '/esqueci-senha', '/redefinir-senha'] }, sitemap: `${siteOrigin()}/sitemap.xml` }
}
