'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { apiRequest } from '../../lib/api-request'
import LoadingState from '../complements/LoadingState'
import { SERVICE_CATEGORIES, categoryLabel, modalityLabel, servicePrice } from './serviceData'

const VERSION = '2026-10-22'
const empty = { titulo: '', descricao: '', categoria: 'programacao', preco_base: '', tipo_preco: 'sob_consulta', prazo: '', modalidade: 'remoto', regiao: '', destaques: [], entregaveis: '', criterios_aceite: '', revisoes: 0 }
const input = 'w-full rounded-xl border border-line bg-surface p-3 text-foreground'
const button = 'rounded-xl border border-line px-4 py-3 font-semibold text-foreground hover:bg-surface-raised disabled:opacity-50'
const primary = 'rounded-xl bg-accent-fill px-4 py-3 font-bold text-accent-contrast disabled:opacity-50'

export default function ServiceListings({ moderation = false }) {
  const [items, setItems] = useState([]), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false)
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [form, setForm] = useState(null), [accepted, setAccepted] = useState(false)
  const pending = useRef(null), formRef = useRef(null)
  const request = useCallback((path, options = {}) => {
    const token = moderation ? sessionStorage.getItem('adminToken') || localStorage.getItem('token') : localStorage.getItem('token')
    if (!token) return Promise.reject(new Error('Entre na sua conta para continuar.'))
    return apiRequest(`/servicos${path}`, { ...options, headers: { Authorization: `Bearer ${token}` } })
  }, [moderation])
  const load = useCallback(async () => {
    pending.current?.abort()
    const controller = new AbortController(); pending.current = controller
    setLoading(true); setError(''); setItems([])
    try { const data = await request(moderation ? '/moderacao' : '/meus', { signal: controller.signal }); if (!controller.signal.aborted) setItems(data) }
    catch (failure) { if (!controller.signal.aborted) setError(failure.message) }
    finally { if (!controller.signal.aborted) setLoading(false) }
  }, [moderation, request])
  useEffect(() => {
    load()
    const sync = event => { if (event.type === 'storage' && !['token', 'adminToken', null].includes(event.key)) return; setForm(null); setNotice(''); load() }
    window.addEventListener('storage', sync); window.addEventListener('ehtech:auth-change', sync)
    return () => { pending.current?.abort(); window.removeEventListener('storage', sync); window.removeEventListener('ehtech:auth-change', sync) }
  }, [load])
  function edit(item) {
    setError(''); setNotice(''); setAccepted(false)
    setForm(item ? { ...empty, ...Object.fromEntries(Object.keys(empty).map(key => [key, item.revisao_pendente?.[key] ?? item[key] ?? empty[key]])), id_servico: item.id_servico, versao: item.versao } : { ...empty })
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }
  async function mutate(path, method, json, message) {
    setBusy(true); setError(''); setNotice('')
    try { await request(path, { method, json }); await load(); setNotice(message); return true }
    catch (failure) { setError(failure.message); return false }
    finally { setBusy(false) }
  }
  async function save(event) {
    event.preventDefault()
    const { id_servico, ...data } = form
    if (await mutate(id_servico ? `/meus/${id_servico}` : '/meus', id_servico ? 'PUT' : 'POST', { ...data, preco_base: data.tipo_preco === 'sob_consulta' ? null : data.preco_base, politicas_versao: VERSION, destaques: data.destaques.map(text => text.trim()).filter(Boolean) }, 'Anúncio enviado para aprovação.')) { setForm(null); setAccepted(false) }
  }
  const change = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }))
  return <div className="site-background min-h-screen px-4 py-10 text-foreground"><div className="mx-auto max-w-5xl space-y-6">
    <Link href={moderation ? '/admin' : '/servicos'} className="font-bold text-accent underline">← {moderation ? 'Administração' : 'Catálogo de serviços'}</Link>
    <h1 className="text-3xl font-bold">{moderation ? 'Moderação de serviços' : 'Meus serviços'}</h1>
    <p>{moderation ? 'Revise o conteúdo proposto. A aprovação substitui a versão pública; uma revisão reprovada preserva a versão anterior aprovada.' : 'Ofereça seu trabalho, defina as condições e acompanhe a aprovação. Você é o prestador responsável; o pagamento é combinado diretamente com o cliente.'}</p>
    <div className="flex flex-wrap gap-3"><button className={button} disabled={busy} onClick={load}>Atualizar anúncios</button>{!moderation && <button className={primary} disabled={busy} onClick={() => edit(null)}>Anunciar serviço</button>}<Link className={button} href="/politicas">Políticas da plataforma</Link><Link className={button} href={moderation ? '/admin/denuncias' : '/contratacoes'}>{moderation ? 'Denúncias' : 'Minhas contratações'}</Link></div>
    {error && <p role="alert" className="rounded-xl bg-danger-soft p-4 text-danger">{error} <Link href={moderation ? '/admin' : '/?login=1&next=%2Fmeus-servicos'} className="underline">Acessar conta</Link></p>}
    {notice && <p role="status" className="rounded-xl bg-success-soft p-4 text-success">{notice}</p>}
    {form && <form ref={formRef} onSubmit={save} className="grid gap-4 rounded-2xl border border-line bg-surface p-5">
      <h2 className="text-xl font-bold">{form.id_servico ? 'Revisar anúncio' : 'Novo serviço'}</h2>
      <label>Título<input className={input} name="titulo" value={form.titulo} onChange={change} required minLength={5} maxLength={180} /></label>
      <label>Descrição<textarea className={input} name="descricao" value={form.descricao} onChange={change} required minLength={30} maxLength={5000} rows={4} /></label>
      <div className="grid gap-4 sm:grid-cols-2"><label>Categoria<select className={input} name="categoria" value={form.categoria} onChange={change}>{SERVICE_CATEGORIES.filter(([value]) => value).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Modalidade<select className={input} name="modalidade" value={form.modalidade} onChange={change}><option value="remoto">Remoto</option><option value="presencial">Presencial</option><option value="hibrido">Híbrido</option></select></label>
        <label>Tipo de preço<select className={input} name="tipo_preco" value={form.tipo_preco} onChange={change}><option value="sob_consulta">Sob orçamento</option><option value="fixo">Fixo</option><option value="a_partir_de">A partir de</option></select></label>
        {form.tipo_preco !== 'sob_consulta' && <label>Preço base (R$)<input className={input} type="number" min="0.01" max="99999999.99" step="0.01" name="preco_base" value={form.preco_base ?? ''} onChange={change} required /></label>}
        <label>Prazo estimado<input className={input} name="prazo" value={form.prazo} onChange={change} required minLength={3} maxLength={80} placeholder="Ex.: até 5 dias úteis após o aceite" /></label>
        <label>Região de atendimento{form.modalidade === 'remoto' ? ' (opcional)' : ''}<input className={input} name="regiao" value={form.regiao} onChange={change} required={form.modalidade !== 'remoto'} minLength={form.modalidade === 'remoto' ? 0 : 3} maxLength={120} placeholder="Cidade/UF ou região atendida; não informe endereço particular" /></label></div>
      <label>O que será entregue<textarea className={input} name="entregaveis" value={form.entregaveis} onChange={change} required minLength={10} maxLength={2000} rows={3} /></label>
      <label>Como o cliente poderá conferir o resultado<textarea className={input} name="criterios_aceite" value={form.criterios_aceite} onChange={change} required minLength={10} maxLength={2000} rows={3} /></label>
      <label>Revisões incluídas<input className={input} type="number" min="0" max="20" step="1" name="revisoes" value={form.revisoes} onChange={change} required /></label>
      <label>Destaques (até 8, um por linha)<textarea className={input} value={form.destaques.join('\n')} onChange={event => setForm(current => ({ ...current, destaques: event.target.value.split('\n') }))} rows={3} maxLength={967} /></label>
      <label className="flex items-start gap-3"><input type="checkbox" required checked={accepted} onChange={event => setAccepted(event.target.checked)} /><span>Li as <Link href="/politicas" target="_blank" className="text-accent underline">políticas de pagamento, serviços e trocas</Link> (versão {VERSION}). Sou responsável pela oferta e combinarei o pagamento diretamente com o cliente.</span></label>
      <div className="flex flex-wrap gap-3"><button className={primary} disabled={busy || !accepted}>{busy ? 'Enviando…' : 'Enviar para aprovação'}</button><button type="button" className={button} disabled={busy} onClick={() => setForm(null)}>Cancelar edição</button></div>
    </form>}
    {loading ? <LoadingState label="Carregando seus anúncios de serviços…" /> : <><p className="text-sm text-muted">Até 100 anúncios mais recentes{moderation ? ', com revisões pendentes primeiro' : ''}.</p>{!items.length && !error && <p>Nenhum anúncio de serviço por aqui. Publique sua primeira oferta.</p>}{items.map(item => {
      const proposed = item.revisao_pendente || item
      return <article key={item.id_servico} className="space-y-3 rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-xl font-bold">{proposed.titulo}</h2><p>{moderation && `Prestador: ${item.prestador} · `}Aprovação: {item.status_aprovacao} · Disponibilidade: {item.status} · {item.revisao_pendente ? 'Revisão aguardando análise' : 'Sem revisão pendente'}</p>
        {item.origem === 'demonstracao' && <p>Exemplo antigo pausado. Edite com uma oferta própria e aguarde aprovação.</p>}
        {item.motivo_reprovacao && <p className="text-danger">Motivo da última decisão: {item.motivo_reprovacao}</p>}
        <p className="whitespace-pre-wrap break-words">{proposed.descricao}</p><p>{categoryLabel(proposed.categoria)} · {modalityLabel(proposed.modalidade)} · {servicePrice(proposed)} · {proposed.prazo}</p>
        <p className="whitespace-pre-wrap break-words"><strong>Entregáveis:</strong> {proposed.entregaveis || 'Não informados no anúncio antigo.'}</p><p className="whitespace-pre-wrap break-words"><strong>Critérios de aceite:</strong> {proposed.criterios_aceite || 'Não informados no anúncio antigo.'}</p><p>Revisões incluídas: {proposed.revisoes || 0} · Região: {proposed.regiao || 'Remoto'}</p><ul>{proposed.destaques.map((text, index) => <li key={index}>{text}</li>)}</ul>
        {item.revisao_pendente && <details><summary>Comparar com a versão anterior</summary><p className="whitespace-pre-wrap break-words">{item.titulo} — {item.descricao}</p><p>{categoryLabel(item.categoria)} · {modalityLabel(item.modalidade)} · {servicePrice(item)} · {item.prazo} · {item.regiao}</p><p>{item.entregaveis}</p><p>{item.criterios_aceite}</p><p>Revisões: {item.revisoes}</p><ul>{item.destaques.map((text, index) => <li key={index}>{text}</li>)}</ul></details>}
        {moderation ? <form className="grid gap-3" onSubmit={event => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); mutate(`/moderacao/${item.id_servico}`, 'PATCH', { ...values, versao: item.versao }, 'Decisão registrada.') }}><label>Decisão<select className={input} name="decisao" defaultValue={item.revisao_pendente ? 'aprovar' : 'suspender'}><option value="aprovar" disabled={!item.revisao_pendente}>Aprovar revisão</option><option value="reprovar" disabled={!item.revisao_pendente}>Reprovar revisão</option><option value="suspender">Suspender anúncio</option></select></label><label>Motivo (obrigatório para reprovar ou suspender)<textarea className={input} name="motivo" maxLength={500} /></label><button className={button} disabled={busy}>Registrar decisão</button></form> : <div className="flex flex-wrap gap-3"><button className={button} disabled={busy} onClick={() => edit(item)}>Editar serviço</button><button className={button} disabled={busy || (item.status !== 'ativo' && (item.status_aprovacao !== 'aprovado' || item.origem === 'demonstracao'))} onClick={() => mutate(`/meus/${item.id_servico}/status`, 'PATCH', { versao: item.versao, status: item.status === 'ativo' ? 'pausado' : 'ativo' }, 'Disponibilidade atualizada.')}>{item.status === 'ativo' ? 'Pausar' : 'Ativar'}</button>{item.status !== 'arquivado' && <button className={button} disabled={busy} onClick={() => mutate(`/meus/${item.id_servico}/status`, 'PATCH', { versao: item.versao, status: 'arquivado' }, 'Anúncio arquivado. Contratações preservadas.')}>Arquivar</button>}{item.status === 'ativo' && item.status_aprovacao === 'aprovado' && <Link className={button} href={`/servicos/${item.slug}`}>Ver anúncio público</Link>}</div>}
      </article>
    })}</>}
  </div></div>
}
