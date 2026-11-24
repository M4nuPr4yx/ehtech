'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { apiResponse } from '../../../lib/api-request.js'
import { ReportControl } from '../../complements/TrustControls'
import ServiceIcon from '../ServiceIcon'
import { MODALITIES, categoryLabel, modalityLabel, servicePrice } from '../serviceData'
import styles from '../servicos.module.css'
import { ListingBackLink } from '../../complements/ListingNavigation'

export default function ServiceDetail({ slug, initialService }) {
  const router = useRouter()
  const [service, setService] = useState(initialService)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [quoteForm, setQuoteForm] = useState({
    descricao_problema: '', modalidade: 'hibrido', urgencia: 'normal', orcamento_max: '', disponibilidade: ''
  })
  const dialog = useRef(null)

  useEffect(() => {
    if (initialService) return
    const controller = new AbortController()
    async function load() {
      try {
        const response = await apiResponse(`/servicos/${encodeURIComponent(slug)}`, { signal: controller.signal })
        const data = await response.json()
        if (!response.ok) throw new Error(data.mensagem || 'Não foi possível carregar este serviço.')
        setService(data)
      } catch (requestError) {
        if (requestError.name !== 'AbortError') setError(requestError.message)
      }
    }
    if (slug) load()
    return () => controller.abort()
  }, [initialService, slug, retry])

  useEffect(() => {
    if (!quoteOpen) return
    const modal = dialog.current
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    modal.showModal()
    modal.querySelector('textarea')?.focus()
    document.body.style.overflow = 'hidden'
    return () => {
      modal.close()
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [quoteOpen])

  if (error) return <div className={styles.detailState}><h1>Serviço indisponível</h1><p>{error}</p><button type="button" className="underline" onClick={() => { setError(''); setRetry(value => value + 1) }}>Tentar novamente</button><ListingBackLink fallback="/servicos" fallbackLabel="Voltar aos serviços" /></div>
  if (!service) return <div className={styles.detailState} role="status"><div className={styles.loadingMark} />Carregando serviço…</div>

  const initials = String(service.prestador || 'EH').split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  const availableModes = MODALITIES.filter(([value]) => value && (service.modalidade === 'hibrido' || value === service.modalidade))

  const openQuoteForm = () => {
    const token = localStorage.getItem('token')
    if (!token) {
      const destination = window.location.pathname + window.location.search
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
      const response = await apiResponse('/contratacoes', {
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
        <div className={styles.breadcrumb}><ListingBackLink fallback="/servicos" fallbackLabel="Voltar aos serviços" /></div>
        <div className={styles.detailGrid}>
          <article>
            <div className={styles.detailHero}>
              <div className={styles.detailIcon}><ServiceIcon category={service.categoria} size={42} /></div>
              <div><span className={styles.eyebrow}>{categoryLabel(service.categoria)}</span><h1>{service.titulo}</h1><div className={styles.detailTags}><span>{modalityLabel(service.modalidade)}</span><span>{service.prazo}</span></div></div>
            </div>
            <section className={styles.detailContent}><h2>Sobre o serviço</h2><p>{service.descricao}</p></section>
            {service.destaques?.length > 0 && <section className={styles.detailContent}><h2>O que está incluído</h2><ul>{service.destaques.map((item) => <li key={item}><span aria-hidden="true">✓</span>{item}</li>)}</ul></section>}
            <section className={styles.detailContent}><h2>Entregáveis e aceite</h2><p>{service.entregaveis || 'Combine os entregáveis no orçamento.'}</p><p>{service.criterios_aceite || 'Combine como conferir o resultado antes de aceitar.'}</p><p>Revisões incluídas: {service.revisoes || 0}</p></section><ReportControl type="servico" targetId={service.id_servico} label="Denunciar serviço" /><section className={styles.note}><strong>Contratação consciente</strong><p>Registre escopo, prazo, condições e valor antes do atendimento. O serviço é prestado pelo usuário anunciante. O pagamento é externo. Consulte as políticas antes de contratar.</p></section>
          </article>

          <aside className={styles.hireCard}>
            <span className={styles.hireLabel}>Investimento estimado</span>
            <strong className={styles.hirePrice}>{servicePrice(service)}</strong>
            <p>Confirme o valor e o que está incluído no orçamento do prestador.</p><Link className="text-accent underline" href="/politicas#servicos">Condições de serviços e pagamento</Link>
            <div className={styles.provider}><span aria-hidden="true">{initials}</span><div><small>Serviço oferecido por</small><Link href={`/perfil/${service.prestador_id}`} className="font-bold text-accent underline">{service.prestador}</Link><em>{service.prestador_avaliacoes ? `${service.prestador_nota.toLocaleString('pt-BR')} de 5 · ${service.prestador_avaliacoes} ${service.prestador_avaliacoes === 1 ? 'avaliação' : 'avaliações'}` : 'Sem avaliações de serviços'}</em></div></div>
            <dl><div><dt>Modalidade</dt><dd>{modalityLabel(service.modalidade)}</dd></div>{service.regiao && <div><dt>Região</dt><dd>{service.regiao}</dd></div>}<div><dt>Prazo</dt><dd>{service.prazo}</dd></div></dl>
            <button type="button" className={styles.quoteButton} onClick={openQuoteForm}>Solicitar orçamento <span>→</span></button>
            <Link href={`/mensagens?vendedor=${service.prestador_id}`} className={styles.contact}>Conversar com o prestador <span>→</span></Link>
            <small className={styles.safe}>Nunca compartilhe senhas. Autorize acesso remoto apenas durante o atendimento.</small>
          </aside>
        </div>
      </div>

      {quoteOpen && (
        <dialog ref={dialog} className={styles.quoteModal} aria-labelledby="quote-title" onCancel={event => { event.preventDefault(); if (!submitting) setQuoteOpen(false) }} onClick={event => { if (!submitting && event.target === event.currentTarget) setQuoteOpen(false) }}>
            <div className={styles.modalHeader}>
              <div><span className={styles.eyebrow}>Solicitação segura</span><h2 id="quote-title">Pedir orçamento</h2><p>{service.titulo}</p></div>
              <button type="button" disabled={submitting} onClick={() => setQuoteOpen(false)} aria-label="Fechar formulário">×</button>
            </div>
            <form onSubmit={submitQuoteRequest} className={styles.quoteForm}>
              <label className={styles.fullField}><span>Descreva o problema ou objetivo</span><textarea required minLength={20} maxLength={2000} rows={5} value={quoteForm.descricao_problema} onChange={(event) => setQuoteForm({ ...quoteForm, descricao_problema: event.target.value })} placeholder="Ex.: Quero montar um PC para edição de vídeo. Já possuo gabinete e monitor." /></label>
              <label><span>Modalidade preferida</span><select value={quoteForm.modalidade} onChange={(event) => setQuoteForm({ ...quoteForm, modalidade: event.target.value })}>{availableModes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label><span>Urgência</span><select value={quoteForm.urgencia} onChange={(event) => setQuoteForm({ ...quoteForm, urgencia: event.target.value })}><option value="flexivel">Flexível</option><option value="normal">Normal</option><option value="urgente">Urgente</option></select></label>
              <label><span>Limite de orçamento (opcional)</span><input type="number" inputMode="decimal" min="0" max="10000000" step="0.01" value={quoteForm.orcamento_max} onChange={(event) => setQuoteForm({ ...quoteForm, orcamento_max: event.target.value })} placeholder="R$ 0,00" /></label>
              <label><span>Quando você está disponível?</span><input required minLength={5} maxLength={300} value={quoteForm.disponibilidade} onChange={(event) => setQuoteForm({ ...quoteForm, disponibilidade: event.target.value })} placeholder="Ex.: dias úteis após 18h" /></label>
              {formError && <p className={styles.formError} role="alert">{formError}</p>}
              <div className={styles.formActions}><button type="button" disabled={submitting} onClick={() => setQuoteOpen(false)}>Cancelar</button><button type="submit" disabled={submitting}>{submitting ? 'Enviando…' : 'Enviar solicitação'}</button></div>
            </form>
        </dialog>
      )}
    </div>
  )
}
