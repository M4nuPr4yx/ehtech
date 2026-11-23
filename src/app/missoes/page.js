'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { Frame, Feedback, request, price, styles } from '../complements/DifferentialsUI'
import { modalityLabel, servicePrice } from '../servicos/serviceData'
import { productCategoryLabel } from '../../lib/product-category.mjs'
import { ListingDetailLink, useCatalogDraft, useListingQuery, useListingScroll } from '../complements/ListingNavigation'

const defaults = { missao: '', orcamento: '' }

function ResultsList({ id, title, items, from }) {
  function rows(values) {
    return (
      <ul className={styles.resultList}>
        {values.map(item => (
          <li key={item.href}>
            <div><ListingDetailLink href={item.href} from={from}>{item.name}</ListingDetailLink>{item.detail && <small>{item.detail}</small>}</div>
            <strong>{item.price}</strong>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <section className={styles.card}>
      <h2>{title}</h2>
      {rows(items.slice(0, 6))}
      {items.length > 6 && <details id={id} data-listing-disclosure><summary>Ver mais {items.length - 6}</summary>{rows(items.slice(6))}</details>}
    </section>
  )
}

function Missions() {
  const { query, search, update } = useListingQuery(defaults)
  const { draft, change } = useCatalogDraft(query, search)
  const [missions, setMissions] = useState([])
  const [missionError, setMissionError] = useState('')
  const [response, setResponse] = useState(null)
  const [retry, setRetry] = useState(0)
  const requestKey = query.missao && query.orcamento ? `${search}:${retry}` : ''
  const current = requestKey && response?.key === requestKey ? response : null
  const result = current?.data
  const busy = Boolean(requestKey && !current)
  const from = search ? '/missoes?' + search : '/missoes'
  useListingScroll(Boolean(result) && !busy && missions.length > 0, search)

  useEffect(() => {
    const controller = new AbortController()
    request('/missoes', 'GET', undefined, controller.signal).then(setMissions).catch(err => { if (!controller.signal.aborted) setMissionError(err.message) })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!requestKey) return
    const controller = new AbortController()
    request('/missoes/buscar', 'POST', { missao: query.missao, orcamento: Number(query.orcamento) }, controller.signal)
      .then(data => { if (!controller.signal.aborted) setResponse({ key: requestKey, data }) })
      .catch(err => { if (!controller.signal.aborted) setResponse({ key: requestKey, error: err.message }) })
    return () => controller.abort()
  }, [query, requestKey])

  function submit(event) {
    event.preventDefault()
    if (draft.missao === query.missao && draft.orcamento === query.orcamento) setRetry(value => value + 1)
    else update(draft)
  }

  const categories = result?.opcoes.categorias.filter(group => group.produtos.length) || []
  const services = result?.opcoes.servicos || []
  const count = categories.reduce((sum, group) => sum + group.produtos.length, services.length)

  return (
    <Frame title="Buscar por objetivo" intro="Escolha o que você quer resolver e veja produtos e serviços do catálogo.">
      <section className={styles.card} aria-label="Filtros da busca">
        <form className={`${styles.form} ${styles.searchForm}`} onSubmit={submit}>
          <label>Objetivo
            <select required name="missao" disabled={busy} value={draft.missao} onChange={event => change('missao', event.target.value)}>
              <option value="">Escolha um objetivo</option>
              {missions.map(item => <option key={item.id} value={item.id}>{item.titulo}</option>)}
            </select>
          </label>
          <label>Limite por item (R$)
            <input required type="number" min="1" max="1000000" step="0.01" name="orcamento" placeholder="Ex.: 500" disabled={busy} value={draft.orcamento} onChange={event => change('orcamento', event.target.value)} />
          </label>
          <button disabled={busy || !missions.length}>{busy ? 'Buscando…' : 'Buscar opções'}</button>
        </form>
        <p className={styles.help}>O limite vale para cada produto ou serviço.</p>
        <Feedback error={current?.error || missionError} />
      </section>

      {result && count === 0 && (
        <section className={styles.card} role="status">
          <h2>Nenhuma opção nesse valor</h2>
          <p>Aumente o limite por item ou escolha outro objetivo.</p>
          <Link href="/produtos">Ver todos os produtos</Link>
        </section>
      )}
      {result && count > 0 && (
        <section aria-label="Resultados da busca">
          <div className={styles.resultHeading} role="status">
            <h2>{result.missao.titulo}</h2>
            <p>{count === 1 ? '1 opção' : `${count} opções`} até {price(result.orcamento)} por item</p>
          </div>
          <div className={styles.grid}>
            {categories.map(group => <ResultsList key={group.categoria} id={`mission-${group.categoria}`} from={from} title={productCategoryLabel(group.categoria)} items={group.produtos.map(product => ({ href: `/produtos/${product.id_produto}`, name: product.nome, price: price(product.preco) }))} />)}
            {services.length > 0 && <ResultsList id="mission-services" from={from} title="Serviços" items={services.map(service => ({ href: `/servicos/${service.slug}`, name: service.titulo, price: servicePrice(service), detail: modalityLabel(service.modalidade) }))} />}
          </div>
          <p className={styles.help}>Confirme frete, compatibilidade e valor final do serviço com o anunciante.</p>
        </section>
      )}
    </Frame>
  )
}

export default function MissionsPage() {
  return <Suspense fallback={<Frame title="Buscar por objetivo"><p role="status">Carregando busca…</p></Frame>}><Missions /></Suspense>
}
