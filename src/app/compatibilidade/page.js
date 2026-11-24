'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { apiRequest } from '../../lib/api-request'
import CatalogSearch, { componentDetails } from './CatalogSearch'
import styles from './compatibilidade.module.css'
import BasicResult from './BasicResult'
import LoadingState from '../complements/LoadingState'

const STATUS = { compativel: 'Sem conflitos nos dados analisados pela IA', incompativel: 'A IA identificou incompatibilidades', condicional: 'A IA recomenda confirmar condições', nao_verificado: 'Faltam dados para a IA concluir' }
const PROVIDERS = { gemini: 'Gemini', groq: 'Groq', ollama: 'Ollama local' }
const MULTIPLE = ['memoria', 'armazenamento', 'placa_video']

export default function CompatibilityPage() {
  const [catalog, setCatalog] = useState(null)
  const [state, setState] = useState(null)
  const [selection, setSelection] = useState([])
  const [bios, setBios] = useState('')
  const [result, setResult] = useState(null)
  const [basicResult, setBasicResult] = useState(null)
  const [operation, setOperation] = useState(null)
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [retry, setRetry] = useState(0)
  const [notice, setNotice] = useState('')
  const request = useRef(null), statusRequest = useRef(null), resultPanel = useRef(null)
  const busy = operation !== null

  useEffect(() => {
    const controller = new AbortController()
    apiRequest('/componentes/catalogo/status', { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) { setCatalog(data); setLoadError('') }
    }).catch(failure => { if (!controller.signal.aborted) setLoadError(failure.message) })
    return () => controller.abort()
  }, [retry])
  useEffect(() => {
    const controller = new AbortController()
    statusRequest.current = controller
    apiRequest('/componentes/ia/status', { signal: controller.signal }).then(status => {
      if (!controller.signal.aborted) setState(status)
    }).catch(() => { if (!controller.signal.aborted) setState({ disponivel: false, mensagem: 'IA indisponível. A checagem básica continua disponível.' }) })
    return () => controller.abort()
  }, [])
  useEffect(() => () => request.current?.abort(), [])

  function cancel() { request.current?.abort(); setOperation(null) }
  function clearResult() { cancel(); setError(''); setResult(null); setBasicResult(null); setNotice('') }
  async function checkBasic(event) {
    event.preventDefault(); clearResult(); setOperation('basic')
    const controller = new AbortController(); request.current = controller
    try {
      const data = await apiRequest('/componentes/verificar-basico', { method: 'POST', signal: controller.signal, json: { componentes: selection.map(({ id, quantidade }) => ({ id, quantidade: Number(quantidade) })), bios } })
      if (!controller.signal.aborted) setBasicResult(data)
    } catch (error) { if (!controller.signal.aborted) setError(error.message) } finally { if (!controller.signal.aborted) setOperation(null) }
  }
  function choose(item) {
    clearResult()
    if (selection.some(selected => selected.id === item.id)) { setNotice('Este modelo já está na seleção.'); return }
    const next = MULTIPLE.includes(item.tipo) ? selection : selection.filter(selected => selected.tipo !== item.tipo)
    if (next.length >= 16) { setError('Você pode analisar até 16 modelos por vez.'); return }
    if (item.tipo === 'placa_mae') setBios('')
    setSelection([...next, { ...item, quantidade: 1 }])
  }
  async function analyze(event) {
    if (!event.currentTarget.form.reportValidity()) return
    cancel(); setError(''); setResult(null); setNotice(''); setOperation('ai')
    const controller = new AbortController(); request.current = controller
    try {
      if (!state?.disponivel) {
        statusRequest.current?.abort()
        const status = await apiRequest('/componentes/ia/status', { signal: controller.signal })
        if (controller.signal.aborted) return
        setState(status)
        if (!status.disponivel) return
      }
      const data = await apiRequest('/componentes/ia/analisar', { method: 'POST', signal: controller.signal, timeoutMs: 190000, json: { componentes: selection.map(({ id, quantidade }) => ({ id, quantidade: Number(quantidade) })), bios } })
      if (!controller.signal.aborted) { setResult(data); resultPanel.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }) }
    } catch (failure) { if (!controller.signal.aborted) setError(`${failure.message} ${basicResult ? 'A checagem básica permanece abaixo.' : 'Você ainda pode verificar as peças com as regras básicas.'}`) } finally { if (!controller.signal.aborted) setOperation(null) }
  }

  return <div className={styles.page}><div className={styles.shell}>
    <section className={styles.hero}><span className={styles.eyebrow}>EHtech · Compatibilidade de componentes</span><h1>Estas peças combinam?</h1><p>Confira requisitos por regras básicas e, se disponível, complemente com IA. Pesquise processadores Intel e AMD, placas-mãe, memórias, vídeo, armazenamento, fontes, gabinetes e coolers.</p><div className={styles.actions}><Link href="/produtos">Explorar anúncios →</Link></div></section>
    {loadError && <div role="alert" className={styles.error}>{loadError} <button className={styles.button} onClick={() => setRetry(value => value + 1)}>Tentar novamente</button></div>}
    {notice && <div role="status" className={styles.notice}>{notice}</div>}
    <div className={styles.layout}><div>
      <section className={styles.panel}><h2>1. Encontre seus componentes</h2>{catalog ? <CatalogSearch categories={catalog.categorias} onChoose={choose} disabled={busy} /> : !loadError && <LoadingState label="Carregando catálogo de peças…" />}{catalog && <div className={styles.scope}><p>{catalog.total.toLocaleString('pt-BR')} registros de componentes · snapshot de {new Date(`${catalog.data_fonte}T12:00:00`).toLocaleDateString('pt-BR')}. A fonte não cobre todos os modelos ou lançamentos.</p><a href={catalog.fonte} target="_blank" rel="noreferrer">Fonte: PC Part Dataset · licença MIT ↗</a><p>Dados comunitários, sem revisão individual. Variantes podem compartilhar o nome; confira as características exibidas.</p></div>}</section>
    </div><section className={styles.panel} ref={resultPanel} aria-busy={busy}>
      <h2>2. Sua seleção</h2><form onSubmit={checkBasic} className={styles.form}>
        {!selection.length && <p className={styles.muted}>Adicione pelo menos duas peças. Processador, placa-mãe, fonte, gabinete e cooler: um modelo de cada; memória, vídeo e armazenamento permitem múltiplos modelos.</p>}
        <ul className={styles.checks}>{selection.map(item => <li key={item.id} className={styles.check}>
          <p className={styles.muted}>{catalog?.categorias.find(category => category.tipo === item.tipo)?.nome}</p>
          <strong>{item.modelo}</strong><p>{componentDetails(item)}</p>
          <Link className="text-sm text-accent underline underline-offset-4" href={`/produtos?${new URLSearchParams({ search: item.modelo })}`}>Buscar anúncios deste modelo<span className="sr-only"> ({item.modelo})</span></Link>
          <div className={styles.selectionActions}>{MULTIPLE.includes(item.tipo) && <label>Quantidade de {item.tipo === 'memoria' ? 'kits' : 'unidades'}<input type="number" min="1" max="4" required disabled={busy} value={item.quantidade} onChange={event => { clearResult(); setSelection(previous => previous.map(part => part.id === item.id ? { ...part, quantidade: event.target.value } : part)) }} /></label>}<button type="button" disabled={busy} className={`${styles.button} ${styles.secondary}`} aria-label={`Remover ${item.modelo}`} onClick={() => { clearResult(); setSelection(previous => previous.filter(part => part.id !== item.id)) }}>Remover</button></div>
        </li>)}</ul>
        <label>BIOS instalada (opcional)<input value={bios} disabled={busy} maxLength={40} pattern="[a-zA-Z0-9. _\-]*" placeholder="Não sei / não informada" onChange={event => { clearResult(); setBios(event.target.value) }} /></label>
        <div className={styles.aiPrivacy}>Somente ao escolher Complementar com IA, os modelos, especificações, quantidades e BIOS informada são enviados {state?.externo ? `ao ${PROVIDERS[state.provedor] || 'provedor externo'}` : 'ao provedor configurado'}. Não inclua dados pessoais. No nível gratuito do Gemini, os dados podem ser usados para melhorar os serviços do Google.</div>
        {state && <p role="status" className={styles.muted}>{state.disponivel ? `${PROVIDERS[state.provedor]} configurado · disponibilidade sujeita à autorização e cota.` : state.mensagem}</p>}
        <p className={styles.muted}>A checagem básica usa regras no servidor e não envia dados a provedores de IA. Ela funciona sem chave de IA.</p>
        <button className={styles.button} disabled={busy || selection.length < 2}>{operation === 'basic' ? 'Verificando…' : 'Verificar com regras básicas'}</button>
        <button type="button" className={`${styles.button} ${styles.secondary}`} onClick={analyze} disabled={busy || selection.length < 2 || state?.provedor === 'disabled'}>{operation === 'ai' ? 'Consultando a IA…' : 'Complementar com IA'}</button>
        {busy && <button type="button" className={`${styles.button} ${styles.secondary}`} onClick={cancel}>Cancelar análise</button>}
      </form>
      {error && <div role="alert" className={styles.error}>{error}</div>}
      <div aria-live="polite">{basicResult && <BasicResult result={basicResult} />}</div>
      <div aria-live="polite">{result ? <div className={styles.aiAnswer}><div className={`${styles.result} ${styles[result.ia.status] || ''}`}><h2>{STATUS[result.ia.status]}</h2><p>{result.ia.resumo}</p></div><p className={styles.muted}>Avaliação por {PROVIDERS[result.ia.provedor]} · {new Date(result.ia.gerado_em).toLocaleString('pt-BR')}{result.ia.em_cache ? ' · resultado recente reutilizado' : ''}</p><ul className={styles.checks}>{result.ia.pontos.map((point, index) => <li key={index} className={`${styles.check} ${styles[point.status] || ''}`}><strong>{point.titulo}</strong><p>{point.explicacao}</p><p><b>Próximo passo:</b> {point.acao}</p></li>)}</ul><div className={styles.scope}>{result.limites.map(note => <p key={note}>{note}</p>)}</div></div> : <p className={styles.muted}>Escolha a checagem básica para ver requisitos com regras e fontes, sem chave de IA. A análise adicional com IA pode errar; confirme os modelos exatos e o suporte no fabricante antes de comprar ou montar. Não é certificação técnica.</p>}</div>
    </section></div>
  </div></div>
}
