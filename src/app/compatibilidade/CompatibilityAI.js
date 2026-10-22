'use client'
import { apiResponse } from '../../lib/api-request.js';


import { useEffect, useRef, useState } from 'react'
import styles from './compatibilidade.module.css'

const providerNames = { gemini: 'Gemini', groq: 'Groq', ollama: 'Ollama' }

export default function CompatibilityAI({ result, onAnalysis }) {
  const [status, setStatus] = useState(null)
  const [answer, setAnswer] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const request = useRef(null)

  useEffect(() => {
    const controller = new AbortController()
    apiResponse('/componentes/ia/status', { signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw Error()
        setStatus(await response.json())
      }).catch(err => { if (err.name !== 'AbortError') setError('Não foi possível consultar a IA agora. Seu resultado técnico continua disponível.') })
    return () => { controller.abort(); request.current?.abort() }
  }, [])

  async function explain() {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setBusy(true); setError('')
    try {
      if (!status?.disponivel) {
        const response = await apiResponse('/componentes/ia/status', { signal: controller.signal, cache: 'no-store' })
        if (!response.ok) throw Error('Não foi possível consultar a IA agora.')
        const next = await response.json()
        setStatus(next)
        return
      }
      const response = await apiResponse('/componentes/ia/explicar', {
        timeoutMs: 190000,
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(result.selecao), signal: controller.signal, cache: 'no-store'
      })
      let data
      try { data = await response.json() } catch { throw Error('A explicação não chegou completa. Tente novamente; o resultado técnico continua disponível.') }
      if (!response.ok) throw Error(data.mensagem || 'Não foi possível gerar a explicação.')
      if (controller.signal.aborted) return
      setAnswer(data.ia)
      onAnalysis(data.verificacao)
    } catch (err) { if (!controller.signal.aborted) setError(err.name === 'TypeError' ? 'Não foi possível conectar à IA agora. O resultado técnico continua disponível.' : err.message || 'Não foi possível gerar a explicação agora.') }
    finally { if (!controller.signal.aborted) setBusy(false) }
  }

  return <section className={styles.ai} aria-labelledby="ai-title">
    <div className={styles.aiHeading}><h3 id="ai-title">Entenda o resultado com IA</h3>{status && status.provedor !== 'disabled' && <span>{status.externo ? 'Online' : 'Local'} · {providerNames[status.provedor] || 'IA'}</span>}</div>
    <p className={styles.muted}>Uma explicação simples dos requisitos verificados e do que conferir a seguir.</p>
    {!answer && <p className={styles.aiPrivacy}>{status?.externo ? `Ao pedir a explicação, apenas as peças selecionadas e os requisitos técnicos serão enviados ao ${providerNames[status.provedor] || 'provedor configurado'}.` : status?.provedor === 'ollama' ? 'Com Ollama, a explicação é gerada no computador que executa o site.' : 'A explicação ficará disponível quando a IA estiver configurada.'}{status?.provedor === 'gemini' && ' No plano gratuito, o Google pode usar esses dados para melhorar seus produtos.'}</p>}
    {status && !status.disponivel && <p role="status" className={styles.muted}>{status.mensagem}</p>}
    {error && <p role="alert" className={styles.aiError}>{error}</p>}
    {busy && <p role="status" className={styles.muted}>Preparando a explicação…{status?.provedor === 'ollama' && ' A primeira resposta local pode levar mais tempo.'}</p>}
    {answer ? <div className={styles.aiAnswer}>
      <p>{answer.resumo}</p>
      {answer.pontos.map(point => <div key={point.codigo} className={styles.aiPoint}><strong>{point.titulo}</strong><p>{point.explicacao}</p><p className={styles.aiAction}><span>Próximo passo:</span> {point.acao}</p></div>)}
      <small>Explicação gerada por {providerNames[answer.provedor] || 'IA'}. As fontes e a conclusão técnica estão abaixo.</small>
    </div> : <button type="button" className={`${styles.button} ${styles.secondary}`} onClick={explain} disabled={busy || !result.componentes.length}>{busy ? 'Explicando…' : !status?.disponivel ? 'Conferir disponibilidade da IA' : 'Explicar resultado com IA'}</button>}
  </section>
}
