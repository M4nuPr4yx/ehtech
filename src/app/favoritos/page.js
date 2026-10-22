'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import ImageWithFallback from '../complements/ImageWithFallback'
import { getMainImage } from '../complements/imageHelper'
import { accountRequest, ProductActions } from '../complements/TrustControls'

export default function FavoritesPage() {
  const [items, setItems] = useState([]), [error, setError] = useState(''), [loading, setLoading] = useState(true)
  useEffect(() => { let active = true; accountRequest('/favoritos').then(data => { if (active) setItems(data.itens) }).catch(error => { if (active) setError(error.message) }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [])
  return <div className="mx-auto max-w-6xl space-y-6 px-4 py-10"><h1 className="text-3xl font-bold">Meus favoritos</h1><p>Até 200 anúncios salvos mais recentes. Anúncios indisponíveis deixam de aparecer.</p><nav className="flex gap-4"><Link href="/produtos">Explorar produtos</Link><Link href="/comparar">Ver comparação</Link></nav>{loading && <p role="status">Carregando favoritos…</p>}{error && <p role="alert">{error} <Link href="/?login=1&next=%2Ffavoritos">Entrar</Link></p>}{!loading && !error && !items.length && <p>Você ainda não tem anúncios favoritos.</p>}<div className="grid gap-6 md:grid-cols-2">{items.map(item => <article key={item.id_produto} className="space-y-4 rounded-2xl border border-line bg-surface p-5"><Link href={`/produtos/${item.id_produto}`}><div className="relative h-48"><ImageWithFallback src={getMainImage(item.imagem)} alt={item.nome} sizes="(max-width: 767px) 90vw, 45vw" /></div><h2 className="text-xl font-bold">{item.nome}</h2></Link><p>{Number(item.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p><ProductActions productId={item.id_produto} initialSaved={true} onFavoriteChange={saved => { if (!saved) setItems(items.filter(value => value.id_produto !== item.id_produto)) }} /></article>)}</div></div>
}
