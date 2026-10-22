import Image from 'next/image'
import ehtechLogo from '../../../public/ehtech-logo.png'
export default function PageLoading() {
  return <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground" role="status" aria-label="Carregando página"><div className="flex flex-col items-center text-center"><Image src={ehtechLogo} alt="EHtech" sizes="153px" quality={50} priority className="h-32 w-auto object-contain motion-safe:animate-pulse" /><p className="mt-8 font-bold text-accent">EHtech marketplace</p><p className="mt-4 text-sm text-muted">Carregando conteúdo…</p></div></div>
}
