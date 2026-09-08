'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import ServiceIcon from './ServiceIcon'
import { MODALITIES, SERVICE_CATEGORIES, categoryLabel, modalityLabel, servicePrice } from './serviceData'
import styles from './servicos.module.css'

const PAGE_SIZE = 9
const INITIAL = { search: '', categoria: '', modalidade: '', ordenacao: 'recentes' }

function Skeletons() {
  return <div className={styles.grid} aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <div className={styles.skeleton} key={index}><span /><i /><i /></div>)}</div>
}

function ServiceCatalog({ initial }) {
  const [draft, setDraft] = useState(initial)
  const [query, setQuery] = useState({ ...initial, page: 1 })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const resultsRef = useRef(null)
  const appliedFilters = { search: query.search, categoria: query.categoria, modalidade: query.modalidade, ordenacao: query.ordenacao }
  const pending = JSON.stringify(draft) !== JSON.stringify(appliedFilters)

  useEffect(() => {
    if (!pending) return
    const timer = setTimeout(() => setQuery({ ...draft, page: 1 }), 300)
    return () => clearTimeout(timer)
  }, [draft, pending])

  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15000)
    let active = true
    const params = new URLSearchParams({ ...query, limit: String(PAGE_SIZE) })
    async function load() {
      setLoading(true)
      setError('')
      try {
        const response = await fetch(`/api/servicos?${params}`, { signal: controller.signal })
        const data = await response.json()
        if (!response.ok || !Array.isArray(data.items)) throw new Error(data.mensagem || 'Não foi possível carregar os serviços.')
        if (active) setResult(data)
      } catch (requestError) {
        if (active) setError(requestError.name === 'AbortError' ? 'A busca demorou mais que o esperado.' : requestError.message)
      } finally {
        clearTimeout(timer)
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false; clearTimeout(timer); controller.abort() }
  }, [query, retry])

  function change(field, value) {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  function changePage(page) {
    setQuery((current) => ({ ...current, page }))
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function clearFilters() {
    setDraft(INITIAL)
    setQuery({ ...INITIAL, page: 1 })
  }

  const busy = loading || pending
  const hasFilters = draft.search || draft.categoria || draft.modalidade

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.shell}>
          <div className={styles.breadcrumb}><Link href="/">Início</Link><span>/</span><span>Serviços</span></div>
          <div className={styles.heroGrid}>
            <div>
              <span className={styles.eyebrow}>ESPECIALISTAS EM TECNOLOGIA</span>
              <h1>Soluções de TI,<br /><em>sem complicação.</em></h1>
              <p>Encontre profissionais para montar, configurar, proteger e melhorar seus equipamentos.</p>
            </div>
            <div className={styles.heroPanel}>
              <div><strong>Atendimento direto</strong><span>Converse com o profissional pelo chat</span></div>
              <div><strong>Orçamento transparente</strong><span>Alinhe escopo, prazo e valor antes de começar</span></div>
              <div><strong>Local ou remoto</strong><span>Escolha a modalidade ideal para você</span></div>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.shell}>
        <section className={styles.searchPanel} aria-label="Filtros de serviços">
          <label className={styles.search}>
            <span>Buscar serviço</span>
            <div><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 21-4.5-4.5M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0Z" /></svg><input type="search" maxLength={100} placeholder="Ex.: montagem de PC, Wi-Fi, formatação..." value={draft.search} onChange={(event) => change('search', event.target.value)} /></div>
          </label>
          <label><span>Categoria</span><select value={draft.categoria} onChange={(event) => change('categoria', event.target.value)}>{SERVICE_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label><span>Modalidade</span><select value={draft.modalidade} onChange={(event) => change('modalidade', event.target.value)}>{MODALITIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label><span>Ordenar</span><select value={draft.ordenacao} onChange={(event) => change('ordenacao', event.target.value)}><option value="recentes">Mais recentes</option><option value="menor-preco">Menor preço</option><option value="maior-preco">Maior preço</option></select></label>
        </section>

        <nav className={styles.chips} aria-label="Categorias de serviços">
          {SERVICE_CATEGORIES.map(([value, label]) => <button key={value} type="button" aria-pressed={draft.categoria === value} onClick={() => change('categoria', value)}>{label}</button>)}
        </nav>

        <section className={styles.results} ref={resultsRef}>
          <div className={styles.heading}>
            <div><span>CATÁLOGO PROFISSIONAL</span><h2>{draft.categoria ? categoryLabel(draft.categoria) : 'Serviços para cada desafio'}</h2><p role="status">{busy ? 'Atualizando resultados…' : result ? `${result.total} serviços encontrados` : 'Carregando serviços…'}</p></div>
            {hasFilters && <button type="button" onClick={clearFilters}>Limpar filtros</button>}
          </div>

          {error && <div className={styles.error} role="alert"><p>{error}</p><button type="button" onClick={() => setRetry((value) => value + 1)}>Tentar novamente</button></div>}
          {!result && loading ? <Skeletons /> : result?.items?.length ? (
            <div className={styles.grid} data-updating={busy}>
              {result.items.map((service) => (
                <Link href={`/servicos/${service.slug}`} prefetch={false} className={styles.card} key={service.id_servico}>
                  <div className={styles.cardTop}>
                    <span className={styles.icon}><ServiceIcon category={service.categoria} /></span>
                    <span className={styles.mode}>{modalityLabel(service.modalidade)}</span>
                  </div>
                  <span className={styles.category}>{categoryLabel(service.categoria)}</span>
                  <h3>{service.titulo}</h3>
                  <p className={styles.description}>{service.descricao}</p>
                  <div className={styles.meta}><span>Prazo estimado</span><strong>{service.prazo}</strong></div>
                  <div className={styles.cardBottom}><div><span>Investimento</span><strong>{servicePrice(service)}</strong></div><i aria-hidden="true">→</i></div>
                </Link>
              ))}
            </div>
          ) : !loading && !error ? <div className={styles.empty}><ServiceIcon category="suporte" size={38} /><h3>Nenhum serviço encontrado</h3><p>Tente outros termos ou remova os filtros.</p><button type="button" onClick={clearFilters}>Ver todos</button></div> : null}

          {result?.totalPages > 1 && <div className={styles.pagination}><span>Página {result.page} de {result.totalPages}</span><div><button disabled={busy || result.page <= 1} onClick={() => changePage(result.page - 1)}>← Anterior</button><button disabled={busy || result.page >= result.totalPages} onClick={() => changePage(result.page + 1)}>Próxima →</button></div></div>}
        </section>
      </div>
    </div>
  )
}

function CatalogFromUrl() {
  const params = useSearchParams()
  const initial = { ...INITIAL, search: params.get('search') || '', categoria: params.get('categoria') || '' }
  return <ServiceCatalog key={JSON.stringify(initial)} initial={initial} />
}

export default function ServicesPage() {
  return <Suspense fallback={<div className={styles.page}><div className={styles.shell}><Skeletons /></div></div>}><CatalogFromUrl /></Suspense>
}
