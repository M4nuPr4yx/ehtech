'use client'
import { apiResponse } from '../../lib/api-request.js';


import { useEffect, useState } from 'react'

export function useTechnicalCatalog() {
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const response = await apiResponse('/componentes', { signal: controller.signal })
        const data = await response.json()
        if (!response.ok) throw new Error(data.mensagem || 'Catálogo técnico indisponível.')
        setItems(data.items)
      } catch (err) { if (err.name !== 'AbortError') setError(err.message) }
      finally { if (!controller.signal.aborted) setLoading(false) }
    }
    load()
    return () => controller.abort()
  }, [])
  return { items, error, loading }
}

function ReviewedModels({ value, onChange }) {
  const { items, error, loading } = useTechnicalCatalog()
  return <div className="space-y-2">
    <label className="block text-sm font-semibold text-foreground">Ficha de compatibilidade revisada
      <select value={value || ''} onChange={event => onChange(event.target.value ? Number(event.target.value) : null)} className="mt-2 w-full rounded-xl border border-line bg-surface p-3 text-foreground">
        <option value="">{loading ? 'Carregando modelos…' : 'Sem associação técnica'}</option>
        {value && !items.some(item => item.id === Number(value)) && <option value={value}>Modelo #{value} indisponível para novas verificações</option>}
        {items.map(item => <option key={item.id} value={item.id}>{item.marca} {item.modelo}</option>)}
      </select>
    </label>
    <p className="text-sm text-muted">Vincule somente se o anúncio for deste modelo exato. O vínculo serve para consultar os dados de compatibilidade do componente.</p>
    {error && <p className="text-xs text-warning" role="status">{error} Você pode continuar sem associar um modelo.</p>}
  </div>
}

export default function TechnicalComponentPicker({ category, value, onChange }) {
  const [open, setOpen] = useState(false)
  if (!category && !value) return null
  return <details className="rounded-xl border border-line p-4" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className="cursor-pointer text-sm font-semibold text-muted">{value ? 'Gerenciar ficha de compatibilidade vinculada' : 'Vincular ficha de compatibilidade revisada'}</summary>
    {open && <div className="mt-3"><ReviewedModels value={value} onChange={onChange} /></div>}
  </details>
}
