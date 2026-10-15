'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getApiUrl } from '../../../lib/api'
import styles from '../../compatibilidade/compatibilidade.module.css'

const TEMPLATES = {
  processador: { socket: null, memoria_tipos: null, memoria_max_gb: null, video_integrado: null },
  placa_mae: { socket: null, memoria_tipo: null, memoria_formato: 'UDIMM', memoria_slots: null, memoria_max_gb: null, bios_versoes: [], suporte_cpu: {} },
  memoria: { memoria_tipo: null, memoria_formato: 'UDIMM', modulos: null, capacidade_gb: null, velocidade_padrao_mts: null, velocidade_perfil_mts: null, perfil: 'Nenhum' }
}
const labels = { processador: 'Processador', placa_mae: 'Placa-mãe', memoria: 'Memória' }
const create = tipo => ({ id: null, slug: '', tipo, marca: '', modelo: '', status: 'rascunho', ativo: true,
  especificacoes: JSON.stringify(TEMPLATES[tipo], null, 2), fontes: JSON.stringify([{ titulo: '', url: '' }], null, 2) })

async function api(path = '', method = 'GET', body) {
  const response = await fetch(getApiUrl(`/componentes/admin${path}`), { method, cache: 'no-store', headers: { Authorization: `Bearer ${sessionStorage.getItem('adminToken')}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
  const data = await response.json()
  if (!response.ok) throw new Error(data.mensagem || 'Não foi possível consultar as fichas.')
  return data
}

export default function AdminComponentsPage() {
  const router = useRouter()
  const [items, setItems] = useState([])
  const [form, setForm] = useState(create('processador'))
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const load = useCallback(async () => {
    const data = await api()
    setItems(data)
    return data
  }, [])
  useEffect(() => {
    if (!sessionStorage.getItem('adminToken')) { router.replace('/admin'); return }
    load().then(() => setReady(true)).catch(err => setError(err.message))
  }, [router, load])
  function edit(item) {
    setForm({ ...item, especificacoes: JSON.stringify(item.especificacoes, null, 2), fontes: JSON.stringify(item.fontes, null, 2) })
    setError(''); setNotice('')
  }
  async function save(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('')
    try {
      let especificacoes, fontes
      try { especificacoes = JSON.parse(form.especificacoes); fontes = JSON.parse(form.fontes) }
      catch { throw new Error('As especificações e fontes precisam ser JSON válido.') }
      const result = await api(form.id ? `/${form.id}` : '', form.id ? 'PUT' : 'POST', { ...form, especificacoes, fontes })
      const data = await load()
      const saved = data.find(item => item.id === (form.id || result.id))
      if (saved) edit(saved)
      setNotice(result.mensagem)
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  const visible = items.filter(item => `${item.marca} ${item.modelo} ${item.slug}`.toLowerCase().includes(search.toLowerCase()))
  return <div className={styles.page}><div className={styles.shell}>
    <section className={styles.hero}><span className={styles.eyebrow}>EHtech · Administração</span><h1>Catálogo técnico de componentes</h1><p>Revise informações nas fontes dos fabricantes antes de publicar. Fichas inativas ou em rascunho não podem receber aprovação de compatibilidade.</p><div className={styles.actions}><Link href="/admin">Voltar ao painel</Link><Link href="/compatibilidade">Abrir verificador</Link></div></section>
    {error && <div className={styles.error} role="alert">{error}</div>}
    {notice && <div className={styles.notice} role="status">{notice}</div>}
    {ready && <div className={styles.layout}>
      <section className={styles.panel}><h2>Fichas cadastradas</h2><label className={styles.form}>Buscar ficha<input type="search" value={search} onChange={event => setSearch(event.target.value)} /></label><div className={styles.actions}><button className={styles.button} disabled={busy} onClick={() => setForm(create('processador'))}>+ Nova ficha</button><button className={`${styles.button} ${styles.secondary}`} disabled={busy} onClick={() => load().catch(err => setError(err.message))}>Recarregar</button></div><div className={styles.catalogue}>{visible.map(item => <button key={item.id} disabled={busy} className={`${styles.button} ${styles.secondary}`} onClick={() => edit(item)}>{item.marca} {item.modelo}<br /><small>{labels[item.tipo]} · {item.ativo ? item.status : 'inativo'} · revisão {item.revisao}</small></button>)}</div></section>
      <section className={styles.panel}><h2>{form.id ? 'Revisar ficha' : 'Cadastrar modelo'}</h2><form className={styles.form} onSubmit={save}><fieldset disabled={busy} className={styles.form}>
        <label>Categoria<select disabled={Boolean(form.id)} value={form.tipo} onChange={event => setForm(create(event.target.value))}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Identificador do modelo<input required readOnly={Boolean(form.id)} pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={140} placeholder="marca-modelo-exato" value={form.slug} onChange={event => setForm({ ...form, slug: event.target.value })} /></label>
        <label>Marca<input required maxLength={60} value={form.marca} onChange={event => setForm({ ...form, marca: event.target.value })} /></label>
        <label>Modelo e revisão do hardware<input required maxLength={140} value={form.modelo} onChange={event => setForm({ ...form, modelo: event.target.value })} /></label>
        <label>Especificações técnicas (JSON)<textarea required value={form.especificacoes} onChange={event => setForm({ ...form, especificacoes: event.target.value })} spellCheck={false} /></label>
        <p className={styles.muted}>Campos desconhecidos devem permanecer null. Na placa-mãe, suporte_cpu associa o identificador exato do processador à bios_minima; bios_versoes lista somente versões conferidas no fabricante. A ausência de um processador nesta lista gera resultado não verificado.</p>
        <label>Fontes do fabricante (JSON)<textarea required value={form.fontes} onChange={event => setForm({ ...form, fontes: event.target.value })} spellCheck={false} /></label>
        <label>Situação da revisão<select value={form.status} onChange={event => setForm({ ...form, status: event.target.value })}><option value="rascunho">Rascunho — ainda não revisado</option><option value="verificado">Verificado — informações conferidas nas fontes</option></select></label>
        <label>Disponibilidade<select value={String(form.ativo)} onChange={event => setForm({ ...form, ativo: event.target.value === 'true' })}><option value="true">Ativo</option><option value="false">Inativo</option></select></label>
        <button className={styles.button}>{busy ? 'Salvando…' : 'Salvar revisão'}</button>
      </fieldset></form></section>
    </div>}
  </div></div>
}
