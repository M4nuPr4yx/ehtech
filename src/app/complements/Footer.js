import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#060806] text-white/80">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 md:grid-cols-[1.4fr_1fr] md:items-end">
        <div>
          <p className="text-xl font-extrabold tracking-[-0.05em] text-white">EH<span className="text-[#ABDB25]">tech</span></p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-gray-400">Tecnologia circulando entre pessoas, com uma experiência simples para comprar, vender e descobrir.</p>
        </div>
        <nav aria-label="Links do rodapé" className="flex flex-wrap gap-x-5 gap-y-3 text-sm font-medium text-gray-400 md:justify-end">
          <Link href="/produtos" className="transition-colors hover:text-[#ABDB25]">Produtos</Link>
          <Link href="/anunciar" className="transition-colors hover:text-[#ABDB25]">Anunciar</Link>
          <Link href="/sobre" className="transition-colors hover:text-[#ABDB25]">Sobre nós</Link>
        </nav>
      </div>
      <div className="border-t border-white/5 px-6 py-4 text-center text-xs text-gray-500">© 2026 EHtech. Todos os direitos reservados.</div>
    </footer>
  );
}
