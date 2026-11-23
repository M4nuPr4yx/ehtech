'use client'
import { ListingBackLink } from '../../complements/ListingNavigation'
export default function ProductError({ reset }) {
  return <div className="mx-auto max-w-3xl space-y-4 px-4 py-12"><h1 className="text-2xl font-bold">Não foi possível carregar este anúncio</h1><p role="alert">O serviço está indisponível no momento. Tente novamente em alguns instantes.</p><div className="flex flex-wrap items-center gap-4"><button onClick={reset} className="rounded-xl border border-line px-5 py-3">Tentar novamente</button><ListingBackLink fallback="/produtos" fallbackLabel="Voltar aos produtos" className="font-bold text-accent underline" /></div></div>
}
