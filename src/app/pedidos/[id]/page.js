'use client'

import { use, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { accountRequest } from '../../../lib/address-api'
import { orderStatus, actionStatus } from '../../../lib/order-status'
import { deliveryCount, uncertainOrderChange } from '../../../lib/order-guidance.mjs'
import { AddressDetails } from '../../complements/AddressBook'
import { ReportControl } from '../../complements/TrustControls'
import LoadingState from '../../complements/LoadingState'
import DeliveryPanel from '../DeliveryPanel'

const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export default function OrderPage({ params }) {
  const { id } = use(params), router = useRouter()
  const [storedOrder, setOrder] = useState(null), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false)
  const [stale, setStale] = useState(true), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const pending = useRef(null), changing = useRef(false)
  // Never show a previous order while a different URL is loading.
  const order = Number(storedOrder?.id_pedido) === Number(id) ? storedOrder : null
  const load = useCallback(async () => {
    if (changing.current) return
    pending.current?.abort()
    const controller = new AbortController(); pending.current = controller
    setLoading(true); setError(''); setStale(true)
    try {
      const data = await accountRequest(`/pedidos/${encodeURIComponent(id)}`, { signal: controller.signal })
      if (!controller.signal.aborted) { setOrder(data); setStale(false) }
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure.message || 'Não foi possível conectar ao servidor.')
    } finally { if (!controller.signal.aborted) setLoading(false) }
  }, [id])
  useEffect(() => {
    if (!localStorage.getItem('token')) { router.replace(`/?login=1&next=${encodeURIComponent(`/pedidos/${id}`)}`); return }
    load()
    return () => pending.current?.abort()
  }, [load, router, id])
  function startChange() {
    if (changing.current || loading || stale) return false
    changing.current = true; setBusy(true); setError(''); setNotice('')
    return true
  }
  function finishChange() { changing.current = false; setBusy(false) }
  function flagUncertain() {
    setStale(true)
    setError('Não foi possível confirmar o resultado desta ação. Atualize o pedido antes de tentar novamente; a alteração pode já ter sido registrada.')
  }
  async function action(group, body) {
    if (!startChange()) return
    const controller = new AbortController(); pending.current = controller
    try {
      const data = await accountRequest(`/pedidos/${encodeURIComponent(id)}/entregas/${encodeURIComponent(group)}`, { method: 'PATCH', body, signal: controller.signal })
      if (!controller.signal.aborted) { setOrder(data); setNotice(actionStatus[body.acao]) }
    } catch (failure) {
      if (!controller.signal.aborted) {
        if (uncertainOrderChange(failure)) flagUncertain()
        else setError(failure.message)
      }
    } finally { finishChange() }
  }
  return <div className="site-background min-h-screen px-4 py-10 text-foreground"><div className="mx-auto max-w-5xl space-y-5">
    <Link className="font-bold text-accent underline" href="/pedidos">← Meus pedidos e vendas</Link>
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl font-bold">Pedido #{id}</h1><button disabled={busy || loading} onClick={load} className="rounded-xl border border-line bg-surface px-4 py-3">{loading ? 'Atualizando…' : 'Atualizar pedido'}</button></div>
    {error && <p role="alert" className="rounded-xl bg-danger-soft p-4 text-danger">{error}</p>}
    {notice && <p role="status" className="rounded-xl bg-success-soft p-4 text-success">{notice}</p>}
    {loading && !order && <LoadingState label="Carregando pedido…" />}
    {loading && order && <p role="status">Buscando a situação mais recente do pedido…</p>}
    {order && <>
      {stale && !loading && <p role="status" className="rounded-xl bg-warning-soft p-4 text-warning">Os dados abaixo são da última consulta. Use Atualizar pedido para conferir a situação atual e liberar as ações.</p>}
      <section className="space-y-3 rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-xl font-bold">{orderStatus[order.status] || order.status}</h2>
        <p>{order.papel === 'vendedor' ? 'Você está acompanhando sua venda. Itens e valores abaixo correspondem apenas a ela.' : 'Sua compra foi registrada. Veja abaixo o próximo passo de cada entrega.'}</p>
        <p className="font-bold text-accent">{deliveryCount(order.entregas)}</p>
        {order.entregas.length > 1 && <p className="text-sm text-muted">O pedido termina quando todas as entregas forem recebidas. Confirme cada uma somente depois de receber seus produtos.</p>}
        <ul className="space-y-2">{order.itens.map(item => <li key={item.id_item}>{item.quantidade} × {item.nome_produto} · {money(Number(item.preco_unitario) * item.quantidade)}</li>)}</ul>
        <p>Produtos: {money(order.subtotal)} · Fretes definidos: {money(order.frete_conhecido)}</p>
        <p className="text-lg font-bold text-accent">{order.frete_pendente || order.acordo_pendente ? 'Valor conhecido até agora' : 'Total acordado'}: {money(order.total_parcial)}</p>
        {order.frete_pendente && <p className="text-warning">O frete ainda precisa ser combinado e aceito. Este valor não é o total final da compra.</p>}
        <p className="rounded-xl bg-info-soft p-3 text-sm text-info">Pagamento combinado fora do site. Confira o pagamento diretamente com a outra pessoa. O código e o botão de recebimento registram a entrega; não confirmam pagamento ou qualidade do produto.</p>
      </section>
      {order.entregas.map((item, index) => <DeliveryPanel key={`${item.grupo_id}-${item.versao}`} delivery={item} number={index + 1} role={order.papel} buyerId={order.comprador_id} disabled={busy || loading || stale} onAction={action} onStart={startChange} onFinish={finishChange} onUncertain={flagUncertain} onConfirmed={data => { setOrder(data); setNotice('Recebimento registrado com código do comprador.') }} />)}
      {!order.entregas.length && <p>Este pedido não possui etapas de entrega física. Para itens digitais ou pedidos antigos sem modalidade, combine os detalhes pelo chat.</p>}
      <section className="space-y-3 rounded-2xl border border-line bg-surface p-5" aria-label="Ajuda com o pedido">
        <h2 className="text-lg font-bold">Precisa de ajuda ou encontrou um problema?</h2>
        <p className="text-sm text-muted">Se não recebeu, não confirme o recebimento. Você pode relatar um problema mesmo depois de concluir a entrega. A administração analisará o relato; não há reembolso automático pelo site.</p>
        <ReportControl type="pedido" targetId={order.id_pedido} label="Relatar problema no pedido" />
        <Link className="inline-block text-sm text-accent underline" href="/politicas#trocas">Entenda pagamento, trocas e segurança →</Link>
      </section>
      {order.endereco_entrega && <details className="rounded-2xl border border-line bg-surface p-5"><summary className="font-bold">Ver endereço registrado para entrega</summary><div className="mt-3"><AddressDetails address={order.endereco_entrega} /></div></details>}
      <details className="rounded-2xl border border-line bg-surface p-5"><summary className="text-lg font-bold">Histórico do acordo</summary>
        {order.historico?.length ? <ol className="mt-4 space-y-3">{order.historico.map(item => <li key={item.id} className="border-b border-line pb-3 text-sm"><strong>{actionStatus[item.acao]}</strong> · {item.papel} · versão {item.versao} · {new Date(item.created_at).toLocaleString('pt-BR')}{item.dados.proposta && <p>Proposta: {item.dados.proposta.modalidade} · {money(item.dados.proposta.valor_frete)} · {item.dados.proposta.prazo}</p>}</li>)}</ol> : <p className="mt-3 text-sm text-muted">Nenhuma alteração registrada. O histórico mostra até as 100 alterações mais recentes.</p>}
      </details>
    </>}
  </div></div>
}