'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Frame, Feedback, request, price, styles } from '../complements/DifferentialsUI'

export default function MissionsPage() {
  const [missions, setMissions] = useState([]), [result, setResult] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    request('/missoes', 'GET', undefined, controller.signal).then(setMissions).catch(err => { if (err.name !== 'AbortError') setError(err.message) })
    return () => controller.abort()
  }, [])
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); setResult(null)
    const form = new FormData(event.currentTarget)
    try { setResult(await request('/missoes/recomendar', 'POST', { missao: form.get('missao'), orcamento: Number(form.get('orcamento')) })) } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <Frame title="Compre pelo que você quer resolver" intro="Escolha um objetivo e um limite de investimento. Compare três composições do catálogo com produtos e um serviço, sem promessas de desempenho baseadas só no preço."><section className={styles.card}><h2>Qual é a sua missão?</h2><form className={styles.form} onSubmit={submit}><label>Objetivo<select required name="missao"><option value="">Selecione</option>{missions.map(item => <option key={item.id} value={item.id}>{item.titulo}</option>)}</select></label><label>Orçamento total de referência (R$)<input required type="number" min="1" max="1000000" step="0.01" name="orcamento" placeholder="Ex.: 3000" /></label><button disabled={busy || !missions.length}>{busy ? 'Consultando catálogo…' : 'Montar alternativas'}</button></form><Feedback error={error} /></section>{result && <><section className={styles.card}><h2>{result.missao.titulo}</h2><p>{result.missao.descricao}</p><ul>{result.regras.map(rule => <li key={rule}>{rule}</li>)}</ul><Link href="/compatibilidade">Verificar componentes cadastrados →</Link></section><div className={styles.grid}>{result.faixas.map(tier => <section key={tier.faixa} className={styles.card}><span className={styles.eyebrow}>{tier.faixa}</span><h2>{price(tier.total_estimado)}</h2><p>{tier.completo ? 'Composição encontrada; ainda exige validação técnica.' : 'Composição incompleta: não é uma solução pronta para compra.'}</p><ul>{tier.produtos.map(item => <li key={item.id_produto}><Link href={`/produtos/${item.id_produto}`}>{item.nome}</Link> · {price(item.preco)}<p>{item.motivo}</p></li>)}</ul>{tier.faltantes.length > 0 && <p>Faltam anúncios dentro desta faixa: {tier.faltantes.join(', ')}.</p>}{tier.servico ? <p>Serviço: <Link href={`/servicos/${tier.servico.slug}`}>{tier.servico.titulo}</Link> · {tier.servico.tipo_preco === 'a_partir_de' ? 'a partir de ' : ''}{price(tier.servico.preco_base)} · {tier.servico.modalidade} · {tier.servico.regiao}</p> : <p>Não há serviço com preço-base informado nesta categoria. Consulte um prestador.</p>}<p>Consumo elétrico: não estimado. Sem frete ou reserva; confirme atendimento e compatibilidade antes de comprar.</p></section>)}</div></>}</Frame>
}
