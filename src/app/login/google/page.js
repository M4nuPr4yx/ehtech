'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { apiRequest } from '../../../lib/api-request'

export default function GoogleReturn() {
  const [stage, setStage] = useState(null), [password, setPassword] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(true)
  const pending = useRef(null)
  const complete = useCallback(async (metadata, senha, signal) => {
    const controller = new AbortController(); pending.current?.abort(); pending.current = controller
    const requestSignal = signal || controller.signal
    setBusy(true); setError('')
    try {
      const data = await apiRequest('/auth/google/concluir', { method: 'POST', credentials: 'same-origin', signal: requestSignal, json: senha === undefined ? {} : { senha }, ...(metadata.acao === 'vincular' ? { headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } } : {}) })
      if (requestSignal.aborted) return
      if (data.proxima_etapa) { setStage({ ...data, acao: metadata.acao }); setBusy(false); return }
      if (data.token) {
        sessionStorage.removeItem('adminToken'); localStorage.setItem('token', data.token); localStorage.setItem('userUsername', data.username || '')
        localStorage.removeItem('userFoto'); window.dispatchEvent(new Event('ehtech:auth-change'))
      }
      const destination = typeof data.destino === 'string' && data.destino.startsWith('/') && !/^\/[/\\]/.test(data.destino) ? data.destino : '/perfil'
      window.location.replace(destination)
    } catch (failure) { if (!requestSignal.aborted) { setError(failure.message); setBusy(false) } }
    finally { if (!requestSignal.aborted) setPassword('') }
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    // Evita consumir a tentativa durante a montagem de verificação do Strict Mode.
    const timer = window.setTimeout(async () => {
      const cancelled = new URLSearchParams(window.location.search).get('erro')
      if (cancelled) { setError(cancelled === 'cancelado' ? 'Você cancelou o acesso pelo Google. Pode tentar novamente.' : 'Não foi possível validar o retorno do Google. Inicie uma nova tentativa.'); setBusy(false); return }
      try {
        const metadata = await apiRequest('/auth/google/retorno', { signal: controller.signal, credentials: 'same-origin' })
        if (!controller.signal.aborted) await complete(metadata, undefined, controller.signal)
      } catch (failure) { if (!controller.signal.aborted) { setError(failure.message); setBusy(false) } }
    }, 0)
    return () => { clearTimeout(timer); controller.abort(); pending.current?.abort() }
  }, [complete])
  return <section className="mx-auto my-12 max-w-md space-y-5 rounded-2xl border border-line bg-surface p-6 text-foreground">
    <h1 className="text-2xl font-bold">Acesso com Google</h1>
    {busy && <p role="status">Concluindo seu acesso à EHtech…</p>}
    {stage && <form className="space-y-4" onSubmit={event => { event.preventDefault(); complete(stage, password) }}>
      <p className="break-words">Já existe uma conta EHtech para {stage.email}. Confirme a senha atual da EHtech para vincular o Google.</p>
      <label className="block">Senha atual da EHtech<input type="password" className="mt-2 w-full rounded-xl border border-line bg-surface-raised p-3" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required maxLength={200} disabled={busy} /></label>
      <button className="w-full rounded-xl bg-accent-fill p-3 font-bold text-accent-contrast disabled:opacity-50" disabled={busy}>Confirmar vínculo com Google</button>
      <Link href="/esqueci-senha" className="block text-accent underline">Recuperar a senha da EHtech</Link>
    </form>}
    {error && <p role="alert" className="text-danger">{error}</p>}
    {!busy && <Link className="block text-accent underline" href="/?login=1">Voltar ao login e tentar novamente</Link>}
  </section>
}
