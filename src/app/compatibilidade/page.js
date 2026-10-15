'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { apiRequest } from '../../lib/api-request'
import CatalogSearch, { componentDetails } from './CatalogSearch'
import styles from './compatibilidade.module.css'

const STATUS = { compativel: 'Sem conflitos nos dados analisados pela IA', incompativel: 'A IA identificou incompatibilidades', condicional: 'A IA recomenda confirmar condições', nao_verificado: 'Faltam dados para a IA concluir' }
const PROVIDERS = { gemini: 'Gemini', groq: 'Groq', ollama: 'Ollama local' }
const MULTIPLE = ['memoria', 'armazenamento', 'placa_video']

export default function CompatibilityPage() {
  const [catalog, setCatalog] = useState(null)
  const [state, setState] = useState(null)
  const [selection, setSelection] = useState([])
  const [bios, setBios] = useState('')
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [retry, setRetry] = useState(0)
  const [passports, setPassports] = useState([])
  const [passportId, setPassportId] = useState('')
  const [notice, setNotice] = useState('')
  const request = useRef(null), resultPanel = useRef(null)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([apiRequest('/componentes/catalogo/status', { signal: controller.signal }), apiRequest('/componentes/ia/status', { signal: controller.signal })]).then(([data, status]) => {
      if (!controller.signal.aborted) { setCatalog(data); setState(status); setLoadError('') }
    }).catch(failure => { if (!controller.signal.aborted) setLoadError(failure.message) })
    return () => controller.abort()
  }, [retry])
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    const controller = new AbortController()
    apiRequest('/passaportes', { signal: controller.signal, headers: { Authorization: `Bearer ${token}` } }).then(data => { if (!controller.signal.aborted) setPassports(data) }).catch(() => {})
    return () => controller.abort()
  }, [])
  useEffect(() => () => request.current?.abort(), [])

  function clearResult() { request.current?.abort(); setBusy(false); setError(''); setResult(null); setNotice('') }
  function choose(item) {
    clearResult()
    if (selection.some(selected => selected.id === item.id)) { setNotice('Este modelo já está na seleção.'); return }
    const next = MULTIPLE.includes(item.tipo) ? selection : selection.filter(selected => selected.tipo !== item.tipo)
    if (next.length >= 16) { setError('Você pode analisar até 16 modelos por vez.'); return }
    if (item.tipo === 'placa_mae') setBios('')
    setSelection([...next, { ...item, quantidade: 1 }])
  }
  async function importPassport() {
    const passport = passports.find(item => item.id === Number(passportId))
    if (!passport) return
    clearResult(); setBusy(true)
    const controller = new AbortController(); request.current = controller
    try {
      const reviewed = await apiRequest('/componentes', { signal: controller.signal })
      const imported = [], missing = []
      for (const part of passport.componentes) {
        const reference = reviewed.items.find(item => item.id === part.componente_id)
        if (!reference) { missing.push(part.modelo || 'Peça sem associação'); continue }
        const name = `${reference.marca} ${reference.modelo}`
        const data = await apiRequest(`/componentes/catalogo?${new URLSearchParams({ tipo: reference.tipo, busca: name.slice(0, 100) })}`, { signal: controller.signal })
        const matches = data.items.filter(item => item.modelo.toLowerCase() === name.toLowerCase())
        const quantity = Number(part.quantidade) || 1
        if (matches.length !== 1 || data.mais || quantity > 4 || imported.some(item => item.id === matches[0]?.id || (!MULTIPLE.includes(item.tipo) && item.tipo === reference.tipo))) { missing.push(name); continue }
        imported.push({ ...matches[0], quantidade: quantity })
      }
      if (!controller.signal.aborted) {
        setSelection(imported.slice(0, 16)); setBios('')
        setNotice(`Peças identificadas de “${passport.nome}” carregadas, sem alterar o passaporte.${missing.length ? ` ${missing.length} peça(s) ausente(s) ou com variantes: selecione o modelo exato abaixo.` : ''} Confirme quantidades e BIOS.`)
      }
    } catch (failure) { if (!controller.signal.aborted) setError(failure.message) } finally { if (!controller.signal.aborted) setBusy(false) }
  }
  async function analyze(event) {
    event.preventDefault(); clearResult(); setBusy(true)
    const controller = new AbortController(); request.current = controller
    try {
      const data = await apiRequest('/componentes/ia/analisar', { method: 'POST', signal: controller.signal, timeoutMs: 190000, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ componentes: selection.map(({ id, quantidade }) => ({ id, quantidade: Number(quantidade) })), bios }) })
      if (!controller.signal.aborted) { setResult(data); resultPanel.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }) }
    } catch (failure) { if (!controller.signal.aborted) setError(failure.message) } finally { if (!controller.signal.aborted) setBusy(false) }
  }

  return <div className={styles.page}><div className={styles.shell}>
    <section className={styles.hero}><span className={styles.eyebrow}>EHtech · Compatibilidade com IA</span><h1>Estas peças combinam?</h1><p>Monte sua seleção e receba uma análise da IA. Pesquise processadores Intel e AMD, placas-mãe, memórias, vídeo, armazenamento, fontes, gabinetes e coolers.</p><div className={styles.actions}><Link href="/passaportes">Meus equipamentos →</Link><Link href="/produtos">Explorar anúncios →</Link></div></section>
    {loadError && <div role="alert" className={styles.error}>{loadError} <button className={styles.button} onClick={() => setRetry(value => value + 1)}>Tentar novamente</button></div>}
    {notice && <div role="status" className={styles.notice}>{notice}</div>}
    <div className={styles.layout}><div>
      {passports.length > 0 && <section className={styles.panel}><h2>Usar meu equipamento</h2><div className={styles.form}><label>Equipamento<select value={passportId} disabled={busy} onChange={event => setPassportId(event.target.value)}><option value="">Selecione um passaporte</option>{passports.map(item => <option value={item.id} key={item.id}>{item.nome}</option>)}</select></label><button className={`${styles.button} ${styles.secondary}`} disabled={busy || !passportId} onClick={importPassport}>Carregar peças para simulação</button></div><p className={styles.muted}>Modelos sem correspondência exata precisam ser selecionados novamente.</p></section>}
      <section className={styles.panel}><h2>1. Encontre seus componentes</h2>{catalog ? <CatalogSearch categories={catalog.categorias} onChoose={choose} disabled={busy} /> : !loadError && <p role="status">Carregando catálogo…</p>}{catalog && <div className={styles.scope}><p>{catalog.total.toLocaleString('pt-BR')} registros de componentes · snapshot de {new Date(`${catalog.data_fonte}T12:00:00`).toLocaleDateString('pt-BR')}. A fonte não cobre todos os modelos ou lançamentos.</p><a href={catalog.fonte} target="_blank" rel="noreferrer">Fonte: PC Part Dataset · licença MIT ↗</a><p>Dados comunitários, sem revisão individual. Variantes podem compartilhar o nome; confira as características exibidas.</p></div>}</section>
    </div><section className={styles.panel} ref={resultPanel} aria-busy={busy}>
      <h2>2. Sua seleção</h2><form onSubmit={analyze} className={styles.form}>
        {!selection.length && <p className={styles.muted}>Adicione pelo menos duas peças. Processador, placa-mãe, fonte, gabinete e cooler: um modelo de cada; memória, vídeo e armazenamento permitem múltiplos modelos.</p>}
        <ul className={styles.checks}>{selection.map(item => <li key={item.id} className={styles.check}><strong>{item.modelo}</strong><p>{componentDetails(item)}</p><div className={styles.selectionActions}>{MULTIPLE.includes(item.tipo) && <label>Quantidade de {item.tipo === 'memoria' ? 'kits' : 'unidades'}<input type="number" min="1" max="4" required disabled={busy} value={item.quantidade} onChange={event => { clearResult(); setSelection(previous => previous.map(part => part.id === item.id ? { ...part, quantidade: event.target.value } : part)) }} /></label>}<button type="button" disabled={busy} className={`${styles.button} ${styles.secondary}`} aria-label={`Remover ${item.modelo}`} onClick={() => { clearResult(); setSelection(previous => previous.filter(part => part.id !== item.id)) }}>Remover</button></div></li>)}</ul>
        <label>BIOS instalada (opcional)<input value={bios} disabled={busy} maxLength={40} pattern="[a-zA-Z0-9. _\-]*" placeholder="Não sei / não informada" onChange={event => { clearResult(); setBios(event.target.value) }} /></label>
        <div className={styles.aiPrivacy}>Ao analisar, apenas os modelos, especificações, quantidades e BIOS informada são enviados {state?.externo ? `ao ${PROVIDERS[state.provedor] || 'provedor externo'}` : 'ao provedor configurado'}. Não inclua dados pessoais. No nível gratuito do Gemini, os dados podem ser usados para melhorar os serviços do Google.</div>
        {state && <p role="status" className={styles.muted}>{state.disponivel ? `${PROVIDERS[state.provedor]} configurado · disponibilidade sujeita à autorização e cota.` : state.mensagem}</p>}
        <button className={styles.button} disabled={busy || selection.length < 2 || !state?.disponivel}>{busy ? 'Analisando…' : 'Analisar com IA'}</button>
        {busy && <button type="button" className={`${styles.button} ${styles.secondary}`} onClick={clearResult}>Cancelar análise</button>}
        {!state?.disponivel && <button type="button" className={`${styles.button} ${styles.secondary}`} disabled={busy} onClick={() => setRetry(value => value + 1)}>Conferir disponibilidade novamente</button>}
      </form>
      {error && <div role="alert" className={styles.error}>{error}</div>}
      <div aria-live="polite">{result ? <div className={styles.aiAnswer}><div className={`${styles.result} ${styles[result.ia.status] || ''}`}><h2>{STATUS[result.ia.status]}</h2><p>{result.ia.resumo}</p></div><p className={styles.muted}>Avaliação por {PROVIDERS[result.ia.provedor]} · {new Date(result.ia.gerado_em).toLocaleString('pt-BR')}{result.ia.em_cache ? ' · resultado recente reutilizado' : ''}</p><ul className={styles.checks}>{result.ia.pontos.map((point, index) => <li key={index} className={`${styles.check} ${styles[point.status] || ''}`}><strong>{point.titulo}</strong><p>{point.explicacao}</p><p><b>Próximo passo:</b> {point.acao}</p></li>)}</ul><div className={styles.scope}>{result.limites.map(note => <p key={note}>{note}</p>)}</div></div> : <p className={styles.muted}>O resultado será produzido pela IA, sem o verificador manual anterior. A IA pode errar; confirme os modelos exatos e o suporte no fabricante antes de comprar ou montar. Não é certificação técnica.</p>}</div>
    </section></div>
  </div></div>
}
