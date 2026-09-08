'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import ServiceIcon from '../ServiceIcon'
import { categoryLabel, modalityLabel, servicePrice } from '../serviceData'
import styles from '../servicos.module.css'

export default function ServiceDetailPage() {
  const { slug } = useParams()
  const [service, setService] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const response = await fetch(`/api/servicos/${encodeURIComponent(slug)}`, { signal: controller.signal })
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
            <section className={styles.note}><strong>Contratação consciente</strong><p>Combine no chat o diagnóstico, o escopo final, a disponibilidade e eventuais peças necessárias antes do atendimento.</p></section>
          </article>

          <aside className={styles.hireCard}>
            <span className={styles.hireLabel}>Investimento estimado</span>
            <strong className={styles.hirePrice}>{servicePrice(service)}</strong>
            <p>O valor final pode variar conforme o diagnóstico e os materiais necessários.</p>
            <div className={styles.provider}><span>{initials}</span><div><small>Serviço oferecido por</small><strong>{service.prestador}</strong></div></div>
            <dl><div><dt>Modalidade</dt><dd>{modalityLabel(service.modalidade)}</dd></div><div><dt>Região</dt><dd>{service.regiao}</dd></div><div><dt>Prazo</dt><dd>{service.prazo}</dd></div></dl>
            <Link href={`/mensagens?vendedor=${service.prestador_id}`} className={styles.contact}>Conversar com o prestador <span>→</span></Link>
            <small className={styles.safe}>Nunca compartilhe senhas. Autorize acesso remoto apenas durante o atendimento.</small>
          </aside>
        </div>
      </div>
    </div>
  )
}
