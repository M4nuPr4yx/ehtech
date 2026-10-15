'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { getApiUrl } from '../../lib/api'
import { useTechnicalCatalog } from '../complements/TechnicalComponentPicker'
import ComponentCombobox from './ComponentCombobox'
import CompatibilityAI from './CompatibilityAI'
import styles from './compatibilidade.module.css'

const LABELS = { processador: 'Processador', placa_mae: 'Placa-mãe', memoria: 'Memória' }
const STATUS = {
  compativel: { title: 'Compatível nos requisitos verificados', icon: '✓' },
  incompativel: { title: 'Encontramos incompatibilidades', icon: '×' },
  condicional: { title: 'Confira as condições antes de montar', icon: '!' },
  nao_verificado: { title: 'Faltam informações para concluir', icon: '?' }
}
const empty = { processador_id: '', placa_mae_id: '', bios: '', memorias: [{ componente_id: '', quantidade: 1 }] }

export default function CompatibilityPage() {
  const { items, loading, error: catalogError } = useTechnicalCatalog()
  const [selection, setSelection] = useState(empty)
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [passports, setPassports] = useState([])
  const [passportId, setPassportId] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const [passportError, setPassportError] = useState('')
  const [importRevision, setImportRevision] = useState(0)
  const checkRequest = useRef(null)
  const board = items.find(item => item.id === Number(selection.placa_mae_id))

  useEffect(() => {
    const token = localStorage.getItem('token')
    setLoggedIn(Boolean(token))
    if (!token) return
    const controller = new AbortController()
    async function load() {
      try {
        const response = await fetch(getApiUrl('/passaportes'), { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal, cache: 'no-store' })
        const data = await response.json()
        if (!response.ok) throw new Error(data.mensagem || 'Não foi possível carregar seus equipamentos.')
        setPassports(data)
      } catch (err) { if (err.name !== 'AbortError') setPassportError(err.message) }
    }
    load()
    return () => controller.abort()
  }, [])
  useEffect(() => () => checkRequest.current?.abort(), [])
  function change(next) { checkRequest.current?.abort(); setBusy(false); setSelection(next); setResult(null); setError(''); setNotice('') }
  function choose(type, value) {
    change({ ...selection, [type === 'processador' ? 'processador_id' : 'placa_mae_id']: value, ...(type === 'placa_mae' ? { bios: '' } : {}) })
  }
  function importPassport() {
    const passport = passports.find(item => item.id === Number(passportId))
    if (!passport) return
    const components = passport.componentes.map(item => ({ ...item, reference: items.find(model => model.id === item.componente_id) }))
    const cpus = components.filter(item => item.reference?.tipo === 'processador')
    const boards = components.filter(item => item.reference?.tipo === 'placa_mae')
    const ram = components.filter(item => item.reference?.tipo === 'memoria')
    const unknown = components.filter(item => !item.reference).length
    if (cpus.length > 1 || boards.length > 1 || ram.length > 4 || new Set(ram.map(item => item.componente_id)).size !== ram.length) {
      setError('Este passaporte tem peças repetidas ou mais de um conjunto. Selecione manualmente o conjunto que deseja verificar.'); return
    }
    change({ processador_id: cpus[0]?.componente_id || '', placa_mae_id: boards[0]?.componente_id || '', bios: '', memorias: ram.length ? ram.map(item => ({ componente_id: item.componente_id, quantidade: item.quantidade || 1 })) : empty.memorias })
    setImportRevision(value => value + 1)
    setNotice(`Peças identificadas carregadas de “${passport.nome}”.${unknown ? ` ${unknown} registro(s) sem associação técnica precisam ser identificados manualmente.` : ''} A simulação não altera o passaporte. Confirme a BIOS instalada.`)
  }
  async function check(event) {
    checkRequest.current?.abort()
    const controller = new AbortController()
    checkRequest.current = controller
    event.preventDefault(); setBusy(true); setError(''); setResult(null)
    try {
      const response = await fetch(getApiUrl('/componentes/verificar'), { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...selection, processador_id: selection.processador_id || null, placa_mae_id: selection.placa_mae_id || null, memorias: selection.memorias.filter(item => item.componente_id) }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.mensagem || 'Não foi possível verificar as peças.')
      if (!controller.signal.aborted) setResult(data)
    } catch (err) { if (!controller.signal.aborted) setError(err.message) } finally { if (!controller.signal.aborted) setBusy(false) }
  }

  return <div className={styles.page}><div className={styles.shell}>
    <section className={styles.hero}>
      <span className={styles.eyebrow}>EHtech · Escolha com informação</span>
      <h1>Estas peças combinam?</h1>
      <p>Confira processador, placa-mãe e memória antes de montar ou fazer um upgrade. Cada resultado explica os requisitos e mostra as fontes utilizadas.</p>
      <div className={styles.actions}><Link href="/passaportes">Meus equipamentos →</Link><Link href="/produtos">Explorar anúncios →</Link></div>
    </section>
    {(error || catalogError) && <div role="alert" className={styles.error}>{error || catalogError}</div>}
    {notice && <div role="status" className={styles.notice}>{notice}</div>}
    <div className={styles.layout}>
      <div>
        {loggedIn && <section className={styles.panel}>
          <h2>Usar meu equipamento</h2>
          {passportError ? <p role="status" className={styles.muted}>{passportError}</p> : <div className={styles.form}>
            <label>Equipamento<select value={passportId} onChange={event => setPassportId(event.target.value)}><option value="">Selecione um passaporte</option>{passports.map(item => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label>
            <button className={`${styles.button} ${styles.secondary}`} disabled={busy || !passportId || loading} onClick={importPassport}>Carregar peças para simulação</button>
          </div>}
          <p className={styles.muted}>Peças anotadas somente pelo nome precisam ser associadas ao catálogo em Meus Equipamentos.</p>
        </section>}
        <section className={styles.panel}>
          <h2>Escolha suas peças</h2>
          {loading ? <p role="status">Carregando fichas técnicas…</p> : <form onSubmit={check} className={styles.form}>
            <fieldset disabled={busy} className={styles.form}>
              {['processador', 'placa_mae'].map(type => <ComponentCombobox key={`${type}-${importRevision}`} label={LABELS[type]} items={items.filter(item => item.tipo === type)} value={selection[type === 'processador' ? 'processador_id' : 'placa_mae_id']} onChange={value => choose(type, value)} disabled={busy} placeholder={type === 'processador' ? 'Digite AMD, Ryzen ou o modelo…' : 'Digite ASUS, B550 ou o modelo…'} />)}
              <label>BIOS instalada na placa-mãe<select value={selection.bios} onChange={event => change({ ...selection, bios: event.target.value })} disabled={!board}>
                <option value="">Não sei / não informada</option>{board?.especificacoes.bios_versoes?.map(version => <option key={version}>{version}</option>)}
              </select></label>
              <p className={styles.muted}>Selecione a versão que você conferiu no equipamento. Se sua versão não estiver na lista, deixe sem informação.</p>
              {selection.memorias.map((memory, index) => <div className={styles.memory} key={index}>
                <ComponentCombobox key={`${index}-${importRevision}`} label={`Kit de memória ${index + 1}`} items={items.filter(item => item.tipo === 'memoria')} value={memory.componente_id} disabled={busy} placeholder="Digite Kingston ou o código do kit…" onChange={value => change({ ...selection, memorias: selection.memorias.map((item, i) => i === index ? { ...item, componente_id: value } : item) })} />
                <label>Kits<input type="number" min="1" max="4" required value={memory.quantidade} onChange={event => change({ ...selection, memorias: selection.memorias.map((item, i) => i === index ? { ...item, quantidade: event.target.value } : item) })} /></label>
                <button type="button" className={`${styles.button} ${styles.secondary}`} aria-label={`Remover kit ${index + 1}`} onClick={() => change({ ...selection, memorias: selection.memorias.filter((_, i) => i !== index) })}>Remover</button>
              </div>)}
              <button type="button" className={`${styles.button} ${styles.secondary}`} disabled={selection.memorias.length >= 4} onClick={() => change({ ...selection, memorias: [...selection.memorias, { componente_id: '', quantidade: 1 }] })}>+ Outro modelo de memória</button>
              <p className={styles.muted}>Um kit pode conter vários módulos. A capacidade e os slots são calculados a partir da ficha de cada kit.</p>
              <button className={styles.button}>{busy ? 'Verificando…' : 'Verificar compatibilidade'}</button>
            </fieldset>
          </form>}
        </section>
      </div>
      <section className={styles.panel} aria-live="polite">
        {result ? <>
          <div className={`${styles.result} ${styles[result.status] || ''}`}><h2>{STATUS[result.status].icon} {STATUS[result.status].title}</h2><p>{result.memoria_total_gb !== null && `${result.memoria_total_gb} GB de memória · `}{result.modulos_total !== null && `${result.modulos_total} módulo(s) · `}Análise feita em {new Date(result.verificado_em).toLocaleString('pt-BR')}</p></div>
          <CompatibilityAI key={JSON.stringify(result.selecao)} result={result} onAnalysis={setResult} />
          <ul className={styles.checks}>{result.verificacoes.map(item => <li key={item.codigo} className={`${styles.check} ${styles[item.status] || ''}`}>
            <strong>{STATUS[item.status].icon} {item.titulo}</strong><p>{item.mensagem}</p>
            <div className={styles.sources}>{item.fontes.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.titulo} ↗</a>)}</div>
          </li>)}</ul>
          <h3>Fichas utilizadas</h3>
          {result.componentes.map(item => <p className={styles.muted} key={item.id}>{item.marca} {item.modelo} · revisão {item.revisao} · {new Date(item.revisado_em).toLocaleDateString('pt-BR')}</p>)}
          <div className={styles.scope}>{result.observacoes.map(note => <p key={note}>{note}</p>)}{result.limites.map(note => <p key={note}>{note}</p>)}</div>
        </> : <>
          <h2>Veja o resultado</h2><p className={styles.muted}>Selecione as peças e clique em verificar. Se houver uma informação ausente, a análise indicará o que precisa ser confirmado.</p>
          <h3>O que esta versão confere</h3><ul className={styles.checks}>
            <li className={styles.check}>Encaixe e suporte do processador na placa-mãe.</li><li className={styles.check}>Versão mínima de BIOS.</li><li className={styles.check}>Geração e formato da memória.</li><li className={styles.check}>Quantidade de slots e capacidade total.</li>
          </ul><div className={styles.scope}><p>O catálogo começa com modelos AM4 e AM5 revisados. Modelos ausentes precisam de uma ficha técnica antes de serem verificados.</p><p>A análise cobre esses requisitos básicos. Não certifica um PC completo nem garante velocidades XMP/EXPO.</p></div>
        </>}
      </section>
    </div>
  </div></div>
}
