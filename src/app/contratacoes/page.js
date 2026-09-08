'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getApiUrl } from '../../lib/api'
import styles from './contratacoes.module.css'

const STATUS = {
  solicitado: { label: 'Solicitado', help: 'Aguardando análise do prestador' },
  orcamento_enviado: { label: 'Orçamento enviado', help: 'Proposta disponível para o cliente' },
  aceito: { label: 'Aceito', help: 'Serviço aprovado pelo cliente' },
  em_execucao: { label: 'Em execução', help: 'Atendimento em andamento' },
  concluido: { label: 'Concluído', help: 'Serviço finalizado' },
  cancelado: { label: 'Cancelado', help: 'Contratação encerrada' }
}
const STEPS = [
  ['solicitado', 'created_at'], ['orcamento_enviado', 'orcamento_enviado_em'],
  ['aceito', 'aceito_em'], ['em_execucao', 'iniciado_em'], ['concluido', 'concluido_em']
]
const EMPTY_QUOTE = { valor_proposto: '', escopo_proposto: '', prazo_proposto: '', garantia_dias: '30', observacoes_prestador: '' }

const currency = (value) => value === null || value === undefined
  ? 'Não informado'
  : Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const dateTime = (value) => value
  ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  : ''

const dateOnly = (value) => value
  ? new Date(value).toLocaleDateString('pt-BR', { dateStyle: 'long' })
  : ''

export default function ContractsPage() {
  const router = useRouter()
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [filter, setFilter] = useState('todos')
  const [editingId, setEditingId] = useState(null)
  const [quote, setQuote] = useState(EMPTY_QUOTE)
  const [reviewingId, setReviewingId] = useState(null)
  const [review, setReview] = useState({ nota: 5, comentario: '' })
  const [saving, setSaving] = useState(false)

  const loadContracts = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.replace('/?login=1&next=%2Fcontratacoes')
      return
    }
    setLoading(true)
    setError('')
    try {
      const response = await fetch(getApiUrl('/contratacoes'), {
        headers: { Authorization: `Bearer ${token}` }, cache: 'no-store'
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.mensagem || 'Não foi possível carregar as contratações.')
      setContracts(data)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('novo') === '1') {
      setNotice('Solicitação enviada. O prestador já foi notificado.')
      window.history.replaceState({}, '', '/contratacoes')
    }
    loadContracts()
  }, [loadContracts])

  const visibleContracts = useMemo(() => contracts.filter((contract) => {
    if (filter === 'todos') return true
    if (filter === 'ativos') return !['concluido', 'cancelado'].includes(contract.status)
    return contract.papel === filter
  }), [contracts, filter])

  const beginQuote = (contract) => {
    setEditingId(contract.id_contratacao)
    setQuote({
      valor_proposto: contract.valor_proposto ?? '',
      escopo_proposto: contract.escopo_proposto || '',
      prazo_proposto: contract.prazo_proposto || '',
      garantia_dias: String(contract.garantia_dias ?? 30),
      observacoes_prestador: contract.observacoes_prestador || ''
    })
    setError('')
  }

  const submitQuote = async (event, id) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const response = await fetch(getApiUrl(`/contratacoes/${id}/orcamento`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(quote)
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.mensagem || 'Não foi possível enviar o orçamento.')
      setEditingId(null)
      setNotice(data.mensagem)
      await loadContracts()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (id, status) => {
    setSaving(true)
    setError('')
    try {
      const response = await fetch(getApiUrl(`/contratacoes/${id}/status`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ status })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.mensagem || 'Não foi possível atualizar a etapa.')
      setNotice(data.mensagem)
      await loadContracts()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  const submitReview = async (event, id) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const response = await fetch(getApiUrl(`/contratacoes/${id}/avaliacao`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(review)
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.mensagem || 'Não foi possível publicar a avaliação.')
      setReviewingId(null)
      setReview({ nota: 5, comentario: '' })
      setNotice(data.mensagem)
      await loadContracts()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <nav className={styles.breadcrumb}><Link href="/">Início</Link><span>/</span><span>Minhas contratações</span></nav>
        <header className={styles.hero}>
          <div><span className={styles.eyebrow}>Serviços EHtech</span><h1>Contratações em um só lugar</h1><p>Acompanhe solicitações, compare o escopo combinado e avance cada atendimento com segurança.</p></div>
          <Link href="/servicos">Encontrar serviços <span>→</span></Link>
        </header>

        <section className={styles.summary} aria-label="Resumo das contratações">
          <div><strong>{contracts.filter((item) => !['concluido', 'cancelado'].includes(item.status)).length}</strong><span>Em andamento</span></div>
          <div><strong>{contracts.filter((item) => item.papel === 'cliente').length}</strong><span>Como cliente</span></div>
          <div><strong>{contracts.filter((item) => item.papel === 'prestador').length}</strong><span>Como prestador</span></div>
        </section>

        <div className={styles.toolbar}>
          <div role="group" aria-label="Filtrar contratações">
            {[['todos', 'Todas'], ['ativos', 'Em andamento'], ['cliente', 'Como cliente'], ['prestador', 'Como prestador']].map(([value, label]) => (
              <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>
            ))}
          </div>
          <button type="button" className={styles.refresh} onClick={loadContracts} disabled={loading}>↻ Atualizar</button>
        </div>

        {notice && <div className={styles.notice} role="status"><span>✓</span>{notice}<button type="button" onClick={() => setNotice('')} aria-label="Fechar mensagem">×</button></div>}
        {error && <div className={styles.error} role="alert">{error}<button type="button" onClick={() => setError('')}>Fechar</button></div>}

        {loading ? (
          <div className={styles.loading} role="status"><i />Carregando contratações…</div>
        ) : visibleContracts.length === 0 ? (
          <section className={styles.empty}><span>⌁</span><h2>Nenhuma contratação aqui</h2><p>Quando você solicitar ou receber um pedido de serviço, o acompanhamento aparecerá nesta página.</p><Link href="/servicos">Explorar serviços</Link></section>
        ) : (
          <section className={styles.list} aria-label="Lista de contratações">
            {visibleContracts.map((contract) => {
              const currentStep = STEPS.findIndex(([status]) => status === contract.status)
              const isProvider = contract.papel === 'prestador'
              const canQuote = isProvider && ['solicitado', 'orcamento_enviado'].includes(contract.status)
              return (
                <article className={styles.card} key={contract.id_contratacao}>
                  <div className={styles.cardHeader}>
                    <div><span className={styles.role}>{isProvider ? 'Você é o prestador' : 'Você é o cliente'}</span><h2>{contract.servico_titulo}</h2><p>Com {isProvider ? contract.cliente_nome : contract.prestador_nome} · Pedido #{contract.id_contratacao}</p></div>
                    <span className={`${styles.status} ${styles[contract.status]}`}>{STATUS[contract.status]?.label}</span>
                  </div>

                  {contract.status === 'cancelado' ? (
                    <div className={styles.cancelled}><strong>Contratação cancelada</strong><span>{dateTime(contract.cancelado_em)}</span></div>
                  ) : (
                    <ol className={styles.timeline} aria-label="Andamento da contratação">
                      {STEPS.map(([status, dateField], index) => (
                        <li key={status} data-state={index < currentStep ? 'done' : index === currentStep ? 'current' : 'future'}>
                          <i>{index < currentStep ? '✓' : index + 1}</i><div><strong>{STATUS[status].label}</strong><span>{contract[dateField] ? dateTime(contract[dateField]) : STATUS[status].help}</span></div>
                        </li>
                      ))}
                    </ol>
                  )}

                  <div className={styles.requestGrid}>
                    <div className={styles.description}><span>Necessidade informada</span><p>{contract.descricao_problema}</p></div>
                    <dl><div><dt>Modalidade</dt><dd>{contract.modalidade}</dd></div><div><dt>Urgência</dt><dd>{contract.urgencia}</dd></div><div><dt>Limite do cliente</dt><dd>{currency(contract.orcamento_max)}</dd></div><div><dt>Disponibilidade</dt><dd>{contract.disponibilidade}</dd></div></dl>
                  </div>

                  {contract.valor_proposto !== null && (
                    <section className={styles.proposal}>
                      <div className={styles.proposalTitle}><div><span>Proposta do prestador</span><strong>{currency(contract.valor_proposto)}</strong></div><div><span>Prazo</span><strong>{contract.prazo_proposto}</strong></div><div><span>Garantia</span><strong>{contract.garantia_dias ? `${contract.garantia_dias} dias` : 'Sem garantia adicional'}</strong></div></div>
                      <div><span>Escopo incluído</span><p>{contract.escopo_proposto}</p></div>
                      {contract.observacoes_prestador && <div><span>Observações</span><p>{contract.observacoes_prestador}</p></div>}
                    </section>
                  )}

                  {contract.garantia_codigo && (
                    <section className={styles.warranty}>
                      <div className={styles.warrantySeal} aria-hidden="true">✓</div>
                      <div className={styles.warrantyMain}>
                        <span>Garantia EHtech registrada</span>
                        <strong>{contract.garantia_codigo}</strong>
                        <p>Cobre o escopo descrito na proposta durante o período registrado. Guarde este código para qualquer solicitação.</p>
                      </div>
                      <dl>
                        <div><dt>Início</dt><dd>{dateOnly(contract.garantia_inicio_em)}</dd></div>
                        <div><dt>Válida até</dt><dd>{dateOnly(contract.garantia_fim_em)}</dd></div>
                        <div><dt>Situação</dt><dd><span data-active={new Date(contract.garantia_fim_em) >= new Date()}>{new Date(contract.garantia_fim_em) >= new Date() ? 'Ativa' : 'Encerrada'}</span></dd></div>
                      </dl>
                    </section>
                  )}

                  {contract.avaliacao_nota != null && (
                    <section className={styles.publishedReview}>
                      <div><span>{contract.papel === 'cliente' ? 'Sua avaliação técnica' : 'Avaliação recebida'}</span><strong>{'★'.repeat(Number(contract.avaliacao_nota))}{'☆'.repeat(5 - Number(contract.avaliacao_nota))}</strong></div>
                      <p>{contract.avaliacao_comentario || 'O cliente avaliou o atendimento sem deixar comentário.'}</p>
                      <small>Publicada em {dateOnly(contract.avaliacao_em)}</small>
                    </section>
                  )}

                  {reviewingId === contract.id_contratacao && (
                    <form className={styles.reviewEditor} onSubmit={(event) => submitReview(event, contract.id_contratacao)}>
                      <header><div><span className={styles.eyebrow}>Reputação técnica</span><h3>Avaliar serviço concluído</h3></div><button type="button" onClick={() => setReviewingId(null)}>×</button></header>
                      <fieldset><legend>Qual nota você dá para o atendimento?</legend><div>{[1, 2, 3, 4, 5].map((rating) => <button type="button" key={rating} data-filled={rating <= review.nota} aria-label={`${rating} estrela${rating === 1 ? '' : 's'}`} aria-pressed={review.nota === rating} onClick={() => setReview({ ...review, nota: rating })}>★</button>)}</div></fieldset>
                      <label><span>Conte como foi a experiência (opcional)</span><textarea minLength={10} maxLength={1000} rows={3} value={review.comentario} onChange={(event) => setReview({ ...review, comentario: event.target.value })} placeholder="Comente sobre clareza, prazo e resultado do serviço." /></label>
                      <button type="submit" className={styles.primaryAction} disabled={saving}>{saving ? 'Publicando…' : 'Publicar avaliação'}</button>
                    </form>
                  )}

                  {editingId === contract.id_contratacao && (
                    <form className={styles.quoteEditor} onSubmit={(event) => submitQuote(event, contract.id_contratacao)}>
                      <header><div><span className={styles.eyebrow}>Proposta estruturada</span><h3>{contract.valor_proposto === null ? 'Criar orçamento' : 'Editar orçamento'}</h3></div><button type="button" onClick={() => setEditingId(null)}>×</button></header>
                      <label><span>Valor final</span><input required type="number" min="0.01" max="10000000" step="0.01" value={quote.valor_proposto} onChange={(event) => setQuote({ ...quote, valor_proposto: event.target.value })} /></label>
                      <label><span>Prazo de execução</span><input required minLength={2} maxLength={120} value={quote.prazo_proposto} onChange={(event) => setQuote({ ...quote, prazo_proposto: event.target.value })} placeholder="Ex.: 2 dias úteis" /></label>
                      <label><span>Garantia em dias</span><input required type="number" min="0" max="3650" value={quote.garantia_dias} onChange={(event) => setQuote({ ...quote, garantia_dias: event.target.value })} /></label>
                      <label className={styles.wide}><span>Escopo detalhado</span><textarea required minLength={20} maxLength={3000} rows={4} value={quote.escopo_proposto} onChange={(event) => setQuote({ ...quote, escopo_proposto: event.target.value })} placeholder="Explique o que será feito, materiais incluídos e limites do atendimento." /></label>
                      <label className={styles.wide}><span>Observações opcionais</span><textarea maxLength={2000} rows={2} value={quote.observacoes_prestador} onChange={(event) => setQuote({ ...quote, observacoes_prestador: event.target.value })} /></label>
                      <button type="submit" className={styles.primaryAction} disabled={saving}>{saving ? 'Salvando…' : 'Enviar orçamento ao cliente'}</button>
                    </form>
                  )}

                  <footer className={styles.actions}>
                    <Link href={`/mensagens?vendedor=${isProvider ? contract.cliente_id : contract.prestador_id}`}>Conversar no chat</Link>
                    <div>
                      {canQuote && editingId !== contract.id_contratacao && <button type="button" className={styles.primaryAction} onClick={() => beginQuote(contract)}>{contract.status === 'solicitado' ? 'Montar orçamento' : 'Editar orçamento'}</button>}
                      {!isProvider && contract.status === 'orcamento_enviado' && <button type="button" className={styles.primaryAction} disabled={saving} onClick={() => updateStatus(contract.id_contratacao, 'aceito')}>Aceitar proposta</button>}
                      {isProvider && contract.status === 'aceito' && <button type="button" className={styles.primaryAction} disabled={saving} onClick={() => updateStatus(contract.id_contratacao, 'em_execucao')}>Iniciar serviço</button>}
                      {isProvider && contract.status === 'em_execucao' && <button type="button" className={styles.primaryAction} disabled={saving} onClick={() => updateStatus(contract.id_contratacao, 'concluido')}>Marcar como concluído</button>}
                      {!isProvider && contract.status === 'concluido' && contract.avaliacao_nota == null && reviewingId !== contract.id_contratacao && <button type="button" className={styles.primaryAction} onClick={() => { setReviewingId(contract.id_contratacao); setReview({ nota: 5, comentario: '' }) }}>Avaliar atendimento</button>}
                      {((!isProvider && ['solicitado', 'orcamento_enviado', 'aceito'].includes(contract.status)) || (isProvider && ['solicitado', 'orcamento_enviado', 'aceito'].includes(contract.status))) && <button type="button" className={styles.dangerAction} disabled={saving} onClick={() => updateStatus(contract.id_contratacao, 'cancelado')}>Cancelar</button>}
                    </div>
                  </footer>
                </article>
              )
            })}
          </section>
        )}
      </div>
    </main>
  )
}
