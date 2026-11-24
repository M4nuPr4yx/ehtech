import { cache } from 'react'
import { notFound } from 'next/navigation'
import { apiRequest } from '../../../lib/api-request'
import { publicPageMetadata } from '../../../lib/seo.mjs'
import ServiceDetail from './ServiceDetail'

export const dynamic = 'force-dynamic'

// Os metadados e o HTML inicial usam a mesma consulta por renderização.
const getService = cache(async slug => {
  if (!/^[a-z0-9-]{1,160}$/.test(slug)) return { missing: true }
  try {
    return { service: await apiRequest(`/servicos/${slug}`, { timeoutMs: 4500 }) }
  } catch (error) {
    if (error.status === 404 || error.status === 400) return { missing: true }
    return { service: null }
  }
})

export async function generateMetadata({ params }) {
  const { slug } = await params
  const { service, missing } = await getService(slug)
  if (missing) notFound()
  if (!service) return { title: 'Anúncio de serviço | EHtech', robots: { index: false, follow: true } }
  const description = (service.descricao || 'Confira os detalhes e solicite um orçamento na EHtech.').replace(/\s+/g, ' ').trim().slice(0, 160)
  return publicPageMetadata(`${service.titulo} | EHtech`, description, `/servicos/${slug}`)
}

export default async function ServicePage({ params }) {
  const { slug } = await params
  const { service, missing } = await getService(slug)
  if (missing) notFound()
  return <ServiceDetail key={slug} slug={slug} initialService={service} />
}
