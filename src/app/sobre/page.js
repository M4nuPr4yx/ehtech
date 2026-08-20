import Link from 'next/link';

export default function Sobre() {
  return (
    <div className="site-background relative min-h-screen overflow-hidden text-white pt-12 pb-24">
      {/* Background Gradients */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[28rem] w-[45rem] rounded-full bg-[radial-gradient(circle,_rgba(171,219,37,0.12)_0%,_transparent_70%)] blur-3xl" />
        <div className="absolute bottom-10 right-10 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(171,219,37,0.06)_0%,_transparent_70%)] blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#ABDB25]/30 bg-[#ABDB25]/10 px-4 py-1.5 text-xs font-semibold text-[#d7f58d] mb-4">
            Conheça nossa história e propósito
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-6">
            Sobre a <span className="text-[#ABDB25]">EHtech</span>
          </h1>
          <p className="text-base sm:text-lg text-gray-300 leading-relaxed">
            Revolucionando o ecossistema de compra, venda e troca de produtos tecnológicos com foco em segurança, preços justos e conexão direta.
          </p>
        </div>

        {/* Story & Mission Box */}
        <div className="rounded-3xl border border-white/10 bg-[#121612]/90 p-8 sm:p-12 mb-12 shadow-2xl backdrop-blur-md">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#ABDB25]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            O que é o EHtech?
          </h2>
          <p className="text-gray-300 leading-relaxed text-sm sm:text-base mb-6">
            A <strong>EHtech</strong> é uma plataforma moderna inspirada nos maiores marketplaces globais de tecnologia. Criada para suprir a necessidade de um ambiente dedicado, limpo e seguro para entusiastas de hardware, computadores, consoles, smartphones e periféricos.
          </p>
          <p className="text-gray-300 leading-relaxed text-sm sm:text-base">
            Aqui, qualquer pessoa pode anunciar itens que não utiliza mais ou encontrar equipamentos seminovos e novos com garantia de pagamento, sem burocracia e com comunicação direta via chat em tempo real.
          </p>
        </div>

        {/* 3 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="rounded-2xl border border-white/10 bg-[#121612] p-6">
            <div className="h-12 w-12 rounded-xl bg-[#ABDB25]/10 border border-[#ABDB25]/30 text-[#ABDB25] flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Garantia e Proteção</h3>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              O pagamento do comprador fica retido com segurança até a confirmação de recebimento do produto em perfeito estado.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#121612] p-6">
            <div className="h-12 w-12 rounded-xl bg-[#ABDB25]/10 border border-[#ABDB25]/30 text-[#ABDB25] flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Chat em Tempo Real</h3>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              Tire dúvidas, faça contrapropostas e combine entregas diretamente com o vendedor através do nosso sistema de mensagens instantâneas.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#121612] p-6">
            <div className="h-12 w-12 rounded-xl bg-[#ABDB25]/10 border border-[#ABDB25]/30 text-[#ABDB25] flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14v6" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Projeto SENAI 914</h3>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              Desenvolvido com excelência técnica na Escola SENAI &quot;Santo Paschoal Crepaldi&quot;, em Presidente Prudente - SP (2026).
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-gradient-to-r from-[#ABDB25]/10 via-[#ABDB25]/20 to-[#ABDB25]/10 border border-[#ABDB25]/30 rounded-3xl p-8 sm:p-10">
          <h3 className="text-2xl font-bold text-white mb-2">Pronto para fazer bons negócios?</h3>
          <p className="text-sm text-gray-300 mb-6 max-w-md mx-auto">Explore nosso catálogo ou comece a vender seus equipamentos hoje mesmo.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/produtos"
              className="rounded-xl bg-[#ABDB25] px-6 py-3 text-sm font-extrabold text-black hover:bg-white transition-all shadow-lg shadow-[#ABDB25]/20"
            >
              Ver Produtos
            </Link>
            <Link
              href="/anunciar"
              className="rounded-xl border border-white/20 bg-white/[0.06] px-6 py-3 text-sm font-semibold text-white hover:border-[#ABDB25] hover:text-[#ABDB25] transition-all"
            >
              Quero Anunciar
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

