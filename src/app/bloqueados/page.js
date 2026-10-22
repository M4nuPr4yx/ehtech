'use client'
import { useEffect, useState } from 'react'
import { accountRequest, trustButton } from '../complements/TrustControls'
export default function BlockedPage() {
  const [items, setItems] = useState([]), [error, setError] = useState(''), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false)
  useEffect(() => { let active = true; accountRequest('/bloqueios').then(data => { if (active) setItems(data.itens) }).catch(error => { if (active) setError(error.message) }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [])
  async function remove(id) { setBusy(true); setError(''); try { await accountRequest(`/bloqueios/${id}`, 'DELETE'); setItems(items.filter(item => Number(item.bloqueado_id) !== Number(id))) } catch (error) { setError(error.message) } finally { setBusy(false) } }
  return <div className="mx-auto max-w-3xl space-y-6 px-4 py-10"><h1 className="text-3xl font-bold">Usuários bloqueados</h1><p>Seu bloqueio impede novas mensagens nas duas direções. Desbloquear não remove bloqueios feitos pela outra conta.</p>{loading && <p role="status">Carregando bloqueios…</p>}{error && <p role="alert">{error}</p>}{!loading && !error && !items.length && <p>Você não bloqueou nenhum usuário.</p>}<ul className="space-y-3">{items.map(item => <li key={item.bloqueado_id} className="flex items-center justify-between rounded-xl border border-line p-4"><span>@{item.username}</span><button className={trustButton} disabled={busy} onClick={() => remove(item.bloqueado_id)}>Desbloquear</button></li>)}</ul></div>
}
