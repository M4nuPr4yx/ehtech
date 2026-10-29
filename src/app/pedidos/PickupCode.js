'use client'
import { useEffect, useRef, useState } from 'react'
import { accountRequest } from '../../lib/address-api'

export default function PickupCode({ delivery, role, disabled, onConfirmed }) {
  const [code, setCode] = useState(''), [generated, setGenerated] = useState(null), [received, setReceived] = useState(false)
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const pending = useRef(null)
  useEffect(() => () => pending.current?.abort(), [])
  const buyer = role === 'comprador'
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('')
    const controller = new AbortController(); pending.current = controller
    try {
      const result = await accountRequest(`/pedidos/${delivery.pedido_id}/entregas/${encodeURIComponent(delivery.grupo_id)}/${buyer ? 'codigo' : 'recebimento'}`, { method: 'POST', body: { versao: delivery.versao, ...(buyer ? {} : { codigo: code }) }, signal: controller.signal })
      if (!controller.signal.aborted) { if (buyer) setGenerated(result); else { setCode(''); onConfirmed(result) } }
    } catch (failure) { if (!controller.signal.aborted) setError(failure.message) }
    finally { if (!controller.signal.aborted) setBusy(false) }
  }
  return <form className="space-y-3 rounded-xl border border-line p-4" onSubmit={submit}>
    <h3 className="font-bold">{buyer ? 'Código para confirmar a retirada' : 'Confirmar retirada com código do comprador'}</h3>
    <p className="text-sm">{buyer ? 'Gere e informe o código ao vendedor somente depois de receber os produtos deste grupo. Não envie antes pelo chat.' : 'Entregue os produtos e peça o código ao comprador. Ele não é uma confirmação bancária nem uma aprovação da qualidade.'}</p>
    {buyer ? <><label className="flex items-start gap-3"><input type="checkbox" checked={received} disabled={disabled || busy} onChange={event => setReceived(event.target.checked)} /><span>Já recebi os produtos e quero gerar o código para o vendedor registrar o recebimento.</span></label>{generated && <div role="status" className="rounded-xl bg-info-soft p-4 text-info"><p className="text-3xl font-bold tracking-widest" aria-label={`Código de recebimento: ${generated.codigo}`}>{generated.codigo}</p><p>Válido até {new Date(generated.expira_em).toLocaleTimeString('pt-BR')}. Gerar outro invalida este. O código não fica salvo no navegador; se atualizar a página, gere um novo.</p></div>}</> : <label className="block">Código de seis dígitos<input className="mt-2 w-full rounded-xl border border-line bg-surface p-3 text-foreground" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="off" pattern="[0-9]{6}" minLength={6} maxLength={6} required disabled={disabled || busy} /></label>}
    {error && <p role="alert" className="text-danger">{error}</p>}
    <button className="rounded-xl border border-line px-4 py-3 font-bold disabled:opacity-50" disabled={disabled || busy || (buyer && !received)}>{busy ? 'Aguarde…' : buyer ? generated ? 'Gerar novo código' : 'Gerar código após receber' : 'Validar código e registrar recebimento'}</button>
    <p className="text-sm text-muted">O recebimento não confirma pagamento e não impede relatar um problema posteriormente.</p>
  </form>
}
