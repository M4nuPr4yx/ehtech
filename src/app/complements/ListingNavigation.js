'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from './PendingLink'

const localOrigin = 'https://ehtech.invalid'
const listingLabels = {
  '/': 'o início',
  '/produtos': 'os produtos',
  '/servicos': 'os serviços',
  '/missoes': 'os resultados da busca',
  '/comparar': 'a comparação',
  '/favoritos': 'os favoritos',
  '/combos': 'os combos',
  '/carrinho': 'o carrinho',
  '/perfil': 'o perfil',
  '/pedidos': 'os pedidos',
  '/contratacoes': 'as contratações',
}
let lastNavigation
let pendingScroll

function relativeHref(url = window.location) {
  const search = new URLSearchParams(url.search).toString()
  return url.pathname + (search ? '?' + search : '')
}

function listingPath(value) {
  if (!value?.startsWith('/') || value.startsWith('//')) return null
  try {
    const url = new URL(value, localOrigin)
    if (url.origin !== localOrigin) return null
    const label = listingLabels[url.pathname] || (/^\/perfil\/\d+$/.test(url.pathname) ? 'o perfil do vendedor' : '')
    return label ? { href: relativeHref(url), label } : null
  } catch { return null }
}

export function replaceListingParams(values, defaults = {}) {
  const url = new URL(window.location.href)
  for (const [field, value] of Object.entries(values)) {
    if (!value || value === defaults[field]) url.searchParams.delete(field)
    else url.searchParams.set(field, value)
  }
  const href = url.pathname + url.search
  if (href !== relativeHref()) window.history.replaceState(null, '', href + url.hash)
}

export function useListingQuery(defaults) {
  const search = useSearchParams().toString()
  const query = useMemo(() => {
    const params = new URLSearchParams(search)
    return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => {
      const value = params.get(key)
      if (key === 'page') {
        const page = Number(value)
        return [key, Number.isSafeInteger(page) && page > 0 ? Math.min(100000, page) : fallback]
      }
      return [key, value || fallback]
    }))
  }, [search, defaults])
  const update = useCallback(values => replaceListingParams(values, defaults), [defaults])
  return { query, search, update }
}

export function useCatalogDraft(applied, search) {
  const [editing, setEditing] = useState(null)
  const draft = editing?.search === search ? editing.values : applied
  function change(field, value) {
    setEditing(current => ({
      search,
      values: { ...(current?.search === search ? current.values : applied), [field]: value },
    }))
  }
  return { draft, change, reset: () => setEditing(null) }
}

export function ListingDetailLink({ href, from, ...props }) {
  if (!from) return <Link {...props} href={href} />
  const params = new URLSearchParams({ voltar: from })
  const destination = href + '?' + params
  return <Link {...props} href={destination} onNavigate={() => {
    const source = relativeHref()
    if (from !== source) return
    const snapshot = {
      source,
      y: window.scrollY,
      disclosures: [...document.querySelectorAll('details[data-listing-disclosure]')].map(detail => [detail.id, detail.open]),
      horizontal: [...document.querySelectorAll('[data-listing-scroll]')].map(region => [region.id, region.scrollLeft]),
      recordedAt: performance.now(),
    }
    // The outgoing history entry is also available when the browser's Back button is used.
    window.history.replaceState({ ...window.history.state, ehtechListing: snapshot }, '', window.location.href)
    lastNavigation = { destination, snapshot }
  }} />
}

function ReturnLink({ fallback, fallbackLabel, className }) {
  const params = useSearchParams()
  const source = listingPath(params.get('voltar'))
  if (!source) return <Link href={fallback} className={className}>{fallbackLabel}</Link>
  return <Link href={source.href} className={className} onNavigate={event => {
    if (lastNavigation?.destination !== relativeHref() || lastNavigation.snapshot.source !== source.href) return
    const { navigation } = window
    const previous = navigation?.entries()[navigation.currentEntry?.index - 1]
    const previousUrl = previous?.url ? new URL(previous.url) : null
    if (previousUrl?.origin === window.location.origin && relativeHref(previousUrl) === source.href) {
      event.preventDefault()
      window.history.back()
    } else {
      pendingScroll = lastNavigation.snapshot
    }
  }}>Voltar para {source.label}</Link>
}

export function ListingBackLink({ fallback, fallbackLabel, className }) {
  return <Suspense fallback={<Link href={fallback} className={className}>{fallbackLabel}</Link>}>
    <ReturnLink fallback={fallback} fallbackLabel={fallbackLabel} className={className} />
  </Suspense>
}

export function useListingScroll(ready, view) {
  const restored = useRef()
  useEffect(() => {
    if (!ready) return
    const href = relativeHref()
    const snapshot = pendingScroll?.source === href ? pendingScroll : window.history.state?.ehtechListing
    if (snapshot?.source !== href || restored.current === snapshot.recordedAt) return
    // Wait for the loaded list and its disclosures to take up their final space.
    const frame = requestAnimationFrame(() => {
      if (relativeHref() !== href) return
      restored.current = snapshot.recordedAt
      if (snapshot === pendingScroll) pendingScroll = undefined
      for (const [id, open] of snapshot.disclosures) {
        const detail = document.getElementById(id)
        if (detail instanceof HTMLDetailsElement) detail.open = open
      }
      for (const [id, left] of snapshot.horizontal) {
        document.getElementById(id)?.scrollTo({ left, behavior: 'instant' })
      }
      window.scrollTo({ top: snapshot.y, behavior: 'instant' })
    })
    return () => cancelAnimationFrame(frame)
  }, [ready, view])
}
