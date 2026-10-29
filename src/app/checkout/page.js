'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AddressBook, { AddressDetails } from '../complements/AddressBook';
import { accountRequest } from '../../lib/address-api';
import { freightLabel, deliverySelections } from '../../lib/shipping';

const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const primary = 'w-full rounded-xl bg-accent-fill px-5 py-3 font-bold text-accent-contrast transition hover:brightness-110 disabled:opacity-50 disabled:cursor-wait';

export default function Checkout() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [selection, setSelection] = useState({});
  const [payment, setPayment] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const [order, setOrder] = useState(null);
  const [retry, setRetry] = useState(0);
  const [checkoutStorageKey, setCheckoutStorageKey] = useState('');

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      setLoading(true); setError('');
      try {
        if (!localStorage.getItem('token')) {
          router.replace('/?login=1&next=%2Fcheckout'); return;
        }
        const user = await accountRequest('/perfil');
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        const items = cart.map(item => ({ produto_id: item.id_produto, quantidade: item.quantidade }));
        const cartKey = JSON.stringify(items);
        const storageKey = `ehtech-checkout-${user.id_usuario}`;
        if (active) setCheckoutStorageKey(storageKey);
        let saved;
        try { saved = JSON.parse(localStorage.getItem(storageKey) || 'null'); } catch { saved = null; }
        let data;
        if (saved?.cartKey === cartKey) {
          data = await accountRequest(`/checkout/${saved.id}`);
          if (data.pedido_id) {
            if (active) setOrder({ id_pedido: data.pedido_id, frete_pendente: data.frete_pendente });
            return;
          }
        } else {
          if (!items.length) throw new Error('Seu carrinho está vazio. Adicione produtos para continuar.');
          data = await accountRequest('/checkout', { method: 'POST', body: { itens: items } });
          localStorage.setItem(storageKey, JSON.stringify({ id: data.id, cartKey }));
        }
        if (active) { setSession(data); setSelection(deliverySelections(data.entrega || [], data.modalidades || [])); }
      } catch (failure) {
        if (active) setError(failure.message);
      } finally { if (active) setLoading(false); }
    };
    initialize();
    return () => { active = false; };
  }, [router, retry]);

  const confirmAddress = async address => {
    const data = await accountRequest(`/checkout/${session.id}/endereco`, { method: 'PUT', body: { endereco_id: address.id, versao: address.versao, confirmado: true } });
    setSession(data); setSelection(deliverySelections([], data.modalidades)); setPayment(false); setEditingAddress(false); setError('');
  };
  const chooseDelivery = async () => {
    setBusy(true); setError('');
    try {
      const data = await accountRequest(`/checkout/${session.id}/entrega`, { method: 'PUT', body: { modalidades: session.modalidades.map(group => ({ grupo_id: group.grupo_id, vendedor_id: group.vendedor_id, id: selection[group.grupo_id] })) } });
      setSession(data);
      const paymentState = await accountRequest(`/checkout/${session.id}/pagamento`, { method: 'POST', body: {} });
      setSession(paymentState); setPayment(true);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  const placeOrder = async () => {
    setBusy(true); setError('');
    try {
      const result = await accountRequest('/pedidos', { method: 'POST', body: { checkout_id: session.id } });
      localStorage.removeItem('cart');
      localStorage.setItem(checkoutStorageKey, JSON.stringify({ id: session.id, cartKey: '[]' }));
      setOrder(result); setPayment(false);
    } catch (failure) { setError(failure.message); setPayment(false); }
    finally { setBusy(false); }
  };
  const restart = async () => {
    setBusy(true);
    try {
      const user = await accountRequest('/perfil');
      localStorage.removeItem(`ehtech-checkout-${user.id_usuario}`);
      setSession(null); setPayment(false); setRetry(current => current + 1);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  const step = order ? 6 : payment ? 5 : session?.endereco_confirmado && !editingAddress ? 4 : 3;
  const hasOptions = session?.modalidades?.every(group => group.opcoes.length && selection[group.grupo_id]);
  const negotiatedOnly = session?.modalidades?.length > 0 && session.modalidades.every(group => group.opcoes.length === 1 && group.opcoes[0].tipo === 'a_combinar');

  return <div className="site-background min-h-screen px-4 py-12 text-foreground sm:px-6">
    <div className="mx-auto max-w-6xl">
      <Link href="/carrinho" className="text-sm font-bold text-accent hover:underline">← Voltar ao carrinho</Link>
      <h1 className="mt-4 text-3xl font-bold">Finalizar compra</h1>
      <ol aria-label="Etapas do checkout" className="my-6 grid grid-cols-3 gap-2 sm:grid-cols-6">{['Carrinho', 'Identificação', 'Endereço', 'Entrega', 'Pagamento', 'Confirmação'].map((label, index) => <li key={label} aria-current={step === index + 1 ? 'step' : undefined} className={`rounded-xl border p-3 text-xs ${step === index + 1 ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted'}`}><span className="mb-1 block font-bold">{index < 2 ? '✓' : index + 1}</span>{label}</li>)}</ol>
      {error && <div role="alert" className="mb-5 rounded-xl bg-danger-soft p-4 text-danger">{error}<div className="mt-2 flex flex-wrap gap-4"><button disabled={busy} onClick={() => setRetry(current => current + 1)} className="text-sm underline">Tentar novamente</button><button disabled={busy} onClick={restart} className="text-sm underline">Reiniciar checkout com o carrinho atual</button></div></div>}
      {loading ? <p role="status">Carregando checkout…</p> : order ? <section className="rounded-2xl border border-line bg-surface p-8"><h2 className="text-2xl font-bold text-success">Pedido #{order.id_pedido} registrado</h2><p className="my-3 text-muted">Pagamento não iniciado. Nenhuma cobrança foi realizada.</p>{order.frete_pendente && <p className="mb-4 rounded-xl bg-warning-soft p-4 text-warning">Entrega, prazo e frete ainda precisam ser combinados com o vendedor. O valor final e o atendimento não estão confirmados. Acompanhe e aceite uma proposta nos detalhes do pedido.</p>}<Link href={`/pedidos/${order.id_pedido}`} className="font-bold text-accent">Acompanhar pedido e registrar acordo →</Link></section> : session && <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6 rounded-2xl border border-line bg-surface p-5 sm:p-7">
          {session.exige_entrega && (!session.endereco_confirmado || editingAddress) ? <AddressBook checkout initialAddress={session.endereco} onConfirm={confirmAddress} /> : <>
            {session.exige_entrega ? <section><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold">⌖ Endereço confirmado para esta compra</h2><button disabled={busy} className="text-sm text-accent underline" onClick={() => { setEditingAddress(true); setPayment(false); }}>Editar ou escolher outro</button></div><AddressDetails address={session.endereco} /></section> : <p className="text-muted">Este carrinho contém apenas itens que dispensam entrega física.</p>}
            {!payment && <section className="space-y-4 border-t border-line pt-5"><h2 className="text-xl font-bold">▱ Modalidades de entrega</h2>
              <p className="text-sm text-muted">Para seguir com frete a combinar, clique em “Continuar com frete a combinar” e revise o pedido. Depois do registro, combine valor e prazo com o vendedor. Conversar pelo chat é opcional nesta etapa e não registra a compra. O frete não é grátis.</p>
              {session.modalidades.map(group => <fieldset key={group.grupo_id} className="space-y-2 rounded-xl border border-line p-4"><legend className="px-2 text-sm font-bold">Vendedor: {group.vendedor}</legend><p className="text-sm text-muted">Origem: {group.origem ? `${group.origem.cidade}/${group.origem.uf}` : 'Não cadastrada'} → Destino: {session.endereco.cidade}/{session.endereco.uf}</p><p className="text-xs text-muted">{group.produtos.map(item => item.nome).join(', ')}</p>{group.opcoes.length ? group.opcoes.map(option => <label key={option.id} className="flex cursor-pointer items-start gap-3 rounded-lg bg-surface-raised p-3"><input type="radio" name={`delivery-${group.grupo_id}`} value={option.id} checked={selection[group.grupo_id] === option.id} onChange={() => setSelection(current => ({ ...current, [group.grupo_id]: option.id }))} /><span className="text-sm"><strong>{option.nome} · {freightLabel(option)}</strong><span className="block text-muted">{option.prazo}</span><span className="block text-xs text-muted">{option.fonte}</span></span></label>) : <p role="alert" className="text-sm text-danger">{group.motivo || 'Não foi possível identificar uma modalidade. Peça ao vendedor para revisar a origem do anúncio.'}</p>}<Link href={`/mensagens?usuario=${group.vendedor_id}`} className="inline-block text-sm text-muted underline">Conversar antes de continuar (opcional) →</Link></fieldset>)}
              <button onClick={chooseDelivery} disabled={busy || !hasOptions} className={primary}>{busy ? 'Validando…' : negotiatedOnly ? 'Continuar com frete a combinar' : 'Continuar para revisão'}</button>
            </section>}
            {payment && <section className="space-y-4 border-t border-line pt-5"><h2 className="text-xl font-bold">Pagamento e revisão final</h2><p className="rounded-xl bg-info-soft p-4 text-sm text-info">Nenhuma cobrança online está habilitada. Seu pedido será registrado e o pagamento deverá ser combinado com os vendedores. O pedido não será marcado como pago.</p>{session.frete_pendente && <p className="rounded-xl bg-warning-soft p-4 text-sm text-warning">Você está registrando uma solicitação com entrega, prazo e frete a combinar. O subtotal não inclui o frete pendente; confirme a disponibilidade e o valor final pelo chat antes de pagar.</p>}<ul className="space-y-2 text-sm">{session.entrega.map(option => <li key={option.grupo_id}>{option.vendedor} ({option.origem?.cidade}/{option.origem?.uf}): {option.nome} · {freightLabel(option)} · {option.prazo}</li>)}</ul><button onClick={placeOrder} disabled={busy || !session.pronto} className={primary}>{busy ? 'Registrando…' : 'Confirmar e registrar pedido'}</button><button disabled={busy} onClick={() => setPayment(false)} className="text-sm text-accent underline">Revisar entrega</button></section>}
          </>}
        </div>
        <aside className="rounded-2xl border border-line bg-surface p-5 lg:sticky lg:top-24"><h2 className="text-lg font-bold">Resumo da compra</h2><ul className="my-4 space-y-3">{session.itens.map(item => <li key={item.produto_id} className="border-b border-line pb-3 text-sm"><p className="font-semibold">{item.nome}</p><p className="text-muted">{item.quantidade} × {money(item.preco)}</p><p className="text-xs text-muted">{item.vendedor}</p></li>)}</ul><dl className="space-y-3 text-sm"><div className="flex justify-between"><dt>Subtotal</dt><dd>{money(session.subtotal)}</dd></div><div className="flex justify-between gap-3"><dt>Entrega</dt><dd>{session.frete_pendente ? 'Frete a combinar' : session.frete === null ? 'A selecionar' : money(session.frete)}</dd></div>{session.frete_pendente && session.frete_conhecido > 0 && <div className="flex justify-between"><dt>Fretes já definidos</dt><dd>{money(session.frete_conhecido)}</dd></div>}<div className="flex justify-between border-t border-line pt-3 text-lg font-bold text-accent"><dt>{session.frete === null ? 'Subtotal atual' : 'Total'}</dt><dd>{money(session.total_parcial ?? session.total)}</dd></div></dl>{session.frete_pendente && <p className="mt-4 text-sm text-warning">Valor parcial. O frete pendente será combinado pelo chat; não é gratuito.</p>}<p className="mt-4 text-xs text-muted">Valores e disponibilidade são conferidos novamente no servidor antes de registrar o pedido.</p></aside>
      </div>}
    </div>
  </div>;
}
