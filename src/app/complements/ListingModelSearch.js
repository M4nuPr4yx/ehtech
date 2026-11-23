'use client'

import { useEffect, useRef, useState } from 'react'
import { apiRequest } from '../../lib/api-request'
import specs from '../../../shared/product-specs.cjs'
import CatalogSearch from '../compatibilidade/CatalogSearch'

const partCategories = {
  processadores: 'processador', 'placas-mae': 'placa_mae', memorias: 'memoria',
  'placas-de-video': 'placa_video', armazenamento: 'armazenamento', fontes: 'fonte',
  gabinetes: 'gabinete', refrigeracao: 'cooler',
}
const computerFields = { processador: 'processador', memoria: 'memoria_ram', placa_video: 'placa_video', armazenamento: 'armazenamento' }

function suggestions(item) {
  const data = item.especificacoes
  return {
    socket: data.socket,
    nucleos: data.core_count && String(data.core_count),
    formato: data.form_factor,
    interface: data.interface,
    capacidade: data.modules ? `${data.modules[0]} × ${data.modules[1]} GB` : data.capacity && `${data.capacity} GB`,
    tipo_memoria: data.speed && `DDR${data.speed[0]}`,
    frequencia: data.speed && `${data.speed[1]} MT/s`,
    vram: data.memory && `${data.memory} GB`,
    potencia: data.wattage && `${data.wattage} W`,
  }
}

export default function ListingModelSearch({ category, fieldKeys, onChoose }) {
  const [open, setOpen] = useState(false)
  const [catalog, setCatalog] = useState(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [selection, setSelection] = useState('')
  const toggle = useRef(null)
  const partType = Object.hasOwn(partCategories, category) ? partCategories[category] : null
  const isComputer = ['setups', 'computadores', 'notebooks'].includes(category)
  const enabled = partType || isComputer || category === 'componentes'

  useEffect(() => {
    if (!open || !enabled || catalog) return
    const controller = new AbortController()
    apiRequest('/componentes/catalogo/status', { signal: controller.signal }).then(setCatalog).catch(failure => {
      if (!controller.signal.aborted) setError(failure.message)
    })
    return () => controller.abort()
  }, [attempt, catalog, enabled, open])

  if (!enabled) return null
  const types = catalog?.categorias.filter(({ tipo }) => {
    if (isComputer) return fieldKeys.includes(computerFields[tipo])
    return !partType || tipo === partType
  })

  function choose(item) {
    const values = suggestions(item)
    const field = isComputer ? computerFields[item.tipo] : 'modelo'
    const variant = isComputer && ['memoria', 'armazenamento'].includes(item.tipo) ? values.capacidade : null
    const label = [item.modelo, variant].filter(Boolean).join(' · ')
    const attributes = isComputer ? {} : Object.fromEntries(Object.entries(values).filter(([key, value]) => value && fieldKeys.includes(key)))
    onChoose({ ...attributes, [field]: label.slice(0, specs.specificationLimit) })
    setSelection(`Ficha atualizada com ${item.modelo}.`)
    setOpen(false)
    toggle.current?.focus()
  }

  return <div className="mb-4 space-y-3 rounded-xl border border-line bg-surface-raised p-4">
    <button ref={toggle} type="button" aria-expanded={open} onClick={() => { setError(''); setOpen(!open) }} className="font-semibold text-accent underline underline-offset-4">{open ? 'Fechar busca' : 'Buscar modelo no catálogo técnico'}</button>
    {selection && <p role="status" className="text-sm text-muted">{selection}</p>}
    {open && <>
      <p className="text-sm text-muted">Selecione o modelo exato para preencher a ficha. Confira os dados da variante antes de publicar.</p>
      {error && <p role="alert" className="text-sm text-warning">Busca indisponível. Preencha a ficha manualmente ou <button type="button" className="underline" onClick={() => { setError(''); setAttempt(attempt + 1) }}>tente novamente</button>.</p>}
      {!error && !catalog && <p role="status" className="text-sm text-muted">Carregando catálogo…</p>}
      {types?.length > 0 && <CatalogSearch categories={types} chooseLabel="preencher a ficha" onChoose={choose} />}
      {catalog && <a href={catalog.fonte} target="_blank" rel="noreferrer" className="text-sm text-muted underline">PC Part Dataset · dados comunitários</a>}
    </>}
  </div>
}
