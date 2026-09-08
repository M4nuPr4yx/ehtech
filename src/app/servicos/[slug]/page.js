'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import ServiceIcon from '../ServiceIcon'
import { categoryLabel, modalityLabel, servicePrice } from '../serviceData'
import styles from '../servicos.module.css'
import { getApiUrl } from '../../../lib/api'

export default function ServiceDetailPage() {
  const { slug } = useParams()
  const router = useRouter()
  const [service, setService] = useState(null)
  const [error, setError] = useState('')
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [quoteForm, setQuoteForm] = useState({
    descricao_problema: '', modalidade: 'hibrido', urgencia: 'normal', orcamento_max: '', disponibilidade: ''
  })

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const response = await fetch(getApiUrl(`/servicos/${encodeURIComponent(slug)}`), { signal: controller.signal })
        const data = await response.json()
        if (!response.ok) throw new Error(data.mensagem || 'Não foi possível carregar este serviço.')
        setService(data)
      } catch (requestError) {
        if (requestError.name !== 'AbortError') setError(requestError.message)
      }
    }
    if (slug) load()
    return () => controller.abort()
  }, [slug])

  if (error) return <div className={styles.detailState}><h1>Serviço indisponível</h1><p>{error}</p><Link href="/servicos">Voltar aos serviços</Link></div>
  if (!service) return <div className={styles.detailState} role="status"><div className={styles.loadingMark} />Carregando serviço…</div>

  const initials = String(service.prestador || 'EH').split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase()

  const openQuoteForm = () => {
    const token = localStorage.getItem('token')
    if (!token) {
      const destination = `/servicos/${encodeURIComponent(slug)}`
      router.push(`/?login=1&next=${encodeURIComponent(destination)}`)
      return
    }
    setQuoteForm((current) => ({ ...current, modalidade: service.modalidade || 'hibrido' }))
    setFormError('')
    setQuoteOpen(true)
  }

  const submitQuoteRequest = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setFormError('')
    try {
      const response = await fetch(getApiUrl('/contratacoes'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ...quoteForm, servico_id: service.id_servico })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.mensagem || 'Não foi possível enviar a solicitação.')
      router.push('/contratacoes?novo=1')
    } catch (requestError) {
      setFormError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.detailPage}>
      <div className={styles.detailShell}>
        <div className={styles.breadcrumb}><Link href="/">Início</Link><span>/</span><Link href="/servicos">Serviços</Link><span>/</span><span>{service.titulo}</span></div>
        <div className={styles.detailGrid}>
          <article>
            <div className={styles.detailHero}>
              <div className={styles.detailIcon}><ServiceIcon category={service.categoria} size={42} /></div>
              <div><span className={styles.eyebrow}>{categoryLabel(service.categoria)}</span><h1>{service.titulo}</h1><div className={styles.detailTags}><span>{modalityLabel(service.modalidade)}</span><span>{service.prazo}</span></div></div>
            </div>
            <section className={styles.detailContent}><h2>Sobre o serviço</h2><p>{service.descricao}</p></section>
            <section className={styles.detailContent}><h2>O que está incluído</h2><ul>{service.destaques.map((item) => <li key={item}><span>✓</span>{item}</li>)}</ul></section>
            <section className={styles.note}><strong>Contratação consciente</strong><p>Use o orçamento estruturado para registrar diagnóstico, escopo, prazo, garantia e valor antes do atendimento.</p></section>
          </article>

          <aside className={styles.hireCard}>
            <span className={styles.hireLabel}>Investimento estimado</span>
            <strong className={styles.hirePrice}>{servicePrice(service)}</strong>
            <p>O valor final pode variar conforme o diagnóstico e os materiais necessários.</p>
            <div className={styles.provider}><span>{initials}</span><div><small>Serviço oferecido por</small><strong>{service.prestador}</strong><em>{service.prestador_avaliacoes ? `★ ${service.prestador_nota.toFixed(1)} · ${service.prestador_avaliacoes} avaliações técnicas` : '★ Novo prestador na categoria de serviços'}</em></div></div>
            <dl><div><dt>Modalidade</dt><dd>{modalityLabel(service.modalidade)}</dd></div><div><dt>Região</dt><dd>{service.regiao}</dd></div><div><dt>Prazo</dt><dd>{service.prazo}</dd></div></dl>
            <button type="button" className={styles.quoteButton} onClick={openQuoteForm}>Solicitar orçamento <span>→</span></button>
            <Link href={`/mensagens?vendedor=${service.prestador_id}`} className={styles.contact}>Conversar com o prestador <span>→</span></Link>
            <small className={styles.safe}>Nunca compartilhe senhas. Autorize acesso remoto apenas durante o atendimento.</small>
          </aside>
        </div>
      </div>

      {quoteOpen && (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setQuoteOpen(false) }}>
          <section className={styles.quoteModal} role="dialog" aria-modal="true" aria-labelledby="quote-title">
            <div className={styles.modalHeader}>
              <div><span className={styles.eyebrow}>Solicitação segura</span><h2 id="quote-title">Pedir orçamento</h2><p>{service.titulo}</p></div>
              <button type="button" onClick={() => setQuoteOpen(false)} aria-label="Fechar formulário">×</button>
            </div>
            <form onSubmit={submitQuoteRequest} className={styles.quoteForm}>
              <label className={styles.fullField}><span>Descreva o problema ou objetivo</span><textarea required minLength={20} maxLength={2000} rows={5} value={quoteForm.descricao_problema} onChange={(event) => setQuoteForm({ ...quoteForm, descricao_problema: event.target.value })} placeholder="Ex.: Quero montar um PC para edição de vídeo; já possuo gabinete e monitor…" /></label>
              <label><span>Modalidade preferida</span><select value={quoteForm.modalidade} onChange={(event) => setQuoteForm({ ...quoteForm, modalidade: event.target.value })}><option value="presencial">Presencial</option><option value="remoto">Remoto</option><option value="hibrido">Híbrido</option></select></label>
              <label><span>Urgência</span><select value={quoteForm.urgencia} onChange={(event) => setQuoteForm({ ...quoteForm, urgencia: event.target.value })}><option value="flexivel">Flexível</option><option value="normal">Normal</option><option value="urgente">Urgente</option></select></label>
              <label><span>Limite de orçamento (opcional)</span><input type="number" inputMode="decimal" min="0" max="10000000" step="0.01" value={quoteForm.orcamento_max} onChange={(event) => setQuoteForm({ ...quoteForm, orcamento_max: event.target.value })} placeholder="R$ 0,00" /></label>
              <label><span>Quando você está disponível?</span><input required minLength={5} maxLength={300} value={quoteForm.disponibilidade} onChange={(event) => setQuoteForm({ ...quoteForm, disponibilidade: event.target.value })} placeholder="Ex.: dias úteis após 18h" /></label>
              {formError && <p className={styles.formError} role="alert">{formError}</p>}
              <div className={styles.formActions}><button type="button" onClick={() => setQuoteOpen(false)}>Cancelar</button><button type="submit" disabled={submitting}>{submitting ? 'Enviando…' : 'Enviar solicitação'}</button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}
