import { ListingBackLink } from '../../complements/ListingNavigation'
export default function ProductNotFound() {
  return <div className="mx-auto max-w-3xl space-y-4 px-4 py-12"><h1 className="text-2xl font-bold">Anúncio indisponível</h1><p>Este anúncio não está disponível na vitrine.</p><ListingBackLink fallback="/produtos" fallbackLabel="Explorar anúncios disponíveis" className="font-bold text-accent underline" /></div>
}
