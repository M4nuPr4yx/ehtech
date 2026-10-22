'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiRequest } from '../../lib/api-request'
import { COMPARISON_KEY, comparisonIds } from '../../lib/comparison.mjs'

export const trustInput = 'w-full rounded-xl border border-line bg-surface p-3 text-foreground'
export const trustButton = 'rounded-xl border border-line px-4 py-2 text-sm font-bold hover:bg-surface-raised disabled:opacity-50'
export function accountRequest(endpoint, method = 'GET', body, admin = false) {
  const token = admin ? sessionStorage.getItem('adminToken') : localStorage.getItem('token')
  if (!token) return Promise.reject(new Error('Entre na sua conta para continuar.'))
  return apiRequest(endpoint, { method, headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
}
export function ProductActions({ productId, initialSaved, onFavoriteChange }) {
  const id = Number(productId)
  const [saved, setSaved] = useState(initialSaved || false), [compared, setCompared] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    function sync() { try { setCompared(comparisonIds(localStorage.getItem(COMPARISON_KEY)).includes(id)) } catch {} }
    sync(); window.addEventListener('storage', sync); window.addEventListener('comparison-change', sync)
    const token = localStorage.getItem('token')
    if (token && initialSaved === undefined) apiRequest('/favoritos', { signal: controller.signal, headers: { Authorization: `Bearer ${token}` } }).then(data => setSaved(data.itens.some(item => Number(item.id_produto) === id))).catch(() => {})
    return () => { controller.abort(); window.removeEventListener('storage', sync); window.removeEventListener('comparison-change', sync) }
  }, [id, initialSaved])
  async function favorite() {
    setBusy(true); setMessage('')
    try { const data = await accountRequest(`/favoritos/${id}`, saved ? 'DELETE' : 'PUT'); setSaved(!saved); onFavoriteChange?.(!saved); setMessage(data.mensagem) }
    catch (error) { setMessage(error.message) } finally { setBusy(false) }
  }
  function compare() {
    try {
      const current = comparisonIds(localStorage.getItem(COMPARISON_KEY)), exists = current.includes(id)
      if (!exists && current.length >= 4) { setMessage('Compare até quatro anúncios. Remova um na página de comparação.'); return }
      localStorage.setItem(COMPARISON_KEY, JSON.stringify(exists ? current.filter(value => value !== id) : [...current, id]))
      window.dispatchEvent(new Event('comparison-change')); setMessage(exists ? 'Removido da comparação.' : 'Adicionado à comparação.')
    } catch { setMessage('Não foi possível salvar a comparação neste navegador.') }
  }
  return <div className="space-y-3"><div className="flex flex-wrap gap-2"><button type="button" className={trustButton} disabled={busy} aria-pressed={saved} onClick={favorite}>{saved ? 'Remover dos favoritos' : 'Salvar favorito'}</button><button type="button" className={trustButton} aria-pressed={compared} onClick={compare}>{compared ? 'Remover da comparação' : 'Comparar anúncio'}</button><Link className={trustButton} href="/comparar">Ver comparação</Link></div>{message && <p role="status" className="text-sm">{message}</p>}</div>
}
export function ReportControl({ type, targetId, label = 'Denunciar conteúdo' }) {
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState('')
  async function submit(event) {
    event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); setBusy(true); setMessage('')
    try { const data = await accountRequest('/denuncias', 'POST', { ...values, tipo: type, alvo_id: Number(targetId) }); setMessage(data.mensagem); setOpen(false) }
    catch (error) { setMessage(error.message) } finally { setBusy(false) }
  }
  return <div className="space-y-2"><button type="button" className={trustButton} onClick={() => setOpen(!open)} aria-expanded={open}>{open ? 'Cancelar denúncia' : label}</button>{open && <form onSubmit={submit} className="grid gap-3 rounded-xl border border-line bg-surface p-4"><label>Motivo<select name="motivo" required className={trustInput}><option value="fraude">Suspeita de fraude</option><option value="conteudo_inadequado">Conteúdo inadequado</option><option value="assedio">Assédio</option><option value="spam">Spam</option><option value="outro">Outro motivo</option></select></label><label>Descreva a situação<textarea name="detalhes" className={trustInput} required minLength={10} maxLength={2000} /></label><p className="text-sm text-muted">A administração terá acesso à denúncia e ao conteúdo denunciado para análise. Evite incluir dados pessoais desnecessários.</p><button disabled={busy} className={trustButton}>{busy ? 'Enviando…' : 'Enviar denúncia'}</button></form>}{message && <p role="status" className="text-sm">{message}</p>}</div>
}
export function ConversationSafety({ userId }) {
  const [blocked, setBlocked] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState('')
  useEffect(() => {
    let active = true
    accountRequest('/bloqueios').then(data => { if (active) setBlocked(data.itens.some(item => Number(item.bloqueado_id) === Number(userId))) }).catch(() => {})
    return () => { active = false }
  }, [userId])
  async function toggle() {
    setBusy(true); setMessage('')
    try { const data = await accountRequest(`/bloqueios/${userId}`, blocked ? 'DELETE' : 'PUT'); setBlocked(!blocked); setMessage(data.mensagem) }
    catch (error) { setMessage(error.message) } finally { setBusy(false) }
  }
  return <div className="space-y-2 border-b border-line p-3"><div className="flex flex-wrap gap-2"><button type="button" disabled={busy} className={trustButton} onClick={toggle}>{blocked ? 'Desbloquear usuário' : 'Bloquear usuário'}</button><ReportControl type="usuario" targetId={userId} label="Denunciar usuário" /><Link className={trustButton} href="/bloqueados">Gerenciar bloqueados</Link></div><p className="text-xs text-muted">Bloquear impede novas mensagens nas duas direções. O histórico e os pedidos existentes são preservados.</p>{message && <p role="status">{message}</p>}</div>
}
