import styles from './LoadingState.module.css'

export default function LoadingState({ label = 'Carregando conteúdo…', detail = 'Você pode continuar navegando pelo menu.', fullPage = false }) {
  return <div className={`${styles.state} ${fullPage ? styles.page : ''}`} role="status" aria-live="polite" aria-atomic="true">
    <span className={styles.orbit} aria-hidden="true"><span /></span>
    <div><p className={styles.label}>{label}</p>{detail && <p className={styles.detail}>{detail}</p>}</div>
  </div>
}
