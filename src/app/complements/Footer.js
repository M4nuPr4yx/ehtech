import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.08] bg-[#050705] text-white/80">
      {/* Upper Footer: Links & Info */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="inline-flex items-center" aria-label="EHtech Home">
              <img src="/ehtech-logo.png" alt="EHtech" className="h-10 w-auto object-contain" />
            </Link>
            <p className="max-w-sm text-xs sm:text-sm leading-relaxed text-gray-400">
              O marketplace de tecnologia para comprar equipamentos e encontrar especialistas em TI com agilidade, transparência e contato direto.
            </p>
            <div className="flex items-center gap-3 pt-2 text-xs text-[#d7f58d]">
              <span className="flex h-2 w-2 rounded-full bg-[#ABDB25] animate-pulse"></span>
              Plataforma desenvolvida no SENAI Santo Paschoal Crepaldi
            </div>
          </div>

          {/* Categories Col */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#ABDB25] mb-4">Departamentos</h4>
            <ul className="space-y-2 text-xs sm:text-sm text-gray-400">
              <li><Link href="/produtos?categoria=smartphones" className="hover:text-white transition-colors">Smartphones</Link></li>
              <li><Link href="/produtos?categoria=notebooks" className="hover:text-white transition-colors">Notebooks & MacBooks</Link></li>
              <li><Link href="/produtos?categoria=computadores" className="hover:text-white transition-colors">PCs Gamer & Setups</Link></li>
              <li><Link href="/produtos?categoria=games" className="hover:text-white transition-colors">Consoles & Games</Link></li>
              <li><Link href="/produtos?categoria=audio" className="hover:text-white transition-colors">Áudio & Headsets</Link></li>
              <li><Link href="/produtos?categoria=acessorios" className="hover:text-white transition-colors">Periféricos & Acessórios</Link></li>
              <li><Link href="/servicos" className="hover:text-white transition-colors text-[#cde99a]">Serviços de TI</Link></li>
            </ul>
          </div>

          {/* Institucional Col */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#ABDB25] mb-4">Institucional</h4>
            <ul className="space-y-2 text-xs sm:text-sm text-gray-400">
              <li><Link href="/sobre" className="hover:text-white transition-colors">Sobre a EHtech</Link></li>
              <li><Link href="/anunciar" className="hover:text-white transition-colors">Como Anunciar</Link></li>
              <li><Link href="/produtos" className="hover:text-white transition-colors">Explorar Produtos</Link></li>
              <li><Link href="/servicos" className="hover:text-white transition-colors">Explorar Serviços</Link></li>
              <li><Link href="/carrinho" className="hover:text-white transition-colors">Meu Carrinho</Link></li>
              <li><Link href="/mensagens" className="hover:text-white transition-colors">Central de Mensagens</Link></li>
            </ul>
          </div>

          {/* Segurança & Pagamentos */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#ABDB25] mb-4">Segurança & Garantia</h4>
            <div className="space-y-3 text-xs text-gray-400">
              <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] p-2.5 border border-white/[0.06]">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#ABDB25]/10 text-[#ABDB25]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <span><strong>Proteção EHtech:</strong> Retenção de valor até confirmação de recebimento.</span>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] p-2.5 border border-white/[0.06]">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#ABDB25]/10 text-[#ABDB25]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <span>Transações criptografadas com protocolo seguro SSL.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Legal bar */}
      <div className="border-t border-white/[0.06] bg-[#030403] px-4 sm:px-6 py-4">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row justify-between items-center gap-2 text-center text-xs text-gray-500">
          <p>© 2026 EHtech – Marketplace de Tecnologia. Todos os direitos reservados.</p>
          <p>Emanuel Gomes dos Santos Silva & Hugo Renato Espinola de Macedo • SENAI 914</p>
        </div>
      </div>
    </footer>
  );
}
