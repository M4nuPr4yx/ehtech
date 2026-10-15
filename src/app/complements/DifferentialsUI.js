'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getApiUrl } from '../../lib/api'
import styles from './differentials.module.css'

export { styles }
export const price = value => value === null ? 'Sob consulta' : Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export async function request(path, method = 'GET', body, signal) {
  const token = localStorage.getItem('token')
  const response = await fetch(getApiUrl(path), { method, signal, cache: 'no-store', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
  const data = await response.json()
  if (!response.ok) throw new Error(data.mensagem || 'Não foi possível concluir a operação.')
  return data
}
export function Frame({ title, intro, children }) {
  return <div className={styles.page}><div className={styles.shell}><header className={styles.hero}><span className={styles.eyebrow}>EHtech · Soluções com transparência</span><h1>{title}</h1><p>{intro}</p><nav className={styles.actions} aria-label="Soluções"><Link href="/missoes">Compra por missão</Link><Link href="/combos">Produto + instalação</Link><Link href="/certificados">Certificados de usados</Link><Link href="/passaportes">Meus equipamentos</Link></nav></header>{children}</div></div>
}
export function Feedback({ error, notice }) {
  return <>{error && <p role="alert" className={styles.error}>{error}</p>}{notice && <p role="status" className={styles.notice}>{notice}</p>}</>
}
export function CertificateReport({ certificate }) {
  const labels = { funcionamento: 'Funcionamento', integridade: 'Integridade visual', temperatura: 'Temperaturas', armazenamento: 'Armazenamento', bateria: 'Bateria' }
  const results = { aprovado: 'Aprovado', reprovado: 'Reprovado', nao_aplicavel: 'Não aplicável' }
  return <section className={styles.card}><span className={styles.badge}>{!certificate.status || certificate.status === 'emitido' ? 'Usado inspecionado · selo válido' : 'Laudo histórico · sem selo válido'} · #{certificate.id}</span><h3>Laudo de inspeção</h3><p>{certificate.equipamento?.nome} · {certificate.equipamento?.modelo}</p><ul>{Object.entries(certificate.checklist || {}).map(([key, value]) => <li key={key}>{labels[key]}: {results[value]}</li>)}</ul><p className={styles.prewrap}>{certificate.laudo}</p><p>Inspeção em {new Date(certificate.emitido_em).toLocaleDateString('pt-BR')}.{(!certificate.status || certificate.status === 'emitido') && <> Válido até {new Date(certificate.expira_em).toLocaleDateString('pt-BR')}.</>}</p><p>{certificate.aviso || 'Inspeção declarada pelo prestador. Não é certificação oficial nem garantia de desempenho. Alterações na ficha, anúncio ou propriedade invalidam o selo.'}</p></section>
}
export function ComboCard({ combo }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
  async function submit(event) {
    event.preventDefault(); setError(''); setNotice('')
    if (!localStorage.getItem('token')) { setError('Entre na sua conta para solicitar orçamento.'); return }
    const values = Object.fromEntries(new FormData(event.currentTarget))
    setBusy(true)
    try {
      const data = await request('/contratacoes', 'POST', { ...values, combo_id: combo.id, servico_id: Number(combo.servico_id), urgencia: 'normal' })
      setNotice(data.mensagem)
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <article className={styles.card}><span className={styles.eyebrow}>Produto + instalação/configuração</span><h2>{combo.titulo}</h2><p>{combo.descricao}</p><p><Link href={`/produtos/${combo.produto_id}`}>{combo.produto_nome}</Link> · {price(combo.produto_preco)}</p><p><Link href={`/servicos/${combo.servico_slug}`}>{combo.servico_titulo}</Link> · {combo.tipo_preco === 'a_partir_de' ? 'a partir de ' : ''}{price(combo.preco_base)}</p><p>{combo.modalidade} · {combo.regiao || 'Região a combinar'}</p><strong>Referência do conjunto: {price(combo.total_estimado)}</strong><p>Frete não incluso. Não há desconto automático nem reserva. O orçamento e o aceite cobrem somente o serviço; compre o produto separadamente após confirmar compatibilidade e atendimento com o prestador.</p><details><summary>Solicitar orçamento da instalação</summary><form className={styles.form} onSubmit={submit}><label>Necessidade e produto a instalar<textarea required name="descricao_problema" minLength={20} maxLength={2000} defaultValue={`Quero instalar/configurar o produto ${combo.produto_nome}. Preciso confirmar compatibilidade e atendimento.`} /></label><label>Modalidade<select name="modalidade" defaultValue={combo.modalidade}><option value="presencial">Presencial</option><option value="remoto">Remoto</option><option value="hibrido">Híbrido</option></select></label><label>Disponibilidade<input required name="disponibilidade" minLength={5} maxLength={300} placeholder="Ex.: sábado pela manhã" /></label><label>Limite para o serviço (opcional)<input name="orcamento_max" type="number" min="0" max="10000000" step="0.01" /></label><button disabled={busy}>{busy ? 'Enviando…' : 'Solicitar orçamento do serviço'}</button></form></details><Feedback error={error} notice={notice} />{notice && <Link href="/contratacoes">Acompanhar contratação →</Link>}</article>
}
export function ProductExtras({ productId }) {
  const [data, setData] = useState(null), [error, setError] = useState(null)
  useEffect(() => {
    const controller = new AbortController()
    Promise.all([request(`/certificados/produto/${productId}`, 'GET', undefined, controller.signal), request(`/combos?produto_id=${productId}`, 'GET', undefined, controller.signal)]).then(([certificate, combos]) => { setData({ ...certificate, combos, productId }); setError(null) }).catch(err => { if (err.name !== 'AbortError') setError({ productId, message: err.message }) })
    return () => controller.abort()
  }, [productId])
  const current = data?.productId === productId ? data : null
  return <div className={styles.extras}><Feedback error={error?.productId === productId ? error.message : ''} />{current?.certificado ? <CertificateReport certificate={current.certificado} /> : current && <p>Este anúncio não possui certificado de inspeção válido.</p>}{current?.combos.map(combo => <ComboCard key={combo.id} combo={combo} />)}</div>
}
