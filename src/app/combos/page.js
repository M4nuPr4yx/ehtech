'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useListingScroll } from '../complements/ListingNavigation'
import { ComboCard, Frame, Feedback, request, styles } from '../complements/DifferentialsUI'

export default function CombosPage() {
  const [combos, setCombos] = useState([]), [own, setOwn] = useState([]), [options, setOptions] = useState(null), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState(''), [notice, setNotice] = useState('')
  useListingScroll(!loading)
  async function load(signal) {
    const catalog = await request('/combos', 'GET', undefined, signal)
    setCombos(catalog)
    if (localStorage.getItem('token')) {
      const [items, choices] = await Promise.all([request('/combos/meus', 'GET', undefined, signal), request('/combos/opcoes', 'GET', undefined, signal)])
      setOwn(items); setOptions(choices)
    }
  }
  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal).catch(err => { if (err.name !== 'AbortError') setError(err.message) }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])
  async function run(job) {
    setBusy(true); setError(''); setNotice('')
    try { const data = await job(); setNotice(data.mensagem); await load() } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  function submit(event) {
    event.preventDefault()
    const form = event.currentTarget, data = Object.fromEntries(new FormData(form))
    run(async () => { const result = await request('/combos', 'POST', data); form.reset(); return result })
  }
  return (
    <Frame title="Produto + instalação" intro="Compre um produto e, se precisar, contrate a instalação com o mesmo anunciante.">
      <section className={styles.purchaseSteps} aria-label="Como comprar e contratar">
        <div><strong>Comprar o produto</strong><p>Abra o anúncio para ver o produto e combinar a compra.</p></div>
        <div><strong>Contratar a instalação</strong><p>Peça orçamento e aceite a proposta em Minhas contratações.</p></div>
      </section>

      <Feedback error={error} notice={notice} />
      {loading ? <p role="status">Carregando ofertas…</p> : (
        <>
          {combos.length > 0 && <div className={styles.grid}>{combos.map(combo => <ComboCard key={combo.id} combo={combo} from="/combos" />)}</div>}
          {!combos.length && !error && (
            <section className={styles.card}>
              <h2>Nenhuma oferta disponível</h2>
              <p>Você ainda pode procurar um produto ou pedir ajuda a um prestador.</p>
              <nav className={styles.actions} aria-label="Continuar procurando">
                <Link href="/produtos">Ver produtos</Link>
                <Link href="/servicos">Ver serviços</Link>
              </nav>
            </section>
          )}

          <details className={styles.card}>
            <summary>Ofereço instalação</summary>
            {options ? (
              <>
                <p>Vincule um produto aprovado com estoque a um serviço ativo e aprovado da sua conta.</p>
                {options.produtos.length && options.servicos.length ? (
                  <form className={styles.form} onSubmit={submit}>
                    <label>Título<input name="titulo" required minLength={5} maxLength={120} /></label>
                    <label>O que está incluído?<textarea name="descricao" required minLength={20} maxLength={2000} /></label>
                    <label>Anúncio aprovado
                      <select name="produto_id" required>
                        <option value="">Escolha um produto</option>
                        {options.produtos.map(item => <option key={item.id_produto} value={item.id_produto}>{item.nome}</option>)}
                      </select>
                    </label>
                    <label>Meu serviço ativo
                      <select name="servico_id" required>
                        <option value="">Escolha um serviço</option>
                        {options.servicos.map(item => <option key={item.id_servico} value={item.id_servico}>{item.titulo}</option>)}
                      </select>
                    </label>
                    <button disabled={busy}>Publicar oferta</button>
                  </form>
                ) : (
                  <nav className={styles.actions} aria-label="Preparar minha oferta">
                    <Link href="/anunciar">Anunciar produto</Link>
                    <Link href="/meus-servicos">Gerenciar serviços</Link>
                  </nav>
                )}
                {own.length > 0 && (
                  <>
                    <h2>Minhas ofertas</h2>
                    <ul className={styles.resultList}>{own.map(item => (
                      <li key={item.id}>
                        <div><strong>{item.titulo}</strong><small>{item.ativo ? 'Ativa' : 'Desativada'}</small></div>
                        {Boolean(item.ativo) && <button type="button" className={styles.secondaryButton} disabled={busy} onClick={() => run(() => request('/combos/' + item.id, 'DELETE'))}>Desativar</button>}
                      </li>
                    ))}</ul>
                  </>
                )}
              </>
            ) : <p><Link href="/?login=1&next=%2Fcombos">Entre na sua conta</Link> para publicar uma oferta.</p>}
          </details>
        </>
      )}
    </Frame>
  )
}
