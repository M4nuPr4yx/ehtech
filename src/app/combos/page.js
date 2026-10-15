'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ComboCard, Frame, Feedback, request, styles } from '../complements/DifferentialsUI'

export default function CombosPage() {
  const [combos, setCombos] = useState([]), [own, setOwn] = useState([]), [options, setOptions] = useState(null), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState(''), [notice, setNotice] = useState('')
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
  return <Frame title="Produto + instalação" intro="Encontre o equipamento e o atendimento do mesmo anunciante. Confirme o orçamento do serviço antes de comprar o produto: as duas etapas permanecem separadas e transparentes."><Feedback error={error} notice={notice} />{loading ? <p role="status">Carregando combos…</p> : <><div className={styles.grid}>{combos.map(combo => <ComboCard key={combo.id} combo={combo} />)}</div>{!combos.length && <section className={styles.card}><h2>Ainda não há combos disponíveis</h2><p>Combos só aparecem com anúncio aprovado, estoque disponível e serviço ativo do mesmo anunciante.</p><Link href="/produtos">Explorar produtos</Link></section>}{options ? <section className={styles.card}><h2>Gerenciar meus combos</h2><p>Associe um anúncio aprovado a um serviço ativo que você presta. A descrição deve explicar o escopo de instalação e os requisitos; o orçamento final será negociado na contratação.</p>{options.produtos.length && options.servicos.length ? <form className={styles.form} onSubmit={submit}><label>Título<input name="titulo" required minLength={5} maxLength={120} /></label><label>O que inclui e quais os requisitos?<textarea name="descricao" required minLength={20} maxLength={2000} /></label><label>Anúncio aprovado<select name="produto_id" required><option value="">Selecione</option>{options.produtos.map(item => <option key={item.id_produto} value={item.id_produto}>{item.nome}</option>)}</select></label><label>Meu serviço ativo<select name="servico_id" required><option value="">Selecione</option>{options.servicos.map(item => <option key={item.id_servico} value={item.id_servico}>{item.titulo}</option>)}</select></label><button disabled={busy}>Publicar combo</button></form> : <p>Para publicar, sua conta precisa de um anúncio aprovado e de um serviço ativo cadastrado na plataforma.</p>}<ul>{own.map(item => <li key={item.id}>{item.titulo} · {item.ativo ? 'Ativo (disponibilidade depende do anúncio e serviço)' : 'Desativado'} {Boolean(item.ativo) && <button className={styles.button} disabled={busy} onClick={() => run(() => request(`/combos/${item.id}`, 'DELETE'))}>Desativar</button>}</li>)}</ul></section> : <section className={styles.card}><p><Link href="/?login=1&next=%2Fcombos">Entre na sua conta</Link> para gerenciar combos ou solicitar um orçamento.</p></section>}</>}</Frame>
}
