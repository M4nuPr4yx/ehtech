'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getApiUrl } from '../../lib/api'
import PassportView from './PassportView'
import { useTechnicalCatalog } from '../complements/TechnicalComponentPicker'
import styles from './passaportes.module.css'

const TYPES = ['Computador', 'Notebook', 'Celular', 'Tablet', 'Periférico', 'Outro']
const blank = { nome: '', tipo: 'Computador', modelo: '', componentes: [] }
async function api(path, method = 'GET', body, signal) {
  const response = await fetch(getApiUrl(`/passaportes${path}`), { method, signal, cache: 'no-store', headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
  const data = await response.json()
  if (!response.ok) throw new Error(data.mensagem || 'Não foi possível processar a solicitação.')
  return data
}

function EquipmentForm({ initial = blank, busy, onSave }) {
  const [form, setForm] = useState({ nome: initial.nome, tipo: initial.tipo, modelo: initial.modelo, componentes: initial.componentes })
  const catalog = useTechnicalCatalog()
  function choose(index, value) {
    const model = catalog.items.find(item => item.id === Number(value))
    const labels = { processador: 'Processador', placa_mae: 'Placa-mãe', memoria: 'Memória' }
    setForm(current => ({ ...current, componentes: current.componentes.map((item, i) => i !== index ? item : model ? { tipo: labels[model.tipo], modelo: `${model.marca} ${model.modelo}`, componente_id: model.id, revisao: model.revisao, quantidade: 1 } : { tipo: item.tipo, modelo: item.modelo.slice(0, 120) }) }))
  }
  function component(index, field, value) {
    setForm(current => ({ ...current, componentes: current.componentes.map((item, i) => i === index ? { ...item, [field]: value } : item) }))
  }
  return <form className={styles.form} onSubmit={event => { event.preventDefault(); onSave(form) }}>
    <label>Nome do equipamento<input required minLength={3} maxLength={100} placeholder="Meu PC de trabalho" value={form.nome} onChange={event => setForm({ ...form, nome: event.target.value })} /></label>
    <label>Tipo<select value={form.tipo} onChange={event => setForm({ ...form, tipo: event.target.value })}>{TYPES.map(type => <option key={type}>{type}</option>)}</select></label>
    <label>Marca e modelo (opcional)<input maxLength={120} placeholder="Marca e modelo, sem número de série" value={form.modelo} onChange={event => setForm({ ...form, modelo: event.target.value })} /></label>
    <h3>Componentes</h3>
    <p>Associe o modelo exato do catálogo para usá-lo no verificador. Peças digitadas manualmente ficam apenas como registro.</p>
    {catalog.error && <p role="status">{catalog.error} Você pode continuar com o registro manual.</p>}
    {form.componentes.map((item, index) => <div className={styles.component} key={index}>
      <label>Modelo do catálogo {index + 1}<select disabled={busy || catalog.loading} value={item.componente_id || ''} onChange={event => choose(index, event.target.value)}><option value="">Registro manual</option>{item.componente_id && !catalog.items.some(model => model.id === item.componente_id) && <option value={item.componente_id}>Modelo indisponível — selecione outro ou registro manual</option>}{catalog.items.map(model => <option key={model.id} value={model.id}>{model.marca} {model.modelo}</option>)}</select></label>
      <label>Componente {index + 1}<input required readOnly={Boolean(item.componente_id)} minLength={2} maxLength={50} placeholder="Processador, memória, SSD…" value={item.tipo} onChange={event => component(index, 'tipo', event.target.value)} /></label>
      <label>Modelo<input required readOnly={Boolean(item.componente_id)} minLength={2} maxLength={item.componente_id ? 201 : 120} placeholder="Ex.: Ryzen 5 5600" value={item.modelo} onChange={event => component(index, 'modelo', event.target.value)} /></label>
      {catalog.items.find(model => model.id === item.componente_id)?.tipo === 'memoria' && <label>Quantidade de kits<select value={item.quantidade || 1} onChange={event => component(index, 'quantidade', Number(event.target.value))}>{[1, 2, 3, 4].map(value => <option key={value}>{value}</option>)}</select></label>}
      <button type="button" disabled={busy} className={`${styles.button} ${styles.secondary}`} onClick={() => setForm({ ...form, componentes: form.componentes.filter((_, i) => i !== index) })} aria-label={`Remover componente ${index + 1}`}>Remover</button>
    </div>)}
    <div className={styles.actions}>
      <button type="button" disabled={busy || form.componentes.length >= 20} className={`${styles.button} ${styles.secondary}`} onClick={() => setForm({ ...form, componentes: [...form.componentes, { tipo: '', modelo: '' }] })}>+ Componente</button>
      <button disabled={busy} className={styles.button}>{busy ? 'Salvando…' : 'Salvar equipamento'}</button>
    </div>
    <p>Registre apenas informações do equipamento. Não inclua senhas, documentos, endereços ou outros dados pessoais: a ficha e o histórico acompanham a transferência e podem ser compartilhados.</p>
  </form>
}

export default function PassportsPage() {
  const router = useRouter()
  const [items, setItems] = useState([])
  const [active, setActive] = useState(null)
  const [passport, setPassport] = useState(null)
  const [contracts, setContracts] = useState([])
  const [revision, setRevision] = useState(0)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [invite, setInvite] = useState('')
  const [receiving, setReceiving] = useState('')
  const [username, setUsername] = useState('')
  const [eventForm, setEventForm] = useState({ tipo: 'manutencao', titulo: '', data: '' })
  const [contractId, setContractId] = useState('')

  const refresh = useCallback(async id => {
    const rows = await api('')
    setItems(rows)
    if (id !== undefined) setActive(id || rows[0]?.id || null)
    setRevision(value => value + 1)
  }, [])
  useEffect(() => {
    if (!localStorage.getItem('token')) { router.replace('/?login=1&next=%2Fpassaportes'); return }
    let cancelled = false
    async function load() {
      try {
        const response = await fetch(getApiUrl('/contratacoes'), { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }, cache: 'no-store' })
        const data = await response.json()
        if (!response.ok) throw new Error(data.mensagem || 'Não foi possível carregar serviços.')
        if (!cancelled) { setContracts(data.filter(item => item.papel === 'cliente' && item.status === 'concluido')); await refresh(null) }
      } catch (err) { if (!cancelled) setError(err.message) } finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [router, refresh])
  useEffect(() => {
    setPassport(null)
    setInvite('')
    setUsername('')
    setContractId('')
    if (!active) return
    const controller = new AbortController()
    api(`/${active}`, 'GET', undefined, controller.signal).then(setPassport).catch(err => { if (err.name !== 'AbortError') setError(err.message) })
    return () => controller.abort()
  }, [active, revision])

  async function run(job) {
    setBusy(true); setError(''); setNotice('')
    try { await job() } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  async function mutate(suffix, method = 'POST', body) {
    const data = await api(`/${active}${suffix}`, method, body)
    setNotice(data.mensagem)
    await refresh()
    return data
  }
  function exportPassport() {
    const { publico_codigo: _publicCode, transferencia_expira_em: _expires, ...data } = passport
    const url = URL.createObjectURL(new Blob([JSON.stringify({ versao: 1, ...data }, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a'); link.href = url; link.download = `passaporte-${passport.id}.json`; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const publicLink = passport?.publico_codigo && typeof window !== 'undefined' ? `${window.location.origin}/passaportes/publico/${passport.publico_codigo}` : ''

  return <div className={styles.page}><div className={styles.shell}>
    <section className={styles.hero}><span className={styles.eyebrow}>EHtech · Vida útil da tecnologia</span><h1>Meus equipamentos</h1><p>Guarde as peças e o histórico de manutenção em um passaporte digital. Comece cadastrando um equipamento; depois, acompanhe sua evolução.</p><div className={styles.actions}><Link href="/contratacoes" className={`${styles.button} ${styles.secondary}`}>Minhas contratações</Link></div></section>
    {error && <div className={styles.error} role="alert">{error}</div>}
    {notice && <div className={styles.notice} role="status">{notice}</div>}
    {loading ? <p role="status">Carregando seus equipamentos…</p> : <div className={styles.grid}>
      <aside>
        <section className={styles.panel}><h2>Meus equipamentos</h2><p>{items.length} passaporte{items.length !== 1 ? 's' : ''} na sua conta</p><div className={styles.list}>{items.map(item => <button key={item.id} disabled={busy} aria-pressed={active === item.id && !creating} onClick={() => { setActive(item.id); setCreating(false); setError(''); setNotice('') }}><strong>{item.nome}</strong><small>{item.tipo} · #{item.id}</small></button>)}</div><button disabled={busy} className={styles.button} onClick={() => setCreating(true)}>+ Novo equipamento</button></section>
        <section className={styles.panel}><h3>Receber equipamento</h3><p>O antigo dono deve gerar um convite para o seu nome de usuário. A aceitação transfere o passaporte para sua conta.</p><form className={styles.form} onSubmit={event => { event.preventDefault(); run(async () => { const data = await api('/receber', 'POST', { codigo: receiving.trim() }); setNotice(data.mensagem); setReceiving(''); setCreating(false); await refresh(data.id) }) }}><label>Código do convite<input required minLength={64} maxLength={64} value={receiving} onChange={event => setReceiving(event.target.value)} autoComplete="off" /></label><button disabled={busy} className={`${styles.button} ${styles.secondary}`}>Aceitar transferência</button></form></section>
      </aside>
      <div>
        {creating ? <section className={styles.panel}><h2>Novo equipamento</h2><EquipmentForm busy={busy} onSave={form => run(async () => { const data = await api('', 'POST', form); setNotice(data.mensagem); setCreating(false); await refresh(data.id) })} /><button className={`${styles.button} ${styles.secondary}`} disabled={busy} onClick={() => setCreating(false)}>Cancelar</button></section> : passport ? <>
          <section className={styles.panel}><PassportView passport={passport} /><div className={styles.actions}><button className={`${styles.button} ${styles.secondary}`} onClick={exportPassport}>Exportar ficha e histórico</button><Link className={`${styles.button} ${styles.secondary}`} href="/compatibilidade">Verificar compatibilidade das peças</Link></div></section>
          <details className={styles.panel}><summary>Editar ficha e componentes</summary><EquipmentForm key={`${passport.id}-${passport.updated_at}`} initial={passport} busy={busy} onSave={form => run(() => mutate('', 'PUT', form))} /></details>
          <section className={styles.panel}><h3>Adicionar manutenção ou upgrade</h3><form className={styles.form} onSubmit={event => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form).get('data'); run(async () => { await mutate('/registros', 'POST', { ...eventForm, data }); setEventForm({ tipo: 'manutencao', titulo: '', data: '' }); form.reset() }) }}><label>Categoria<select value={eventForm.tipo} onChange={event => setEventForm({ ...eventForm, tipo: event.target.value })}><option value="manutencao">Manutenção</option><option value="upgrade">Upgrade</option><option value="reparo">Reparo</option><option value="inspecao">Inspeção</option></select></label><label>O que foi feito?<input required minLength={5} maxLength={180} value={eventForm.titulo} placeholder="SSD substituído por um modelo de 1 TB" onChange={event => setEventForm({ ...eventForm, titulo: event.target.value })} /></label><label>Data<input required type="date" name="data" /></label><p>Este registro será identificado como informado pelo dono. Não inclua dados pessoais.</p><button className={styles.button} disabled={busy}>Adicionar ao histórico</button></form></section>
          <section className={styles.panel}><h3>Vincular serviço concluído na EHtech</h3><p>Selecione somente um atendimento realizado neste equipamento. Cada contratação pode ser vinculada a um único passaporte.</p>{contracts.length ? <form className={styles.form} onSubmit={event => { event.preventDefault(); run(() => mutate('/servicos', 'POST', { contratacao_id: Number(contractId) })) }}><label>Serviço<select required value={contractId} onChange={event => setContractId(event.target.value)}><option value="">Selecione uma contratação</option>{contracts.map(item => <option key={item.id_contratacao} value={item.id_contratacao}>#{item.id_contratacao} · {item.servico_titulo}</option>)}</select></label><button className={styles.button} disabled={busy}>Confirmar vínculo com este equipamento</button></form> : <p>Você ainda não tem serviços concluídos para vincular. <Link href="/servicos">Explorar serviços</Link></p>}</section>
          <section className={styles.panel}><h3>Compartilhar para consulta</h3><p>O link mostra componentes e histórico, sem os dados da sua conta ou das contratações. Qualquer pessoa com o link poderá consultar. Revogar o link interrompe novas consultas.</p><div className={styles.actions}><button className={styles.button} disabled={busy} onClick={() => run(() => mutate('/compartilhamento'))}>{publicLink ? 'Gerar outro link' : 'Ativar link de consulta'}</button>{publicLink && <button className={`${styles.button} ${styles.secondary}`} disabled={busy} onClick={() => run(() => mutate('/compartilhamento', 'DELETE'))}>Revogar link</button>}</div>{publicLink && <div className={styles.form}><label>Link de consulta<input readOnly className={styles.code} value={publicLink} onFocus={event => event.target.select()} /></label><Link href={`/passaportes/publico/${passport.publico_codigo}`} target="_blank" rel="noreferrer">Abrir consulta pública ↗</Link></div>}</section>
          <details className={styles.panel}><summary>Transferir para um novo dono</summary><p>O histórico acompanha o equipamento. Você mantém o controle até o destinatário aceitar. O aceite encerra seu acesso e revoga o link público anterior.</p><form className={styles.form} onSubmit={event => { event.preventDefault(); run(async () => { const data = await api(`/${active}/transferencia`, 'POST', { username }); setInvite(data.codigo); setNotice(data.mensagem); const updated = await api(`/${active}`); setPassport(updated) }) }}><label>Nome de usuário do novo dono<input required minLength={3} maxLength={30} value={username} onChange={event => setUsername(event.target.value)} /></label><button className={styles.button} disabled={busy}>Gerar convite para esta conta</button></form>{invite && <label className={styles.form}>Envie este código ao destinatário<input readOnly className={styles.code} value={invite} onFocus={event => event.target.select()} /></label>}{passport.transferencia_expira_em && <><p>Convite válido até {new Date(passport.transferencia_expira_em).toLocaleString('pt-BR')}. Um novo convite invalida o anterior.</p><button className={`${styles.button} ${styles.secondary}`} disabled={busy} onClick={() => run(() => mutate('/transferencia', 'DELETE'))}>Cancelar convite</button></>}</details>
          <details className={styles.panel}><summary>Excluir passaporte</summary><p>A exclusão remove a ficha, os registros e os links. Exporte o histórico antes se quiser guardá-lo.</p><button className={`${styles.button} ${styles.danger}`} disabled={busy} onClick={() => { if (window.confirm('Excluir definitivamente este passaporte e todo o histórico?')) run(async () => { const data = await api(`/${active}`, 'DELETE'); setNotice(data.mensagem); await refresh(null) }) }}>Excluir definitivamente</button></details>
        </> : <section className={styles.panel}><h2>{active ? 'Carregando passaporte…' : 'Uma história começa com o seu equipamento'}</h2><p>{active ? 'Buscando a ficha e o histórico.' : 'Cadastre seu primeiro equipamento para guardar componentes e acompanhar cada manutenção.'}</p></section>}
      </div>
    </div>}
  </div></div>
}
