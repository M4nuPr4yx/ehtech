'use client'

import { use, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { accountRequest } from '../../../lib/address-api'
import { orderStatus, actionStatus } from '../../../lib/order-status'
import { AddressDetails } from '../../complements/AddressBook'
import { ReportControl } from '../../complements/TrustControls'
import DeliveryPanel from '../DeliveryPanel'

const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export default function OrderPage({ params }) {
  const { id } = use(params), router = useRouter()
  const [order, setOrder] = useState(null), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const pending = useRef(null)
  const load = useCallback(async () => {
    pending.current?.abort()
    const controller = new AbortController(); pending.current = controller
    setLoading(true); setError(''); setOrder(null)
    try {
      const data = await accountRequest(`/pedidos/${encodeURIComponent(id)}`, { signal: controller.signal })
      if (!controller.signal.aborted) setOrder(data)
    } catch (failure) { if (!controller.signal.aborted) setError(failure instanceof TypeError ? 'Não foi possível conectar ao servidor.' : failure.message) }
    finally { if (!controller.signal.aborted) setLoading(false) }
  }, [id])
  useEffect(() => {
    if (!localStorage.getItem('token')) { router.replace(`/?login=1&next=${encodeURIComponent(`/pedidos/${id}`)}`); return }
    load()
    return () => pending.current?.abort()
  }, [load, router, id])
  async function action(group, body) {
    pending.current?.abort()
    const controller = new AbortController(); pending.current = controller
    setBusy(true); setError(''); setNotice('')
    try {
      const data = await accountRequest(`/pedidos/${encodeURIComponent(id)}/entregas/${encodeURIComponent(group)}`, { method: 'PATCH', body, signal: controller.signal })
      if (!controller.signal.aborted) { setOrder(data); setNotice(actionStatus[body.acao]) }
    } catch (failure) {
      if (!controller.signal.aborted) {
        setError(failure instanceof TypeError ? 'Não foi possível conectar. Atualize o pedido antes de tentar novamente.' : failure.message)
        if (failure.status === 409) { const message = failure.message; await load(); setError(message) }
      }
    } finally { setBusy(false) }
  }
  return <div className="site-background min-h-screen px-4 py-10 text-foreground"><div className="mx-auto max-w-5xl space-y-5"><Link className="font-bold text-accent underline" href="/pedidos">← Meus pedidos e vendas</Link><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl font-bold">Pedido #{id}</h1><button disabled={busy} onClick={load} className="rounded-xl border border-line px-4 py-3">Atualizar pedido</button></div>
    {error && <p role="alert" className="rounded-xl bg-danger-soft p-4 text-danger">{error}</p>}{notice && <p role="status" className="rounded-xl bg-success-soft p-4 text-success">{notice}</p>}
    {loading ? <p role="status">Carregando pedido…</p> : order && <><section className="space-y-3 rounded-2xl border border-line bg-surface p-5"><h2 className="text-xl font-bold">{orderStatus[order.status] || order.status}</h2><p>Você está acessando como {order.papel}. {order.papel === 'vendedor' ? 'Itens e valores abaixo correspondem apenas à sua venda.' : 'Cada vendedor e origem têm seu próprio acordo.'}</p><ul className="space-y-2">{order.itens.map(item => <li key={item.id_item}>{item.quantidade} × {item.nome_produto} · {money(Number(item.preco_unitario) * item.quantidade)}</li>)}</ul><p>Produtos: {money(order.subtotal)} · Fretes definidos: {money(order.frete_conhecido)}</p><p className="text-lg font-bold text-accent">{order.frete_pendente || order.acordo_pendente ? 'Valor parcial / de referência' : 'Total acordado'}: {money(order.total_parcial)}</p>{order.frete_pendente && <p className="text-warning">Há frete a combinar. Propostas não aceitas não entram no total como valores confirmados.</p>}<p className="rounded-xl bg-info-soft p-3 text-sm text-info">Pagamento externo: o site não cobra, não confirma pagamento e não garante o envio. Aceitar uma proposta registra somente as condições de entrega.</p></section>
    <ReportControl type="pedido" targetId={order.id_pedido} label="Relatar problema no pedido" /><Link className="text-accent underline" href="/politicas#trocas">Pagamento, trocas e segurança</Link>{order.endereco_entrega && <section className="rounded-2xl border border-line bg-surface p-5"><h2 className="mb-3 font-bold">Endereço registrado para entrega</h2><AddressDetails address={order.endereco_entrega} /></section>}
    {order.entregas.length ? order.entregas.map(item => <DeliveryPanel key={`${item.grupo_id}-${item.versao}`} delivery={item} role={order.papel} buyerId={order.comprador_id} disabled={busy || loading} onAction={action} onConfirmed={data => { setOrder(data); setNotice('Recebimento registrado com código do comprador.') }} />) : <p>Este pedido não possui grupos de entrega física. Para itens digitais ou registros antigos sem modalidade, combine os detalhes pelo chat.</p>}
    <section className="rounded-2xl border border-line bg-surface p-5"><h2 className="mb-4 text-xl font-bold">Histórico do acordo</h2>{order.historico?.length ? <ol className="space-y-3">{order.historico.map(item => <li key={item.id} className="border-b border-line pb-3 text-sm"><strong>{actionStatus[item.acao]}</strong> · {item.papel} · versão {item.versao} · {new Date(item.created_at).toLocaleString('pt-BR')}{item.dados.proposta && <p>Proposta: {item.dados.proposta.modalidade} · {money(item.dados.proposta.valor_frete)} · {item.dados.proposta.prazo}</p>}</li>)}</ol> : <p className="text-muted">Nenhuma alteração registrada. O histórico mostra até as 100 alterações mais recentes.</p>}</section></>}
  </div></div>
}
