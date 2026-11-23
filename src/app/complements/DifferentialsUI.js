'use client'
import { apiResponse } from '../../lib/api-request.js';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { modalityLabel, servicePrice } from '../servicos/serviceData'
import styles from './differentials.module.css'
import { ListingDetailLink } from './ListingNavigation'

export { styles }
export const price = value => value === null ? 'Sob consulta' : Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export async function request(path, method = 'GET', body, signal) {
  const token = localStorage.getItem('token')
  const response = await apiResponse(path, { method, signal, cache: 'no-store', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
  const data = await response.json()
  if (!response.ok) throw new Error(data.mensagem || 'Não foi possível concluir a operação.')
  return data
}
export function Frame({ title, intro, children }) {
  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.hero}><h1>{title}</h1><p>{intro}</p></header>
        {children}
      </div>
    </div>
  )
}
export function Feedback({ error, notice }) {
  return <>{error && <p role="alert" className={styles.error}>{error}</p>}{notice && <p role="status" className={styles.notice}>{notice}</p>}</>
}
const deliveryModes = [['presencial', 'Presencial'], ['remoto', 'Remoto'], ['hibrido', 'Remoto ou presencial']]
const authEvents = ['storage', 'ehtech:auth-change']
function subscribeToSession(listener) {
  authEvents.forEach(event => window.addEventListener(event, listener))
  return () => authEvents.forEach(event => window.removeEventListener(event, listener))
}
function sessionToken() { return localStorage.getItem('token') }
function userIdFromToken(token) {
  try { return Number(JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).id) }
  catch { return null }
}
export function ComboCard({ combo, from, showProductLink = true, heading: Heading = 'h2' }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const token = useSyncExternalStore(subscribeToSession, sessionToken, () => null)
  const pathname = usePathname()
  const quote = useRef(null)
  const quoteId = `orcamento-${combo.id}`
  const isOwner = userIdFromToken(token) === Number(combo.criador_id)
  useEffect(() => {
    if (token && quote.current && window.location.hash === `#${quoteId}`) {
      quote.current.open = true
      quote.current.scrollIntoView({ block: 'nearest' })
    }
  }, [quoteId, token])
  async function submit(event) {
    event.preventDefault(); setError(''); setNotice('')
    if (!localStorage.getItem('token')) { setError('Entre na sua conta para pedir orçamento.'); return }
    const values = Object.fromEntries(new FormData(event.currentTarget))
    setBusy(true)
    try {
      const data = await request('/contratacoes', 'POST', { ...values, combo_id: combo.id, servico_id: Number(combo.servico_id), urgencia: 'normal' })
      setNotice(data.mensagem)
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return (
    <article className={styles.card} id={quoteId}>
      <Heading>{combo.titulo}</Heading>
      <dl className={styles.offerPrices}>
        <div>
          <dt>Produto</dt><dd><strong>{price(combo.produto_preco)}</strong></dd>
          {showProductLink && <dd><ListingDetailLink from={from} href={`/produtos/${combo.produto_id}`}>{combo.produto_nome}</ListingDetailLink></dd>}
        </div>
        <div>
          <dt>Serviço</dt><dd><strong>{servicePrice(combo)}</strong></dd>
          <dd><ListingDetailLink from={from} href={`/servicos/${combo.servico_slug}`}>{combo.servico_titulo}</ListingDetailLink></dd>
        </div>
      </dl>
      <p className={styles.help}>{modalityLabel(combo.modalidade)}{combo.regiao && ` · ${combo.regiao}`}</p>
      <p className={styles.offerDescription}>{combo.descricao}</p>
      {isOwner ? <Link href="/contratacoes">Acompanhar pedidos da minha oferta</Link> : !token ? (
        <Link className={styles.quoteLogin} href={`/?login=1&next=${encodeURIComponent(`${pathname}#${quoteId}`)}`}>Entrar para pedir orçamento</Link>
      ) : (
      <details className={styles.quote} ref={quote}>
        <summary className={styles.button}>Pedir orçamento da instalação</summary>
        <form className={styles.form} onSubmit={submit}>
          <label>O que precisa ser instalado ou configurado?
            <textarea required name="descricao_problema" minLength={20} maxLength={2000} defaultValue={`Quero instalar ou configurar ${combo.produto_nome}.`} />
          </label>
          <label>Modalidade
            <select name="modalidade" defaultValue={combo.modalidade}>
              {deliveryModes.filter(([key]) => combo.modalidade === 'hibrido' || combo.modalidade === key)
                .map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          <label>Quando você pode ser atendido?
            <input required name="disponibilidade" minLength={5} maxLength={300} placeholder="Ex.: sábado pela manhã" />
          </label>
          <label>Limite para o serviço (opcional)
            <input name="orcamento_max" type="number" min="0" max="10000000" step="0.01" />
          </label>
          <button disabled={busy}>{busy ? 'Enviando…' : 'Enviar pedido de orçamento'}</button>
        </form>
        <Feedback error={error} notice={notice} />
        {notice && <Link href="/contratacoes">Acompanhar contratação</Link>}
      </details>
      )}
    </article>
  )
}
const installationCategories = new Set(['setups', 'computadores', 'componentes', 'processadores', 'placas-mae', 'memorias', 'placas-de-video', 'armazenamento', 'fontes', 'gabinetes', 'refrigeracao', 'redes'])

export function ProductExtras({ productId, category }) {
  const [data, setData] = useState(null), [error, setError] = useState(null)
  useEffect(() => {
    const controller = new AbortController()
    request(`/combos?produto_id=${productId}`, 'GET', undefined, controller.signal).then(combos => { setData({ combos, productId }); setError(null) }).catch(err => { if (err.name !== 'AbortError') setError({ productId, message: err.message }) })
    return () => controller.abort()
  }, [productId])
  const current = data?.productId === productId ? data : null
  const showServiceLink = installationCategories.has(category)
  if (!showServiceLink && !current?.combos.length) return null
  return (
    <section aria-labelledby="product-installation-heading">
      <div className={styles.resultHeading}>
        <h2 id="product-installation-heading">Quer ajuda para instalar?</h2>
        <p>Escolha um prestador pela região ou pela modalidade de atendimento. A compra do produto é feita à parte.</p>
        {showServiceLink && <Link href={`/servicos?categoria=${category === 'redes' ? 'redes' : 'montagem'}`} className={styles.secondaryButton}>Encontrar prestadores</Link>}
      </div>
      {error?.productId === productId && <p className={styles.help}>A oferta do anunciante está indisponível.</p>}
      {current?.combos.length > 0 && <details className={styles.card}>
        <summary>Ofertas do próprio anunciante</summary>
        <div className={styles.grid}>{current.combos.map(combo => <ComboCard key={combo.id} combo={combo} showProductLink={false} heading="h3" />)}</div>
      </details>}
    </section>
  )
}
