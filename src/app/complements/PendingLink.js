'use client'

import Link, { useLinkStatus } from 'next/link'
import { createPortal } from 'react-dom'
import styles from './PendingLink.module.css'

function NavigationProgress() {
  const { pending } = useLinkStatus()
  if (!pending) return null
  return createPortal(<>
    <span className={styles.bar} aria-hidden="true" />
    <span className={styles.announcement} role="status" aria-live="polite">Carregando página…</span>
  </>, document.body)
}

// Indica a transição no cliente sem antecipar um HTTP 200 em páginas com 404.
export default function PendingLink({ children, ...props }) {
  return <Link {...props}>{children}<NavigationProgress /></Link>
}
