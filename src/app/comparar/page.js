'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import ImageWithFallback from '../complements/ImageWithFallback'
import { getMainImage } from '../complements/imageHelper'
import { apiRequest } from '../../lib/api-request'
import { comparisonGroups, comparisonIds, COMPARISON_KEY } from '../../lib/comparison.mjs'
import { productCategoryLabel } from '../../lib/product-category.mjs'
import specs from '../../../shared/product-specs.cjs'
import { ListingDetailLink, useListingQuery, useListingScroll } from '../complements/ListingNavigation'

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const fields = [
  ['Preço', product => money.format(product.preco)],
  ['Disponibilidade', product => Number(product.estoque) > 0 ? 'Em estoque' : 'Esgotado'],
  ['Origem', product => [product.origem_cidade, product.origem_uf].filter(Boolean).join('/') || 'Não informada'],
]
const panel = 'rounded-2xl border border-line bg-surface'
const button = 'inline-flex justify-center rounded-xl bg-accent-fill px-4 py-2.5 text-sm font-bold text-accent-contrast hover:brightness-110'

const defaults = { categoria: '' }

function Compare() {
  const [products, setProducts] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const { query, search, update } = useListingQuery(defaults)
  const from = search ? '/comparar?' + search : '/comparar'
  useListingScroll(!loading && !error, search)

  useEffect(() => {
    let controller
    function load() {
      controller?.abort()
      controller = new AbortController()
      const { signal } = controller
      let ids = []
      let storageError = ''
      try { ids = comparisonIds(localStorage.getItem(COMPARISON_KEY)) }
      catch { storageError = 'Não foi possível ler a comparação neste navegador.' }
      Promise.all(ids.map(async id => {
        try { return await apiRequest(`/produtos/${id}`, { signal }) }
        catch { return { id_produto: id, nome: `Anúncio #${id}` } }
      })).then(items => {
        if (signal.aborted) return
        setProducts(items)
        setError(storageError)
        setLoading(false)
      })
    }
    function storageChanged(event) { if (event.key === null || event.key === COMPARISON_KEY) load() }
    load()
    window.addEventListener('storage', storageChanged)
    window.addEventListener('comparison-change', load)
    return () => {
      controller?.abort()
      window.removeEventListener('storage', storageChanged)
      window.removeEventListener('comparison-change', load)
    }
  }, [])

  function remove(id) {
    try {
      const ids = comparisonIds(localStorage.getItem(COMPARISON_KEY))
      localStorage.setItem(COMPARISON_KEY, JSON.stringify(ids.filter(value => value !== Number(id))))
      setProducts(current => current.filter(item => Number(item.id_produto) !== Number(id)))
      window.dispatchEvent(new Event('comparison-change'))
    } catch { setError('Não foi possível remover este anúncio.') }
  }

  const groups = comparisonGroups(products)
  const activeCategory = groups.has(query.categoria) ? query.categoria : groups.keys().next().value
  const current = groups.get(activeCategory) || []
  const productSpecifications = current.map(product => specs.readSpecifications(product.categoria, product.especificacoes))
  const technicalFields = specs.specificationFields(activeCategory).filter(([key]) => productSpecifications.some(values => values[key]))
  const ready = new Set([...groups.values()].flat())
  const unavailable = products.filter(product => !ready.has(product))
  const catalog = activeCategory ? `/produtos?categoria=${encodeURIComponent(activeCategory)}` : '/produtos'

  return (
    <div className="mx-auto min-h-[55vh] max-w-6xl space-y-5 px-4 py-8 sm:px-6 sm:py-12">
      <header className={`${panel} flex flex-wrap items-end justify-between gap-4 p-5 sm:p-7`}>
        <div>
          <h1 className="text-3xl font-bold">Comparar anúncios</h1>
          <p className="mt-2 text-sm text-muted">Escolha até quatro anúncios da mesma categoria.</p>
        </div>
        <Link href={catalog} className={button}>{current.length ? 'Adicionar anúncios' : 'Escolher produtos'}</Link>
      </header>

      {error && <p className="rounded-xl border border-danger bg-danger-soft p-4 text-danger" role="alert">{error}</p>}
      {loading && <p role="status" className={`${panel} p-5`}>Carregando comparação…</p>}
      {!loading && !products.length && !error && (
        <p className={`${panel} p-5 text-muted`}>Abra um anúncio e selecione <strong className="text-foreground">Comparar anúncio</strong>.</p>
      )}

      {groups.size > 1 && (
        <div className={`${panel} flex flex-wrap items-end gap-4 p-5`}>
          <label className="grid gap-1 text-sm font-semibold">
            Categoria da comparação
            <select className="rounded-lg border border-line bg-surface-raised p-2" value={activeCategory} onChange={event => update({ categoria: event.target.value })}>
              {[...groups].map(([key, items]) => <option key={key} value={key}>{productCategoryLabel(items[0].categoria)}</option>)}
            </select>
          </label>
          <p className="text-sm text-muted">Sua lista antiga tem mais de uma categoria. Veja uma por vez.</p>
        </div>
      )}

      {current.length > 0 && (
        <section className={panel} aria-labelledby="comparison-heading">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-4 sm:px-6">
            <h2 id="comparison-heading" className="text-lg font-bold">{productCategoryLabel(current[0].categoria)}</h2>
            <p className="text-sm text-muted">{current.length === 1 ? 'Adicione outro anúncio para comparar.' : `${current.length} anúncios`}</p>
          </div>
          {technicalFields.length === 0 && <p className="border-b border-line px-4 py-3 text-sm text-muted sm:px-6">Os anúncios selecionados ainda estão sem ficha técnica.</p>}
          {current.length > 2 && <p className="px-4 pt-3 text-xs text-muted sm:hidden">Deslize a tabela para ver os outros anúncios.</p>}
          <div id="comparison-table" data-listing-scroll className="overflow-x-auto" role="region" tabIndex={0} aria-label="Tabela de comparação">
            <table className="w-full border-separate border-spacing-0 text-left text-sm">
              <caption className="sr-only">Anúncios na categoria {productCategoryLabel(current[0].categoria)}</caption>
              <thead>
                <tr>
                  <th scope="col" className="sticky left-0 z-10 w-24 bg-surface px-3 py-4 align-top sm:w-36 sm:px-6">Anúncio</th>
                  {current.map(product => (
                    <th key={product.id_produto} scope="col" className="min-w-28 border-l border-line px-2.5 py-4 align-top sm:min-w-44 sm:px-4">
                      <ListingDetailLink from={from} href={`/produtos/${product.id_produto}`} className="block space-y-2 break-words text-accent hover:underline">
                        <ImageWithFallback src={getMainImage(product.imagem)} alt="" sizes="112px" className="h-20 w-full max-w-32 rounded-lg bg-surface-raised object-contain p-1" />
                        <span className="block leading-snug">{product.nome}</span>
                      </ListingDetailLink>
                      <button type="button" className="mt-2 min-h-8 text-xs font-medium text-muted underline underline-offset-4 hover:text-foreground" aria-label={`Remover ${product.nome} da comparação`} onClick={() => remove(product.id_produto)}>Remover</button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {technicalFields.length > 0 && (
                  <tr><th scope="rowgroup" colSpan={current.length + 1} className="border-t border-line bg-surface-raised px-3 py-3 text-sm sm:px-6">Preço e entrega</th></tr>
                )}
                {fields.map(([label, read], index) => (
                  <tr key={label}>
                    <th scope="row" className={`sticky left-0 border-t border-line px-3 py-3 sm:px-6 ${index % 2 ? 'bg-surface' : 'bg-surface-raised'}`}>{label}</th>
                    {current.map(item => <td className={`border-l border-t border-line px-2.5 py-3 sm:px-4 ${index ? 'text-muted' : 'whitespace-nowrap bg-surface-raised font-bold text-foreground'}`} key={item.id_produto}>{read(item)}</td>)}
                  </tr>
                ))}
              </tbody>
              {technicalFields.length > 0 && (
                <tbody>
                  <tr><th scope="rowgroup" colSpan={current.length + 1} className="border-t border-line bg-surface-raised px-3 py-3 text-sm sm:px-6">Ficha técnica <span className="font-normal text-muted">· Informada pelos vendedores</span></th></tr>
                  {technicalFields.map(([key, label], index) => (
                    <tr key={key}>
                      <th scope="row" className={`sticky left-0 border-t border-line px-3 py-3 sm:px-6 ${index % 2 ? 'bg-surface-raised' : 'bg-surface'}`}>{label}</th>
                      {current.map((item, itemIndex) => {
                        const value = productSpecifications[itemIndex][key]
                        return <td key={item.id_produto} className={`break-words border-l border-t border-line px-2.5 py-3 sm:px-4 ${value ? 'font-medium' : 'text-muted'}`}>{value || 'Não informado'}</td>
                      })}
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
        </section>
      )}

      {unavailable.length > 0 && (
        <section className={`${panel} space-y-2 p-5`}>
          <h2 className="font-bold">Anúncios que não puderam ser comparados</h2>
          <ul>{unavailable.map(item => <li className="flex flex-wrap items-center justify-between gap-2 py-1 text-sm" key={item.id_produto}><span>{item.nome}</span><button type="button" className="min-h-8 text-accent underline" aria-label={`Remover ${item.nome} da comparação`} onClick={() => remove(item.id_produto)}>Remover</button></li>)}</ul>
        </section>
      )}
    </div>
  )
}

export default function ComparePage() {
  return <Suspense fallback={<p role="status" className="p-5">Carregando comparação…</p>}><Compare /></Suspense>
}
