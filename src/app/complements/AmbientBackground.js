import styles from './AmbientBackground.module.css'

export default function AmbientBackground() {
  return <div className={styles.background} aria-hidden="true" data-ambient-background>
    <div className={styles.scene} />
    <div className={styles.glow} />
    <div className={styles.particles} />
  </div>
}
