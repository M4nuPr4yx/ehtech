import Link from 'next/link';

export default function Footer() {
  return <footer className="border-t border-line bg-surface">
    <div className="max-w-7xl mx-auto px-6 py-10 grid gap-8 sm:grid-cols-3">
      <div><Link href="/" className="text-2xl font-bold tracking-tight">EH<span className="text-accent">tech</span></Link><p className="text-sm text-muted mt-3 max-w-xs">Produtos, serviços e cuidado com a sua tecnologia, em um só lugar.</p></div>
      <nav aria-label="Explorar"><h2 className="text-sm font-semibold mb-3">Explore</h2><div className="flex flex-col gap-2 text-sm text-muted"><Link href="/produtos" className="hover:text-accent">Produtos</Link><Link href="/servicos" className="hover:text-accent">Serviços da comunidade</Link><Link href="/compatibilidade" className="hover:text-accent">Compatibilidade de peças</Link><Link href="/sobre" className="hover:text-accent">Como funciona</Link></div></nav>
      <nav aria-label="Sua conta"><h2 className="text-sm font-semibold mb-3">Sua conta</h2><div className="flex flex-col gap-2 text-sm text-muted"><Link href="/anunciar" className="hover:text-accent">Criar anúncio</Link><Link href="/passaportes" className="hover:text-accent">Meus equipamentos</Link><Link href="/meus-servicos" className="hover:text-accent">Meus serviços</Link><Link href="/politicas" className="hover:text-accent">Pagamento, trocas e segurança</Link><Link href="/contratacoes" className="hover:text-accent">Minhas contratações</Link><Link href="/mensagens" className="hover:text-accent">Mensagens</Link></div></nav>
    </div>
    <div className="border-t border-line px-6 py-4 text-xs text-muted text-center"><p>© 2026 EHtech · Marketplace de Tecnologia</p><p className="mt-1">Emanuel Gomes dos Santos Silva &amp; Hugo Renato Espinola de Macedo · SENAI 914</p></div>
  </footer>;
}
