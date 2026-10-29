'use client'

import { useState } from 'react'
import Link from 'next/link'
import { deliveryStatus } from '../../lib/order-status'
import PickupCode from './PickupCode'

const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
const button = 'rounded-xl bg-accent-fill px-4 py-3 font-bold text-accent-contrast disabled:opacity-50'
const input = 'w-full rounded-xl border border-line bg-surface p-3 text-base text-foreground'

export default function DeliveryPanel({ delivery, role, buyerId, disabled, onAction, onConfirmed }) {
  const initial = delivery.proposta || delivery.acordo
  const [modality, setModality] = useState(initial?.modalidade || 'entrega')
  const [value, setValue] = useState(initial?.valor_frete ?? '')
  const [deadline, setDeadline] = useState(initial?.prazo || '')
  const [notes, setNotes] = useState(delivery.acordo ? '' : initial?.observacoes || '')
  const [carrier, setCarrier] = useState('')
  const [tracking, setTracking] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const seller = role === 'vendedor'
  const propose = seller && ['aguardando_proposta', 'proposta_enviada'].includes(delivery.estado)
  function act(acao, fields = {}) { return onAction(delivery.grupo_id, { acao, versao: delivery.versao, ...fields }) }
  function submitProposal(event) { event.preventDefault(); act('propor', { modalidade: modality, valor_frete: modality === 'retirada' ? 0 : value, prazo: deadline, observacoes: notes }) }
  const offer = delivery.acordo || delivery.proposta
  return <section className="min-w-0 space-y-4 rounded-2xl border border-line bg-surface p-5" aria-label={`Entrega de ${delivery.vendedor}`}>
    <div className="flex flex-wrap justify-between gap-3"><h2 className="text-lg font-bold">{delivery.vendedor} · grupo {delivery.grupo_id}</h2><span className="text-accent">{deliveryStatus[delivery.estado]}</span></div>
    {delivery.origem && <p className="text-sm text-muted">Origem: {delivery.origem.cidade}/{delivery.origem.uf}</p>}
    <Link href={`/mensagens?usuario=${seller ? buyerId : delivery.vendedor_id}`} className="inline-block font-bold text-accent underline">Conversar com {seller ? 'o comprador' : 'o vendedor'} →</Link>
    {offer && <div className="space-y-2 rounded-xl bg-surface-raised p-4"><h3 className="font-bold">{delivery.acordo ? 'Condições aceitas' : delivery.estado === 'proposta_enviada' ? 'Proposta enviada (ainda não aceita)' : 'Última proposta (não aceita)'}</h3><p>{offer.modalidade === 'retirada' ? 'Retirada' : 'Entrega'} · Frete: {money(offer.valor_frete)}</p><p className="break-words">Prazo: {offer.prazo}</p>{offer.observacoes && <p className="break-words">{offer.observacoes}</p>}{offer.modalidade === 'retirada' && <p className="text-sm text-muted">Combine o local da retirada pelo chat. O site não publica automaticamente o endereço do vendedor.</p>}</div>}
    {propose && <form onSubmit={submitProposal} className="grid gap-4"><h3 className="font-bold">{delivery.estado === 'proposta_enviada' ? 'Revisar proposta' : 'Enviar proposta ao comprador'}</h3><label className="grid gap-2">Modalidade<select className={input} disabled={disabled} value={modality} onChange={event => { setModality(event.target.value); setConfirmed(false) }}><option value="entrega">Entrega</option><option value="retirada">Retirada</option></select></label><label className="grid gap-2">Frete (R$)<input className={input} type="number" min="0" max="100000" step="0.01" required disabled={disabled || modality === 'retirada'} value={modality === 'retirada' ? 0 : value} onChange={event => setValue(event.target.value)} /></label><label className="grid gap-2">Prazo combinado<input className={input} required minLength={5} maxLength={300} disabled={disabled} value={deadline} placeholder="Ex.: até 3 dias úteis após combinar o pagamento" onChange={event => setDeadline(event.target.value)} /></label><label className="grid gap-2">Observações para o comprador<textarea className={input} maxLength={500} disabled={disabled} value={notes} onChange={event => setNotes(event.target.value)} /></label><p className="text-sm text-muted">O comprador verá estes dados e deverá aceitar esta versão. Não há cobrança nem confirmação automática de pagamento.</p><button className={button} disabled={disabled}>Enviar proposta</button></form>}
    {!seller && delivery.estado === 'proposta_enviada' && <div className="space-y-4"><label className="flex items-start gap-3"><input type="checkbox" checked={confirmed} disabled={disabled} onChange={event => setConfirmed(event.target.checked)} /><span>Revisei e aceito a modalidade, o valor do frete e o prazo desta versão. O pagamento será combinado fora do site.</span></label><div className="flex flex-wrap gap-3"><button className={button} disabled={disabled || !confirmed} onClick={() => act('aceitar')}>Aceitar proposta</button><button className="rounded-xl border border-line px-4 py-3" disabled={disabled} onClick={() => act('recusar')}>Recusar e pedir nova proposta</button></div></div>}
    {seller && delivery.estado === 'acordo_confirmado' && <form className="grid gap-4" onSubmit={event => { event.preventDefault(); act('despachar', { observacoes: notes, ...(delivery.acordo.modalidade === 'entrega' ? { transportadora: carrier, codigo_rastreio: tracking } : {}) }) }}><h3 className="font-bold">{delivery.acordo.modalidade === 'retirada' ? 'Preparar retirada' : 'Informar envio'}</h3>{delivery.acordo.modalidade === 'entrega' && <><label className="grid gap-2">Transportadora (opcional)<input className={input} maxLength={80} disabled={disabled} value={carrier} onChange={event => setCarrier(event.target.value)} /></label><label className="grid gap-2">Código de rastreio (opcional)<input className={input} maxLength={80} disabled={disabled} value={tracking} onChange={event => setTracking(event.target.value)} /></label></>}<label className="grid gap-2">Observações de envio / retirada<textarea className={input} maxLength={500} disabled={disabled} value={notes} onChange={event => setNotes(event.target.value)} /></label><p className="text-sm text-muted">Este registro é uma declaração do vendedor, sem consulta automática a transportadora ou confirmação de pagamento.</p><button className={button} disabled={disabled}>{delivery.acordo.modalidade === 'retirada' ? 'Marcar pronto para retirada' : 'Informar produto enviado'}</button></form>}
    {delivery.despacho && <div className="break-words rounded-xl bg-info-soft p-4 text-info"><p>{delivery.acordo?.modalidade === 'retirada' ? 'Retirada disponibilizada pelo vendedor.' : 'Envio informado pelo vendedor.'}</p>{delivery.despacho.transportadora && <p>Transportadora: {delivery.despacho.transportadora}</p>}{delivery.despacho.codigo_rastreio && <p>Rastreio informado: {delivery.despacho.codigo_rastreio}</p>}{delivery.despacho.observacoes && <p>{delivery.despacho.observacoes}</p>}</div>}
    {!seller && ['enviado', 'pronto_retirada'].includes(delivery.estado) && <div className="space-y-4"><label className="flex items-start gap-3"><input type="checkbox" checked={confirmed} disabled={disabled} onChange={event => setConfirmed(event.target.checked)} /><span>Confirmo que recebi os produtos deste grupo. Não confirme antes de receber.</span></label><button className={button} disabled={disabled || !confirmed} onClick={() => act('receber')}>Confirmar recebimento</button></div>}
    {delivery.estado === 'pronto_retirada' && <PickupCode delivery={delivery} role={role} disabled={disabled} onConfirmed={onConfirmed} />}
    {delivery.estado === 'recebido' && <p role="status" className="rounded-xl bg-success-soft p-4 text-success">Recebimento confirmado em {new Date(delivery.recebido_em).toLocaleString('pt-BR')}. Esta entrega está concluída.</p>}
  </section>
}
