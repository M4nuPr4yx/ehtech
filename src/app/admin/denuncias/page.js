'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { accountRequest, trustButton, trustInput } from '../../complements/TrustControls'

export default function ReportsPage() {
  const [items, setItems] = useState([]), [filter, setFilter] = useState('aberta'), [revision, setRevision] = useState(0), [error, setError] = useState(''), [notice, setNotice] = useState(''), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false)
  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    accountRequest(`/admin/denuncias?status=${filter}`, 'GET', undefined, true).then(data => { if (active) setItems(data.itens) }).catch(error => { if (active) { setError(error.message); setItems([]) } }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [filter, revision])
  async function decide(event, id) {
    event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)); setBusy(true); setError(''); setNotice('')
    try { await accountRequest(`/admin/denuncias/${id}`, 'PATCH', data, true); setNotice('Decisão registrada.'); setRevision(value => value + 1) }
    catch (error) { setError(error.message) } finally { setBusy(false) }
  }
  return <div className="mx-auto max-w-5xl space-y-6 px-4 py-10"><h1 className="text-3xl font-bold">Moderação de denúncias</h1><p>Revise as evidências e registre a justificativa. Cada decisão fica no histórico. Remoção de anúncio e gestão de contas usam os controles do painel administrativo.</p><Link href="/admin">Abrir painel administrativo</Link><label className="block">Filtrar por status<select className={trustInput} value={filter} onChange={event => setFilter(event.target.value)}><option value="aberta">Abertas</option><option value="em_analise">Em análise</option><option value="resolvida">Resolvidas</option><option value="arquivada">Arquivadas</option></select></label>{error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}{loading ? <p role="status">Carregando denúncias…</p> : <><p>Até 100 denúncias mais recentes neste status.</p>{!items.length && !error && <p>Nenhuma denúncia neste status.</p>}{items.map(item => <article key={item.id} className="space-y-4 rounded-2xl border border-line bg-surface p-5"><h2 className="text-xl font-bold">Denúncia #{item.id} · {item.tipo} #{item.alvo_id}</h2><p>Motivo: {item.motivo} · Status: {item.status}</p><p className="whitespace-pre-wrap">{item.detalhes}</p><details><summary>Evidência registrada</summary><pre className="overflow-x-auto whitespace-pre-wrap break-words text-sm">{item.evidencia}</pre></details><ol className="space-y-2">{item.historico.map(event => <li key={event.id}>{new Date(event.created_at).toLocaleString('pt-BR')} · Administrador #{event.moderador_id} · {event.status}: {event.justificativa}</li>)}</ol><form className="grid gap-3" onSubmit={event => decide(event, item.id)}><label>Nova decisão<select name="status" className={trustInput}><option value="em_analise">Em análise</option><option value="resolvida">Resolvida</option><option value="arquivada">Arquivada</option></select></label><label>Justificativa<textarea name="justificativa" className={trustInput} required minLength={10} maxLength={2000} /></label><button disabled={busy} className={trustButton}>Registrar decisão</button></form></article>)}</>}</div>
}
