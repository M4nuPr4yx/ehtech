'use client'

import { useEffect, useState } from 'react'
import { getApiUrl } from '../../lib/api'

export function useTechnicalCatalog() {
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const response = await fetch(getApiUrl('/componentes'), { signal: controller.signal })
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

export default function TechnicalComponentPicker({ value, onChange }) {
  const { items, error, loading } = useTechnicalCatalog()
  return <div className="space-y-2">
    <label className="block text-sm font-semibold text-foreground">Modelo no catálogo técnico (opcional)
      <select value={value || ''} onChange={event => onChange(event.target.value ? Number(event.target.value) : null)} className="mt-2 w-full rounded-xl border border-line bg-surface p-3 text-foreground">
        <option value="">{loading ? 'Carregando modelos…' : 'Sem associação técnica'}</option>
        {value && !items.some(item => item.id === Number(value)) && <option value={value}>Modelo #{value} indisponível para novas verificações</option>}
        {items.map(item => <option key={item.id} value={item.id}>{item.marca} {item.modelo}</option>)}
      </select>
    </label>
    <p className="text-xs text-muted">Selecione somente se o anúncio for deste modelo exato. A ficha técnica será usada nas verificações; ela não certifica o estado do item anunciado.</p>
    {error && <p className="text-xs text-warning" role="status">{error} Você pode continuar sem associar um modelo.</p>}
  </div>
}
