'use client'

import { useId, useRef, useState } from 'react'
import styles from './compatibilidade.module.css'

const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim()

export default function ComponentCombobox({ label, items, value, onChange, placeholder, disabled = false }) {
  const id = useId()
  const input = useRef(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const selected = items.find(item => item.id === Number(value))
  const terms = normalize(selected ? '' : query).split(/\s+/).filter(Boolean)
  const matches = items.filter(item => terms.every(term => normalize(`${item.marca} ${item.modelo}`).includes(term)))
  const expanded = open && !disabled
  const activeIndex = active < matches.length ? active : -1

  function choose(item) {
    setQuery('')
    setActive(-1)
    onChange(item.id)
    input.current?.focus()
    setOpen(false)
  }
  function clear() {
    setQuery(''); setActive(-1); onChange('')
    input.current?.focus(); setOpen(true)
  }
  function keyDown(event) {
    if (event.nativeEvent.isComposing) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); setOpen(true)
      if (matches.length) setActive(event.key === 'ArrowDown' ? (activeIndex + 1) % matches.length : activeIndex <= 0 ? matches.length - 1 : activeIndex - 1)
    } else if (event.key === 'Enter' && expanded) {
      event.preventDefault()
      if (matches.length) choose(matches[activeIndex >= 0 ? activeIndex : 0])
    } else if (event.key === 'Escape') {
      event.preventDefault(); setOpen(false); setActive(-1)
    } else if (event.key === 'Tab') setOpen(false)
  }

  return <div className={styles.picker} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setActive(-1) } }}>
    <label htmlFor={id}>{label}</label>
    <div className={styles.pickerControl}>
      <input id={id} ref={input} role="combobox" autoComplete="off" disabled={disabled}
        aria-autocomplete="list" aria-expanded={expanded} aria-controls={`${id}-options`}
        aria-activedescendant={expanded && activeIndex >= 0 ? `${id}-option-${matches[activeIndex].id}` : undefined}
        aria-describedby={`${id}-help`} value={selected ? `${selected.marca} ${selected.modelo}` : query} placeholder={placeholder}
        onFocus={() => { setOpen(true); setActive(-1) }} onKeyDown={keyDown}
        onChange={event => { setQuery(event.target.value); setActive(-1); setOpen(true); if (value) onChange('') }} />
      {(selected || query) && <button type="button" className={styles.pickerClear} aria-label={`Limpar ${label.toLowerCase()}`} disabled={disabled} onMouseDown={event => event.preventDefault()} onClick={clear}>×</button>}
      <button type="button" className={styles.pickerToggle} aria-label={`${expanded ? 'Fechar' : 'Mostrar'} lista de ${label.toLowerCase()}`} disabled={disabled} onMouseDown={event => event.preventDefault()} onClick={() => { if (expanded) setOpen(false); else { input.current?.focus(); setOpen(true); setActive(-1) } }}><span aria-hidden="true">{expanded ? '▴' : '▾'}</span></button>
      {expanded && <div id={`${id}-options`} className={styles.pickerList} role="listbox" aria-label={`Modelos de ${label.toLowerCase()}`}>
      {matches.length ? matches.map((item, index) => <button type="button" role="option" tabIndex={-1} id={`${id}-option-${item.id}`} key={item.id}
        aria-selected={selected?.id === item.id} className={`${styles.pickerOption} ${activeIndex === index ? styles.pickerActive : ''}`}
        onMouseDown={event => event.preventDefault()} onPointerMove={() => setActive(index)} onClick={() => choose(item)}>
        <strong>{item.marca}</strong><span>{item.modelo}</span>{selected?.id === item.id && <span className={styles.pickerSelected}>✓ Selecionado</span>}
      </button>) : <p className={styles.pickerEmpty} role="status">Nenhum modelo encontrado. Tente outra marca ou modelo.</p>}
      </div>}
    </div>
    <small id={`${id}-help`} className={styles.pickerHelp}>{selected ? 'Modelo selecionado. Você pode digitar para trocar.' : 'Digite para filtrar ou abra a lista e selecione um modelo.'}</small>
  </div>
}
