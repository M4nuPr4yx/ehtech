'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import GoogleAccess from '../complements/GoogleAccess'
import { apiRequest } from '../../lib/api-request'

export default function GoogleAccount() {
  const [account, setAccount] = useState(null), [error, setError] = useState(''), [connecting, setConnecting] = useState(false), [password, setPassword] = useState(''), [busy, setBusy] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    apiRequest('/auth/google/conta', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }, signal: controller.signal }).then(setAccount).catch(failure => { if (!controller.signal.aborted) setError(failure.message) })
    return () => controller.abort()
  }, [])
  async function disconnect(event) {
    event.preventDefault(); setBusy(true); setError('')
    const token = localStorage.getItem('token')
    try {
      await apiRequest('/auth/google/vinculo', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` }, json: { senha: password } })
      if (localStorage.getItem('token') === token) { localStorage.removeItem('token'); localStorage.removeItem('userUsername'); localStorage.removeItem('userFoto'); window.dispatchEvent(new Event('ehtech:auth-change')); window.location.assign('/?login=1') }
    } catch (failure) { setError(failure.message) } finally { setBusy(false); setPassword('') }
  }
  return <section className="space-y-4 rounded-2xl border border-line p-5"><h2 className="text-xl font-bold">Acesso com Google</h2>
    {!account && !error && <p role="status">Carregando meios de acesso…</p>}
    {account && <><p>{account.vinculado ? 'Sua conta está vinculada ao Google.' : 'Sua conta ainda não está vinculada ao Google.'}</p>
      {!account.senha_definida && <p>Você entra com Google e ainda não definiu uma senha da EHtech. Para usar e-mail e senha ou desvincular o Google, <Link href="/esqueci-senha" className="text-accent underline">defina uma senha pela recuperação de e-mail</Link>. O envio depende do e-mail de recuperação estar disponível.</p>}
      {!account.vinculado && <><button type="button" className="rounded-xl border border-line p-3 font-bold" onClick={() => setConnecting(value => !value)}>{connecting ? 'Cancelar vínculo' : 'Vincular minha conta Google'}</button>{connecting && <GoogleAccess linking />}</>}
      {account.vinculado && account.senha_definida && <form onSubmit={disconnect} className="space-y-3"><p>Desvincular encerra suas sessões. Depois, entre com e-mail e senha.</p><label className="block text-sm">Senha da EHtech para desvincular<input className="mt-1 w-full rounded-xl border border-line bg-surface-raised p-3 text-foreground" type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required maxLength={200} disabled={busy} /></label><button className="rounded-xl border border-line p-3 font-bold disabled:opacity-50" disabled={busy}>Desvincular Google e sair</button></form>}
    </>}{error && <p role="alert" className="text-danger">{error}</p>}
  </section>
}
