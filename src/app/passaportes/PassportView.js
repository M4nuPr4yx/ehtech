import styles from './passaportes.module.css'

const labels = { manutencao: 'Manutenção', upgrade: 'Upgrade', reparo: 'Reparo', inspecao: 'Inspeção', servico: 'Serviço', transferencia: 'Transferência', cadastro: 'Atualização' }
const date = (value, manual = false) => new Date(value).toLocaleDateString('pt-BR', { timeZone: manual ? 'UTC' : 'America/Sao_Paulo' })

export default function PassportView({ passport }) {
  return <>
    <h2>{passport.nome}</h2>
    <p>{passport.tipo}{passport.modelo && ` · ${passport.modelo}`}</p>
    <p className={styles.muted}>Passaporte #{passport.id} · Criado em {date(passport.created_at)}</p>
    <hr />
    <h3>Componentes atuais</h3>
    {passport.componentes.length ? <div className={styles.chips}>{passport.componentes.map((item, index) => <span key={index}><strong>{item.tipo}</strong> · {item.modelo}{item.componente_id && ` · Catálogo #${item.componente_id}`}{item.quantidade > 1 && ` · ${item.quantidade} kits`}</span>)}</div> : <p>Nenhum componente cadastrado.</p>}
    <hr />
    <h3>Histórico do equipamento</h3>
    <p>A conclusão dos serviços EHtech é confirmada na plataforma. A associação ao equipamento é informada pelo proprietário e não representa um laudo técnico.</p>
    {passport.registros.length ? <ol className={styles.timeline}>{passport.registros.map(item => <li key={item.id}>
      <time dateTime={new Date(item.ocorrido_em).toISOString()}>{date(item.ocorrido_em, item.origem === 'manual' && item.tipo !== 'cadastro')}</time>
      <span className={`${styles.badge} ${item.origem === 'ehtech' ? styles.verified : ''}`}>{item.origem === 'ehtech' ? 'Concluído na EHtech' : item.origem === 'plataforma' ? 'Evento da plataforma' : 'Informado pelo dono'}</span>
      <strong>{item.titulo}</strong>
      <small>{labels[item.tipo] || item.tipo}{item.garantia_fim_em && ` · Garantia do serviço até ${date(item.garantia_fim_em)}`}</small>
    </li>)}</ol> : <p>O histórico ainda está vazio. Registre a primeira manutenção ou vincule um serviço concluído.</p>}
  </>
}
