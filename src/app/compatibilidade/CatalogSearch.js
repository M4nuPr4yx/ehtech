'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { apiRequest } from '../../lib/api-request'
import styles from './compatibilidade.module.css'

export function componentDetails(item) {
  const spec = item.especificacoes
  return [spec.socket, spec.speed && `DDR${spec.speed[0]} · ${spec.speed[1]} MHz`, spec.modules && `${spec.modules[0]} × ${spec.modules[1]} GB`, spec.capacity && `${spec.capacity} GB`, spec.wattage && `${spec.wattage} W`, spec.form_factor, spec.type, spec.color, spec.core_count && `${spec.core_count} núcleos`, spec.core_clock && `${spec.core_clock} GHz`, spec.memory && `${spec.memory} GB VRAM`].filter(Boolean).join(' · ')
}

export default function CatalogSearch({ categories, onChoose, disabled }) {
  const id = useId(), input = useRef(null)
  const [tipo, setType] = useState('processador')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [active, setActive] = useState(-1)
  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const response = await apiRequest(`/componentes/catalogo?${new URLSearchParams({ tipo, busca: query, pagina: String(page) })}`, { signal: controller.signal })
        if (!controller.signal.aborted) { setData(response); setLoading(false) }
      } catch (failure) { if (!controller.signal.aborted) { setError(failure.message); setLoading(false) } }
    }, 250)
    return () => { clearTimeout(timer); controller.abort() }
  }, [tipo, query, page, retry])
  const items = loading || error ? [] : data?.items || []
  function reset() { setLoading(true); setError(''); setData(null); setActive(-1) }
  function choose(item) { onChoose(item); input.current?.focus() }
  function keys(event) {
    if (event.nativeEvent.isComposing) return
    if (['ArrowDown', 'ArrowUp'].includes(event.key) && items.length) {
      event.preventDefault()
      setActive(previous => event.key === 'ArrowDown' ? (previous + 1) % items.length : previous <= 0 ? items.length - 1 : previous - 1)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (active >= 0 && items[active]) choose(items[active])
    } else if (event.key === 'Escape') setActive(-1)
  }
  useEffect(() => { if (active >= 0) document.getElementById(`${id}-${active}`)?.scrollIntoView({ block: 'nearest' }) }, [active, id])
  return <div className={styles.form}>
    <label>Categoria<select value={tipo} disabled={disabled} onChange={event => { reset(); setType(event.target.value); setQuery(''); setPage(1) }}>{categories.map(item => <option value={item.tipo} key={item.tipo}>{item.nome} ({item.total.toLocaleString('pt-BR')})</option>)}</select></label>
    <label htmlFor={id}>Buscar modelo</label>
    <input id={id} ref={input} role="combobox" aria-autocomplete="list" aria-expanded={items.length > 0} aria-controls={`${id}-list`} aria-activedescendant={active >= 0 && items[active] ? `${id}-${active}` : undefined} autoComplete="off" maxLength={100} placeholder="Ex.: Intel Core i5, Ryzen, ASUS B650…" disabled={disabled} value={query} onKeyDown={keys} onChange={event => { reset(); setQuery(event.target.value); setPage(1) }} />
    {loading && <p role="status" className={styles.muted}>Buscando componentes…</p>}
    {error && <div role="alert" className={styles.error}>{error}<button type="button" className={styles.button} onClick={() => { reset(); setRetry(value => value + 1) }}>Tentar novamente</button></div>}
    {!loading && !error && <p role="status" className={styles.muted}>{data?.total.toLocaleString('pt-BR')} resultado(s). Selecione para adicionar. Use as setas e Enter pelo teclado.</p>}
    <div id={`${id}-list`} role="listbox" aria-label="Componentes encontrados" className={styles.catalogResults}>
      {items.map((item, index) => <button id={`${id}-${index}`} type="button" role="option" aria-selected={active === index} disabled={disabled} className={`${styles.pickerOption} ${active === index ? styles.catalogActive : ''}`} key={item.id} onClick={() => choose(item)}><strong>{item.modelo}</strong><span>{componentDetails(item) || 'Especificações parciais; confira o modelo exato.'}</span></button>)}
    </div>
    {!loading && !error && data?.total === 0 && <p className={styles.muted}>Nenhum modelo encontrado. Tente outro termo; o catálogo não cobre todos os lançamentos.</p>}
    <div className={styles.actions}><button type="button" className={`${styles.button} ${styles.secondary}`} disabled={disabled || loading || page === 1} onClick={() => { reset(); setPage(value => value - 1) }}>Anterior</button><span className={styles.muted}>Página {page}</span><button type="button" className={`${styles.button} ${styles.secondary}`} disabled={disabled || loading || !data?.mais} onClick={() => { reset(); setPage(value => value + 1) }}>Próxima</button></div>
  </div>
}
