'use client';

import { useState, useEffect, useCallback } from 'react';
import { accountRequest, formatCep, formatPhone } from '../../lib/address-api';

const STATES = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');
const EMPTY = { destinatario: '', telefone: '', identificacao: 'Casa', cep: '', uf: '', cidade: '', bairro: '', logradouro: '', numero: '', sem_numero: false, complemento: '', referencia: '', instrucoes: '', principal: false, salvar: true };
const button = 'rounded-xl bg-accent-fill px-5 py-3 font-bold text-accent-contrast transition hover:brightness-110 disabled:cursor-wait disabled:opacity-50';
const secondary = 'rounded-xl border border-line px-4 py-2 text-sm font-semibold text-foreground hover:border-accent';

export function AddressDetails({ address }) {
  if (!address) return null;
  return <div className="space-y-1 break-words text-sm text-foreground">
    <p className="font-bold">{address.destinatario} · {address.identificacao}</p>
    <p>{address.logradouro}, {address.sem_numero ? 'sem número' : address.numero}{address.complemento ? ` · ${address.complemento}` : ''}</p>
    <p>{address.bairro} · {address.cidade}/{address.uf} · CEP {formatCep(address.cep)}</p>
    <p>Contato: {formatPhone(address.telefone)}</p>
    {address.referencia && <p>Referência: {address.referencia}</p>}
    {address.instrucoes && <p>Instruções: {address.instrucoes}</p>}
  </div>;
}

export default function AddressBook({ onConfirm, initialAddress, checkout = false }) {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [draft, setDraft] = useState(null);
  const [review, setReview] = useState(null);
  const [cepStatus, setCepStatus] = useState('');
  const [lookupEnabled, setLookupEnabled] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepRetry, setCepRetry] = useState(0);

  const reload = useCallback(async () => {
    try {
      setAddresses(await accountRequest('/enderecos'));
      setError('');
    } catch (failure) { setError(failure.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const cep = draft?.cep?.replace(/\D/g, '') || '';
  useEffect(() => {
    if (cep.length !== 8 || !lookupEnabled) { setCepLoading(false); return undefined; }
    let active = true;
    setCepLoading(true);
    setCepStatus('Consultando CEP…');
    accountRequest(`/enderecos/cep/${cep}`).then(data => {
      if (!active) return;
      setDraft(current => current ? { ...current, uf: data.uf, cidade: data.cidade, bairro: data.bairro, logradouro: data.logradouro } : current);
      setCepStatus('Dados preenchidos. Confira e complete o número e os campos que faltarem.');
    }).catch(failure => {
      if (active) setCepStatus(failure.message + ' Você pode preencher os campos manualmente.');
    }).finally(() => { if (active) setCepLoading(false); });
    return () => { active = false; };
  }, [cep, cepRetry, lookupEnabled]);

  const change = (field, value) => {
    setDraft(current => ({ ...current, [field]: value, ...(field === 'cep' ? { uf: '', cidade: '', bairro: '', logradouro: '', numero: '', complemento: '', referencia: '', instrucoes: '', sem_numero: false } : {}), ...(field === 'sem_numero' && value ? { numero: '' } : {}) }));
    setErrors(current => ({ ...current, [field]: '' }));
    if (field === 'cep') { setCepStatus(''); setLookupEnabled(true); }
  };
  const edit = address => { setDraft({ ...address, cep: formatCep(address.cep), telefone: formatPhone(address.telefone) }); setLookupEnabled(false); setCepStatus(''); setReview(null); setError(''); setErrors({}); };
  const save = async event => {
    event.preventDefault(); setBusy(true); setError(''); setErrors({});
    try {
      const saved = await accountRequest(draft.id ? `/enderecos/${draft.id}` : '/enderecos', { method: draft.id ? 'PUT' : 'POST', body: draft });
      setDraft(null); setReview(saved); setMessage('Endereço salvo. Revise os dados e confirme.'); await reload();
    } catch (failure) { setError(failure.message); setErrors(failure.errors || {}); }
    finally { setBusy(false); }
  };
  const confirm = async () => {
    setBusy(true); setError('');
    try {
      if (onConfirm) await onConfirm(review);
      else await accountRequest(`/enderecos/${review.id}/confirmar`, { method: 'POST', body: { versao: review.versao } });
      setReview(null); setMessage('Endereço confirmado com sucesso.'); await reload();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  const action = async (path, method = 'POST') => {
    setBusy(true); setError('');
    try { const result = await accountRequest(path, { method }); setMessage(result.mensagem); await reload(); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  const field = (name, label, required = false, extra = {}) => <div key={name} className={name === 'logradouro' || name === 'instrucoes' ? 'sm:col-span-2' : ''}>
    <label htmlFor={`address-${name}`} className="mb-1 block text-sm font-medium text-foreground">{label}{required ? ' *' : ''}</label>
    <input id={`address-${name}`} name={name} value={draft[name]} required={required} onChange={event => change(name, name === 'cep' ? formatCep(event.target.value) : name === 'telefone' ? formatPhone(event.target.value) : event.target.value)}
      className="w-full rounded-xl border border-line bg-surface-raised p-3 text-foreground focus:border-accent focus:outline-none disabled:opacity-50"
      aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `error-${name}` : undefined} {...extra} />
    {errors[name] && <p id={`error-${name}`} className="mt-1 text-xs text-danger">{errors[name]}</p>}
  </div>;

  return <section className="space-y-5" aria-label="Meus Endereços">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold text-foreground">⌖ {checkout ? 'Endereço de entrega' : 'Meus Endereços'}</h2><button className={secondary} disabled={busy} onClick={() => edit(EMPTY)}>+ Novo endereço</button></div>
    {message && <p role="status" className="rounded-xl bg-success-soft p-3 text-sm text-success">{message}</p>}
    {error && <div role="alert" className="rounded-xl bg-danger-soft p-3 text-sm text-danger">{error} {!draft && !review && <button className="ml-2 underline" onClick={reload}>Tentar novamente</button>}</div>}
    {loading ? <p role="status" className="text-muted">Carregando endereços…</p> : !draft && !review && <>
      {addresses.length === 0 && <p className="text-sm text-muted">Para continuar sua compra, é necessário cadastrar e confirmar seu endereço de entrega.</p>}
      {(initialAddress && !addresses.some(address => address.id === initialAddress.id) ? [initialAddress, ...addresses] : addresses).map(address => <article key={address.id} className="rounded-xl border border-line bg-surface-raised p-4">
        <div className="mb-2 flex flex-wrap gap-2 text-xs text-muted">{Boolean(address.principal) && <span className="font-bold text-accent">Principal</span>}<span>{address.confirmado_em ? 'Dados revisados' : 'Revisão necessária'}</span></div>
        <AddressDetails address={address} />
        <div className="mt-4 flex flex-wrap gap-2">
          <button className={secondary} disabled={busy} onClick={() => { setReview(address); setMessage(''); }}>{checkout ? 'Selecionar e revisar' : 'Revisar endereço'}</button>
          <button className={secondary} disabled={busy} onClick={() => edit(address)}>Editar</button>
          {!address.principal && <button className={secondary} disabled={busy} onClick={() => action(`/enderecos/${address.id}/principal`)}>Definir principal</button>}
          <button className="px-2 text-sm text-danger" disabled={busy} onClick={() => { if (window.confirm('Excluir este endereço? Pedidos anteriores serão preservados.')) action(`/enderecos/${address.id}`, 'DELETE'); }}>Excluir</button>
        </div>
      </article>)}
    </>}
    {draft && <form onSubmit={save} className="space-y-4 rounded-2xl border border-line bg-surface p-4 sm:p-6">
      <h3 className="font-bold text-foreground">{draft.id ? 'Editar endereço' : 'Cadastrar endereço'}</h3>
      <p className="text-xs text-muted">* Campos obrigatórios. Editar exige uma nova confirmação.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {field('destinatario', 'Nome completo do destinatário', true, { autoComplete: 'shipping name', maxLength: 150 })}
        {field('telefone', 'Telefone com DDD', true, { autoComplete: 'shipping tel', type: 'tel', inputMode: 'tel', maxLength: 16 })}
        {field('identificacao', 'Identificação (Casa, Trabalho ou Outro)', true, { maxLength: 60, list: 'address-labels' })}
        <datalist id="address-labels"><option>Casa</option><option>Trabalho</option><option>Outro</option></datalist>
        {field('cep', 'CEP', true, { autoComplete: 'shipping postal-code', inputMode: 'numeric', maxLength: 9, pattern: '[0-9]{5}-[0-9]{3}' })}
        <div className="sm:col-span-2 text-xs text-muted" aria-live="polite">{cepStatus}{cep.length === 8 && !cepLoading && <button type="button" onClick={() => { setLookupEnabled(true); setCepRetry(current => current + 1); }} className="ml-2 text-accent underline">Consultar novamente</button>}</div>
        <div><label htmlFor="address-uf" className="mb-1 block text-sm text-foreground">Estado (UF) *</label><select id="address-uf" required value={draft.uf} onChange={event => change('uf', event.target.value)} className="w-full rounded-xl border border-line bg-surface-raised p-3 text-foreground" aria-invalid={Boolean(errors.uf)}><option value="">Selecione</option>{STATES.map(state => <option key={state}>{state}</option>)}</select>{errors.uf && <p className="text-xs text-danger">{errors.uf}</p>}</div>
        {field('cidade', 'Cidade', true, { autoComplete: 'shipping address-level2', maxLength: 100 })}
        {field('bairro', 'Bairro', true, { autoComplete: 'shipping address-level3', maxLength: 100 })}
        {field('logradouro', 'Logradouro', true, { autoComplete: 'shipping address-line1', maxLength: 180 })}
        {field('numero', 'Número', !draft.sem_numero, { disabled: draft.sem_numero, maxLength: 20 })}
        <label className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={draft.sem_numero} onChange={event => change('sem_numero', event.target.checked)} />Sem número</label>
        {field('complemento', 'Complemento', false, { autoComplete: 'shipping address-line2', maxLength: 150 })}
        {field('referencia', 'Ponto de referência', false, { maxLength: 200 })}
        {field('instrucoes', 'Instruções para entrega', false, { maxLength: 500 })}
      </div>
      {checkout && <label className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={Boolean(draft.salvar)} onChange={event => change('salvar', event.target.checked)} />Salvar para futuras compras</label>}
      <label className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={Boolean(draft.principal)} disabled={!draft.salvar} onChange={event => change('principal', event.target.checked)} />Marcar como principal</label>
      <div className="flex flex-wrap gap-3"><button className={button} disabled={busy || cepLoading}>{busy ? 'Salvando…' : 'Salvar e revisar'}</button><button type="button" className={secondary} disabled={busy} onClick={() => setDraft(null)}>Cancelar</button></div>
    </form>}
    {review && <div className="space-y-4 rounded-2xl border border-accent bg-surface p-5"><h3 className="text-lg font-bold text-foreground">Confirme seu endereço de entrega</h3><AddressDetails address={review} /><p className="text-xs text-muted">Ao confirmar, você declara que revisou os dados. Isso não comprova residência ou localização.</p><div className="flex flex-wrap gap-3"><button className={button} disabled={busy} onClick={confirm}>{busy ? 'Confirmando…' : 'Confirmar endereço'}</button><button className={secondary} disabled={busy} onClick={() => edit(review)}>Editar endereço</button><button className={secondary} disabled={busy} onClick={() => setReview(null)}>Voltar</button></div></div>}
  </section>;
}
