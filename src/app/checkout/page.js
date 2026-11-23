'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AddressBook, { AddressDetails } from '../complements/AddressBook';
import { accountRequest } from '../../lib/address-api';
import { freightLabel, deliverySelections } from '../../lib/shipping';
import { uncertainOrderChange } from '../../lib/order-guidance.mjs';
import LoadingState from '../complements/LoadingState';

const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const primary = 'w-full rounded-xl bg-accent-fill px-5 py-3 font-bold text-accent-contrast transition hover:brightness-110 disabled:opacity-50 disabled:cursor-wait';

function OrderSummary({ session, className }) {
  const pickup = session.entrega.some(option => option.tipo === 'retirada');
  return <aside className={`rounded-2xl border border-line bg-surface p-5 ${className}`}>
    <h2 className="text-lg font-bold">Resumo do pedido</h2>
    <ul className="my-4 space-y-3">{session.itens.map(item => (
      <li key={item.produto_id} className="border-b border-line pb-3 text-sm">
        <p className="font-semibold">{item.nome}</p>
        <p className="text-muted">{item.quantidade} × {money(item.preco)}</p>
        <p className="text-muted">{item.vendedor}</p>
      </li>
    ))}</ul>
    <dl className="space-y-3 text-sm">
      <div className="flex justify-between gap-3"><dt>Subtotal dos produtos</dt><dd>{money(session.subtotal)}</dd></div>
      {session.exige_entrega && <div className="flex justify-between gap-3"><dt>Frete</dt><dd>{pickup ? 'Sem frete na retirada' : session.frete_pendente ? 'A combinar' : session.frete === null ? 'A selecionar' : money(session.frete)}</dd></div>}
      {session.frete_pendente && session.frete_conhecido > 0 && <div className="flex justify-between gap-3"><dt>Fretes calculados</dt><dd>{money(session.frete_conhecido)}</dd></div>}
      <div className="flex justify-between gap-3 border-t border-line pt-3 text-lg font-bold text-accent">
        <dt>{session.frete === null ? 'Valor parcial' : session.exige_entrega && !pickup ? 'Total estimado' : 'Total dos produtos'}</dt>
        <dd>{money(session.total_parcial ?? session.total)}</dd>
      </div>
    </dl>
  </aside>;
}

export default function Checkout() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [selection, setSelection] = useState({});
  const [review, setReview] = useState(false);
  const [receiving, setReceiving] = useState(null);
  const [editingAddress, setEditingAddress] = useState(false);
  const [order, setOrder] = useState(null);
  const [retry, setRetry] = useState(0);
  const [checkoutStorageKey, setCheckoutStorageKey] = useState('');
  const [notice, setNotice] = useState('');
  const submitting = useRef(false);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      setLoading(true); setError(''); setNotice('');
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
        if (saved?.cartKey === cartKey && typeof saved.id === 'string' && /^[a-f0-9-]{36}$/.test(saved.id)) {
          try { data = await accountRequest(`/checkout/${encodeURIComponent(saved.id)}`); }
          catch (failure) {
            if (![404, 409].includes(failure.status) || !items.length) throw failure;
            if (active) setNotice('Retomamos seu carrinho em uma nova sessão. Escolha como receber e revise os valores novamente.');
          }
          if (data?.pedido_id) {
            if (active) setOrder({ ...data, id_pedido: data.pedido_id });
            return;
          }
        }
        if (!data) {
          if (!items.length) throw new Error('Seu carrinho está vazio. Adicione produtos para continuar.');
          data = await accountRequest('/checkout', { method: 'POST', body: { itens: items } });
          try { localStorage.setItem(storageKey, JSON.stringify({ id: data.id, cartKey })); }
          catch { if (active) setNotice('O navegador não conseguiu guardar seu progresso. Continue nesta página; seus pedidos registrados ficam em Pedidos e vendas.'); }
        }
        if (active) {
          setSession(data);
          setSelection(deliverySelections(data.entrega || [], data.modalidades || []));
          setReview(data.pronto);
          setReceiving(null);
          setEditingAddress(false);
        }
      } catch (failure) {
        if (active) setError(failure.message);
      } finally { if (active) setLoading(false); }
    };
    initialize();
    return () => { active = false; };
  }, [router, retry]);

  const confirmAddress = async address => {
    if (submitting.current) throw new Error('Aguarde a operação atual terminar.');
    submitting.current = true; setBusy(true);
    try {
      const data = await accountRequest(`/checkout/${session.id}/endereco`, { method: 'PUT', body: { endereco_id: address.id, versao: address.versao, confirmado: true } });
      setSession(data); setSelection(deliverySelections([], data.modalidades)); setReview(false); setEditingAddress(false); setError('');
    } finally { submitting.current = false; setBusy(false); }
  };
  const saveDelivery = async (modalidades) => {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true); setError('');
    try {
      const data = await accountRequest(`/checkout/${session.id}/entrega`, { method: 'PUT', body: { modalidades } });
      setSession(data); setReview(data.pronto); setReceiving(null); setEditingAddress(false);
    } catch (failure) { setError(failure.message); }
    finally { submitting.current = false; setBusy(false); }
  };
  const chooseDelivery = () => saveDelivery(session.modalidades.map(group => ({ grupo_id: group.grupo_id, vendedor_id: group.vendedor_id, id: selection[group.grupo_id] })));
  const requestPickup = () => saveDelivery(session.modalidades_retirada.map(group => ({ grupo_id: group.grupo_id, vendedor_id: group.vendedor_id, id: group.opcoes[0].id })));
  const showRegistered = (result, recovered = false) => {
    setOrder(result); setReview(false);
    if (recovered) setNotice('Seu pedido já estava registrado. Recuperamos a confirmação, sem criar outro pedido.');
    try {
      localStorage.removeItem('cart');
      localStorage.setItem(checkoutStorageKey, JSON.stringify({ id: session.id, cartKey: '[]' }));
    } catch { setNotice('Seu pedido foi registrado. O navegador não conseguiu atualizar o carrinho; confira os itens antes de uma nova compra.'); }
  };
  const placeOrder = async () => {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true); setError('');
    try {
      const result = await accountRequest('/pedidos', { method: 'POST', body: { checkout_id: session.id } });
      showRegistered(result);
    } catch (failure) {
      setReview(false);
      if (uncertainOrderChange(failure)) {
        try {
          const saved = await accountRequest(`/checkout/${session.id}`);
          if (saved.pedido_id) {
            showRegistered({ ...saved, id_pedido: saved.pedido_id }, true);
            return;
          }
        } catch { /* A leitura não confirmou o resultado; nunca repetir a escrita automaticamente. */ }
        setError('Não conseguimos confirmar o registro. Use Tentar novamente ou confira Meus pedidos antes de fazer outra compra. Seu carrinho foi preservado.');
      } else setError(failure.message);
    }
    finally { submitting.current = false; setBusy(false); }
  };
  const restart = async () => {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    try {
      const user = await accountRequest('/perfil');
      localStorage.removeItem(`ehtech-checkout-${user.id_usuario}`);
      setSession(null); setReview(false); setRetry(current => current + 1);
    } catch (failure) { setError(failure.message); }
    finally { submitting.current = false; setBusy(false); }
  };
  const pickup = session?.entrega.some(option => option.tipo === 'retirada');
  const shipping = receiving === 'entrega' || (receiving === null && session?.endereco_confirmado && !pickup);
  const canRequestPickup = session?.modalidades_retirada?.length > 0;
  const steps = !session?.exige_entrega ? ['Revisão'] : shipping ? ['Recebimento', 'Endereço', 'Entrega', 'Revisão'] : ['Recebimento', 'Revisão'];
  const currentStep = review ? 'Revisão' : !shipping ? 'Recebimento' : session?.endereco_confirmado && !editingAddress ? 'Entrega' : 'Endereço';
  const cancelled = order?.status === 'cancelado';
  const registeredPickup = order?.retirada_solicitada || order?.entrega?.some(option => option.tipo === 'retirada');
  const hasOptions = session?.modalidades?.length > 0 && session.modalidades.every(group => group.opcoes.length && selection[group.grupo_id]);
  const negotiatedOnly = session?.modalidades?.length > 0 && session.modalidades.every(group => group.opcoes.length === 1 && group.opcoes[0].tipo === 'a_combinar');

  return <div className="site-background min-h-screen px-4 py-12 text-foreground sm:px-6">
    <div className="mx-auto max-w-6xl">
      <Link href="/carrinho" className="text-sm font-bold text-accent hover:underline">← Voltar ao carrinho</Link>
      <h1 className="mt-4 text-3xl font-bold">{cancelled ? 'Pedido cancelado' : order ? 'Pedido registrado' : 'Preparar pedido'}</h1>
      {!order && <p className="mt-2 text-muted">O pagamento é combinado com o vendedor fora da EHtech.</p>}
      {notice && <p role="status" className="mt-4 rounded-xl bg-info-soft p-4 text-sm text-info">{notice}</p>}
      {!order && session && steps.length > 1 && <ol aria-label="Etapas do pedido" className="my-6 flex flex-wrap gap-2">
        {steps.map((label, index) => <li key={label} aria-current={currentStep === label ? 'step' : undefined} className={`rounded-xl border p-3 text-sm ${currentStep === label ? 'border-accent bg-accent-soft font-bold text-accent' : 'border-line text-muted'}`}>{index + 1}. {label}</li>)}
      </ol>}
      {error && <div role="alert" className="my-5 rounded-xl bg-danger-soft p-4 text-danger">{error}<div className="mt-2 flex flex-wrap gap-4"><button disabled={busy} onClick={() => setRetry(current => current + 1)} className="text-sm underline">Tentar novamente</button><button disabled={busy} onClick={restart} className="text-sm underline">Reiniciar com o carrinho atual</button><Link href="/pedidos" className="text-sm underline">Conferir meus pedidos</Link></div></div>}
      {loading ? <LoadingState label="Carregando seu pedido…" /> : order ? (
        <section className="mt-6 space-y-4 rounded-2xl border border-line bg-surface p-5 sm:p-8">
          <h2 className={`text-2xl font-bold ${cancelled ? 'text-foreground' : 'text-success'}`}>Pedido #{order.id_pedido} {cancelled ? 'cancelado' : 'registrado'}</h2>
          {cancelled ? <p className="text-muted">Você pode consultar os detalhes no histórico de pedidos.</p> : <>
            <p className="text-muted">Os vendedores foram avisados. O pagamento é combinado fora da EHtech.</p>
            <p className="rounded-xl bg-info-soft p-4 text-info">{registeredPickup
              ? 'Abra o pedido para combinar o local e o prazo da retirada pelo chat. A retirada depende da proposta do vendedor e do seu aceite.'
              : order.frete_pendente
                ? 'Abra o pedido para conversar com o vendedor sobre entrega ou retirada. Confira frete e prazo quando a proposta chegar e aceite se estiver de acordo.'
                : 'Abra o pedido para ver os próximos passos e conversar com o vendedor.'}</p>
          </>}
          <Link href={`/pedidos/${order.id_pedido}`} className="inline-flex rounded-xl bg-accent-fill px-5 py-3 font-bold text-accent-contrast">Abrir pedido</Link>
        </section>
      ) : session && <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6 rounded-2xl border border-line bg-surface p-5 sm:p-7">
          {session.exige_entrega && !review && !shipping ? <section className="space-y-4">
            <h2 className="text-xl font-bold">Como você quer receber?</h2>
            <p className="text-muted">Escolha uma opção para os produtos físicos deste pedido. Cada vendedor envia uma proposta para você conferir.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" disabled={busy} onClick={() => setReceiving('entrega')} className="rounded-xl border border-line bg-surface px-4 py-3 text-left font-bold disabled:opacity-50">Receber por entrega<span className="mt-1 block text-sm font-normal text-muted">Informe o endereço para ver as opções.</span></button>
              {canRequestPickup && <button type="button" disabled={busy} onClick={requestPickup} className="rounded-xl border border-line bg-surface px-4 py-3 text-left font-bold disabled:opacity-50">{busy ? 'Validando…' : 'Solicitar retirada'}<span className="mt-1 block text-sm font-normal text-muted">Combine o local com o vendedor. Seu endereço é dispensado.</span></button>}
            </div>
          </section> : session.exige_entrega && !review && (!session.endereco_confirmado || editingAddress) ? <>
            <button type="button" disabled={busy} onClick={() => { setReceiving('escolher'); setEditingAddress(false); }} className="text-sm text-accent underline">Escolher outra forma de receber</button>
            <AddressBook checkout initialAddress={session.endereco} onConfirm={confirmAddress} />
          </> : <>
            {session.exige_entrega && shipping && session.endereco_confirmado && <details open={!review}>
              <summary className="cursor-pointer text-lg font-bold">Endereço confirmado para o pedido</summary>
              <div className="mt-3 space-y-3">
                <AddressDetails address={session.endereco} />
                <p className="text-sm text-muted">O vendedor recebe esse endereço depois que você aceita uma proposta de entrega.</p>
                <button disabled={busy} className="text-sm text-accent underline" onClick={() => { setReceiving('entrega'); setEditingAddress(true); setReview(false); }}>Editar ou escolher outro</button>
              </div>
            </details>}
            {!review && session.exige_entrega && <section className="space-y-4 border-t border-line pt-5"><h2 className="text-xl font-bold">Opções de entrega</h2>
              <p className="text-sm text-muted">{negotiatedOnly
                ? 'Depois de registrar o pedido, combine entrega ou retirada com o vendedor. O frete poderá ser cobrado e o valor será informado na proposta.'
                : 'Escolha uma opção para cada grupo de produtos. Confira as condições finais na proposta que o vendedor enviar após o registro.'}</p>
              {session.modalidades.map(group => <fieldset key={group.grupo_id} className="space-y-2 rounded-xl border border-line p-4">
                <legend className="px-2 text-sm font-bold">{group.vendedor}</legend>
                <p className="text-sm">{group.produtos.map(item => item.nome).join(', ')}</p>
                {group.origem && <p className="text-sm text-muted">Origem do envio em {group.origem.cidade}/{group.origem.uf}</p>}
                {group.opcoes.length ? group.opcoes.map(option => (
                  <label key={option.id} className="flex cursor-pointer items-start gap-3 rounded-lg bg-surface-raised p-3">
                    <input type="radio" name={`delivery-${group.grupo_id}`} value={option.id} checked={selection[group.grupo_id] === option.id} onChange={() => setSelection(current => ({ ...current, [group.grupo_id]: option.id }))} />
                    <span className="text-sm"><strong>{option.nome}{option.tipo !== 'a_combinar' && ` · ${freightLabel(option)}`}</strong>{option.tipo !== 'a_combinar' && <><span className="block text-muted">{option.prazo}</span><span className="block text-muted">{option.fonte}</span></>}</span>
                  </label>
                )) : <p role="alert" className="text-sm text-danger">{group.motivo || 'Peça ao vendedor para revisar a origem do anúncio antes de continuar.'}</p>}
                <Link href={`/mensagens?usuario=${group.vendedor_id}&checkout=1`} className="inline-block text-sm text-accent underline">Tirar dúvidas com o vendedor (opcional)</Link>
              </fieldset>)}
              <button onClick={chooseDelivery} disabled={busy || !hasOptions} className={primary}>{busy ? 'Validando…' : negotiatedOnly ? 'Continuar com frete a combinar' : 'Continuar para revisão'}</button>
              <button type="button" disabled={busy} onClick={() => setReceiving('escolher')} className="text-sm text-accent underline">Escolher outra forma de receber</button>
            </section>}
            {review && <section className="space-y-4 border-t border-line pt-5">
              <h2 className="text-xl font-bold">Revise seu pedido</h2>
              <OrderSummary session={session} className="lg:hidden" />
              {session.frete_pendente && <p className="rounded-xl bg-warning-soft p-4 text-sm text-warning">O frete pendente está fora do valor mostrado. Confirme a disponibilidade e o valor final com o vendedor antes de pagar.</p>}
              {pickup && <p className="rounded-xl bg-info-soft p-4 text-sm text-info">O vendedor precisa confirmar que oferece retirada. Combine local e prazo pelo chat depois de registrar o pedido.</p>}
              {session.exige_entrega ? <ul className="space-y-2 text-sm">{session.entrega.map(option => <li key={option.grupo_id}>{option.vendedor} · {option.nome}{option.tipo !== 'a_combinar' && ` · ${freightLabel(option)} · ${option.prazo}`}</li>)}</ul> : <p className="text-muted">Os itens são digitais. Combine o recebimento com o vendedor pelo chat do pedido.</p>}
              <p className="text-sm text-muted">Ao registrar, você avisa os vendedores de que tem interesse nos itens. O pagamento será combinado separadamente.</p>
              <button onClick={placeOrder} disabled={busy || !session.pronto} className={primary}>{busy ? 'Registrando…' : 'Registrar pedido'}</button>
              {session.exige_entrega && <button disabled={busy} onClick={() => { setReview(false); setReceiving('escolher'); }} className="text-sm text-accent underline">Alterar forma de receber</button>}
            </section>}
          </>}
        </div>
        <OrderSummary session={session} className={`${review ? 'hidden lg:block' : ''} lg:sticky lg:top-24`} />
      </div>}
    </div>
  </div>;
}
