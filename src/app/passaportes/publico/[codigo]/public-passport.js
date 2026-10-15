'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getApiUrl } from '../../../../lib/api'
import PassportView from '../../PassportView'
import styles from '../../passaportes.module.css'

export default function PublicPassport({ code }) {
  const [passport, setPassport] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const response = await fetch(getApiUrl(`/passaportes/publico/${encodeURIComponent(code)}`), { cache: 'no-store', signal: controller.signal, referrerPolicy: 'no-referrer' })
        const data = await response.json()
        if (!response.ok) throw new Error(data.mensagem || 'Link indisponível ou revogado.')
        setPassport(data)
      } catch (err) { if (err.name !== 'AbortError') setError(err.message) }
    }
    load()
    return () => controller.abort()
  }, [code])
  return <main className={styles.page}><div className={styles.public}><section className={styles.hero}><span className={styles.eyebrow}>EHtech · Consulta compartilhada</span><h1>A história deste equipamento</h1><p>Ficha compartilhada pelo proprietário. Registros manuais são declarações do dono; serviços concluídos na plataforma têm indicação própria.</p></section>{error ? <div className={styles.error} role="alert">{error}</div> : passport ? <section className={styles.panel}><PassportView passport={passport} /></section> : <p role="status">Consultando passaporte…</p>}<Link href="/passaportes">Criar ou acessar meus passaportes →</Link></div></main>
}
