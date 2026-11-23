import { useId } from 'react'
import specs from '../../../shared/product-specs.cjs'
import ListingModelSearch from './ListingModelSearch'

export function ProductSpecificationFields({ category, value, onChange }) {
  const id = useId()
  const fields = specs.specificationFields(category)
  if (!fields.length) return null
  return (
    <fieldset className="min-w-0 rounded-2xl border border-line p-4 sm:p-5">
      <legend className="px-2 font-bold text-foreground">Ficha técnica opcional</legend>
      <p className="mb-4 text-sm text-muted">Informe o estado, o modelo e o que acompanha o item. Os campos preenchidos aparecem no anúncio.</p>
      <ListingModelSearch key={specs.categoryKey(category)} category={specs.categoryKey(category)} fieldKeys={fields.map(([key]) => key)} onChoose={suggestions => onChange({ ...value, ...suggestions })} />
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(([key, label, example, options]) => (
          <div className="min-w-0" key={key}>
            <label className="mb-1 block text-sm font-semibold text-foreground" htmlFor={`${id}-${key}`}>{label}</label>
            {options ? <select id={`${id}-${key}`} value={value[key] || ''} onChange={event => onChange({ ...value, [key]: event.target.value })}
              className="w-full rounded-xl border border-line bg-surface-raised px-3 py-2 text-foreground">
              <option value="">Não informado</option>
              {options.map(option => <option key={option}>{option}</option>)}
            </select> : <input id={`${id}-${key}`} value={value[key] || ''} onChange={event => onChange({ ...value, [key]: event.target.value })}
              className="w-full rounded-xl border border-line bg-surface-raised px-3 py-2 text-foreground" placeholder={key === 'modelo' && ['setups', 'computadores'].includes(category) ? 'Ex.: montagem personalizada' : example} maxLength={specs.specificationLimit} />}
          </div>
        ))}
      </div>
    </fieldset>
  )
}

export function ProductSpecificationList({ product }) {
  const values = specs.readSpecifications(product.categoria, product.especificacoes)
  const fields = specs.specificationFields(product.categoria).filter(([key]) => values[key])
  if (!fields.length) return <p className="text-sm text-muted">Peça as especificações ao vendedor.</p>
  return (
    <dl className="grid gap-x-7 sm:grid-cols-2">
      {fields.map(([key, label]) => (
        <div key={key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-3 border-t border-line py-3 text-sm">
          <dt className="text-muted">{label}</dt><dd className="break-words font-semibold">{values[key]}</dd>
        </div>
      ))}
    </dl>
  )
}
