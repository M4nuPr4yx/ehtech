'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { accountRequest } from '../../lib/address-api'
import { orderStatus } from '../../lib/order-status'
import LoadingState from '../complements/LoadingState'

const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export default function OrdersPage() {
  const router = useRouter()
  const [sales, setSales] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    if (!localStorage.getItem('token')) { router.replace('/?login=1&next=%2Fpedidos'); return }
    const controller = new AbortController()
    accountRequest(sales ? '/pedidos/vendas' : '/pedidos', { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) { setItems(data); setLoading(false) }
    }).catch(failure => { if (!controller.signal.aborted) { setError(failure instanceof TypeError ? 'Não foi possível conectar ao servidor.' : failure.message); setLoading(false) } })
    return () => controller.abort()
  }, [sales, retry, router])
  function refresh(next = sales) { setLoading(true); setError(''); setItems([]); setSales(next); setRetry(value => value + 1) }
  return <div className="site-background min-h-screen px-4 py-10 text-foreground"><div className="mx-auto max-w-5xl space-y-6">
    <div><h1 className="text-3xl font-bold">Pedidos e vendas</h1><p className="mt-2 text-muted">Registre o acordo, acompanhe a entrega e confirme o recebimento. Pagamento combinado por fora, sem cobrança automática.</p></div>
    <div className="flex flex-wrap gap-3"><button onClick={() => refresh(false)} aria-pressed={!sales} className="rounded-xl border border-line bg-surface px-4 py-3 font-bold text-accent">Minhas compras</button><button onClick={() => refresh(true)} aria-pressed={sales} className="rounded-xl border border-line bg-surface px-4 py-3 font-bold text-accent">Minhas vendas</button><button onClick={() => refresh()} className="px-4 py-3 underline">Atualizar</button></div>
    {error && <p role="alert" className="rounded-xl bg-danger-soft p-4 text-danger">{error}</p>}
    {loading ? <LoadingState label="Carregando seus pedidos…" /> : !error && !items.length ? <p className="rounded-xl border border-line p-6">Nenhum pedido nesta lista.</p> : <ul className="space-y-4">{items.map(item => <li key={item.id_pedido} className="rounded-2xl border border-line bg-surface p-5"><div className="flex flex-wrap justify-between gap-3"><h2 className="text-lg font-bold">Pedido #{item.id_pedido}</h2><span className="text-accent">{orderStatus[item.status] || item.status}</span></div><p className="my-3 text-sm text-muted">{item.itens.map(part => part.nome_produto).join(' · ')}</p><p>{item.frete_pendente || item.acordo_pendente ? 'Valor parcial / de referência' : 'Total acordado'}: <strong>{money(item.total_parcial)}</strong>{item.frete_pendente ? ' · Frete pendente' : ''}</p><Link href={`/pedidos/${item.id_pedido}`} className="mt-4 inline-block font-bold text-accent underline">Ver pedido e acompanhar acordo →</Link></li>)}</ul>}
  </div></div>
}
