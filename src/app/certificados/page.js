'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CertificateReport, Frame, Feedback, request, styles } from '../complements/DifferentialsUI'

const statusLabels = { pendente: 'Aguardando inspeção', emitido: 'Emitido', reprovado: 'Reprovado', revogado: 'Revogado', expirado: 'Expirado', desatualizado: 'Desatualizado' }
function Inspection({ item, criteria, busy, onIssue, onRevoke }) {
  function submit(event) {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget))
    onIssue(item.id, { checklist: Object.fromEntries(Object.keys(criteria).map(key => [key, values[key]])), laudo: values.laudo, confirmo_inspecao: values.confirmo_inspecao === 'on' })
  }
  return <section className={styles.card}><span className={styles.badge}>#{item.id} · {statusLabels[item.status]}</span><h2>{item.produto_nome}</h2><p>{item.equipamento?.nome} · {item.equipamento?.modelo} · Atendimento #{item.contratacao_id}</p><ul>{item.equipamento?.componentes.map((component, index) => <li key={index}>{component.tipo}: {component.modelo}</li>)}</ul><Link href={`/produtos/${item.produto_id}`}>Consultar anúncio</Link>{item.papel === 'tecnico' && item.status === 'pendente' && <form className={styles.form} onSubmit={submit}><h3>Laudo do prestador responsável</h3><p>Registre somente testes que você realizou no mesmo equipamento e anúncio. Resultados reprovados não geram selo. Para temperaturas, armazenamento e bateria, descreva medições e método no laudo; justifique os itens não aplicáveis. Não inclua dados pessoais: o laudo aprovado ficará público no anúncio.</p>{Object.entries(criteria).map(([key, label]) => <label key={key}>{label}<select required name={key}><option value="">Resultado</option><option value="aprovado">Aprovado</option><option value="reprovado">Reprovado</option>{!['funcionamento', 'integridade'].includes(key) && <option value="nao_aplicavel">Não aplicável (justificar no laudo)</option>}</select></label>)}<label>Laudo técnico e medições<textarea name="laudo" required minLength={20} maxLength={2000} /></label><label className={styles.check}><input required type="checkbox" name="confirmo_inspecao" />Confirmo que inspecionei este equipamento, que ele corresponde ao anúncio e que os resultados são os observados.</label><button disabled={busy}>Finalizar inspeção</button></form>}{item.checklist && <CertificateReport certificate={item} />}{['pendente', 'emitido', 'desatualizado'].includes(item.status) && <button className={styles.button} disabled={busy} onClick={() => { if (window.confirm('Revogar esta inspeção e retirar o selo do anúncio?')) onRevoke(item.id) }}>Revogar inspeção</button>}</section>
}

export default function CertificatesPage() {
  const [data, setData] = useState(null), [passports, setPassports] = useState([]), [products, setProducts] = useState([]), [contracts, setContracts] = useState([]), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState(''), [notice, setNotice] = useState(''), [loggedIn, setLoggedIn] = useState(false)
  async function load(signal) {
    const [certificates, equipment, options, services] = await Promise.all([request('/certificados', 'GET', undefined, signal), request('/passaportes', 'GET', undefined, signal), request('/combos/opcoes', 'GET', undefined, signal), request('/contratacoes', 'GET', undefined, signal)])
    setData(certificates); setPassports(equipment); setProducts(options.produtos); setContracts(services.filter(item => item.papel === 'cliente' && item.status === 'concluido'))
  }
  useEffect(() => {
    if (!localStorage.getItem('token')) { setLoading(false); return }
    setLoggedIn(true)
    const controller = new AbortController()
    load(controller.signal).catch(err => { if (err.name !== 'AbortError') setError(err.message) }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])
  async function run(path, method, body) {
    setBusy(true); setError(''); setNotice('')
    try { const result = await request(path, method, body); setNotice(result.mensagem); await load() } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  function submit(event) {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget))
    run('/certificados', 'POST', { ...values, produto_usado: values.produto_usado === 'on' })
  }
  return <Frame title="Certificados de produtos usados" intro="Um checklist de inspeção vincula o anúncio ao passaporte e a um atendimento concluído. Somente o prestador responsável pode emitir o laudo. O selo vale por 90 dias e não substitui garantias legais."><Feedback error={error} notice={notice} />{loading ? <p role="status">Carregando inspeções…</p> : !loggedIn ? <section className={styles.card}><Link href="/?login=1&next=%2Fcertificados">Entre para solicitar ou responder uma inspeção</Link></section> : <><section className={styles.card}><h2>Solicitar inspeção do meu usado</h2><p>Cadastre o equipamento em <Link href="/passaportes">Meus equipamentos</Link> e vincule a ele o atendimento concluído. Selecione um anúncio aprovado seu que represente esse equipamento. Ao solicitar, você autoriza o prestador a consultar esta ficha e publicar o laudo no anúncio; um certificado anterior desse anúncio será revogado.</p>{passports.length && products.length && contracts.length ? <form className={styles.form} onSubmit={submit}><label>Passaporte<select required name="passaporte_id"><option value="">Selecione</option>{passports.map(item => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label><label>Meu anúncio aprovado<select required name="produto_id"><option value="">Selecione</option>{products.map(item => <option key={item.id_produto} value={item.id_produto}>{item.nome}</option>)}</select></label><label>Atendimento concluído e já vinculado ao passaporte<select required name="contratacao_id"><option value="">Selecione</option>{contracts.map(item => <option key={item.id_contratacao} value={item.id_contratacao}>#{item.id_contratacao} · {item.servico_titulo}</option>)}</select></label><label className={styles.check}><input required name="produto_usado" type="checkbox" />Confirmo que é um produto usado, corresponde ao passaporte e autorizo a inspeção desta ficha pelo prestador.</label><button disabled={busy}>Solicitar ao prestador</button></form> : <p>Você precisa de um passaporte, um anúncio aprovado e um atendimento concluído como cliente, vinculado ao passaporte.</p>}<p>Editar a ficha, a descrição, o modelo, a imagem ou transferir o passaporte invalida o selo. Mudanças de preço/estoque não renovam a validade. Exclusão do passaporte remove a inspeção.</p></section><h2 className={styles.eyebrow}>Minhas solicitações e inspeções recebidas</h2>{!data?.itens.length && <p>Nenhuma inspeção encontrada.</p>}<div className={styles.grid}>{data?.itens.map(item => <Inspection key={item.id} item={item} criteria={data.criterios} busy={busy} onIssue={(id, body) => run(`/certificados/${id}/laudo`, 'POST', body)} onRevoke={id => run(`/certificados/${id}`, 'DELETE')} />)}</div></>}</Frame>
}
