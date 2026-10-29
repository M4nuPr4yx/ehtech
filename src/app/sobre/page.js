import Link from 'next/link';

const paths = [
  { title: 'Encontre um equipamento', text: 'Busque por nome ou categoria, confira os detalhes do anúncio e converse com o vendedor para combinar a compra.', href: '/produtos', action: 'Explorar produtos' },
  { title: 'Venda o que você não usa', text: 'Crie um anúncio com fotos, preço e descrição. Após a aprovação, ele aparece no catálogo e você recebe interessados pelo chat.', href: '/anunciar', action: 'Criar anúncio' },
  { title: 'Contrate ou ofereça um serviço', text: 'Escolha um serviço e peça um orçamento. Alinhe o valor e o prazo, depois acompanhe o atendimento nas suas contratações.', href: '/servicos', action: 'Encontrar um serviço' },
];

export default function Sobre() {
  return <div className="site-background min-h-screen px-4 sm:px-6 py-10 sm:py-14">
    <div className="max-w-6xl mx-auto">
      <header className="max-w-2xl mb-10">
        <p className="text-xs font-semibold tracking-widest uppercase text-accent mb-3">Comece por aqui</p>
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4">Como funciona a EHtech</h1>
        <p className="text-muted leading-relaxed">Um lugar para encontrar produtos, anunciar equipamentos e contratar serviços de programação, design, aulas e muito mais. Escolha o que você precisa fazer.</p>
      </header>
      <section className="grid md:grid-cols-3 gap-5" aria-label="Primeiros passos">
        {paths.map(item => <article key={item.href} className="rounded-2xl border border-line bg-surface p-6 flex flex-col">
          <h2 className="text-xl font-semibold mb-3">{item.title}</h2>
          <p className="text-sm text-muted leading-relaxed mb-6">{item.text}</p>
          <Link className="text-sm font-semibold text-accent hover:underline mt-auto" href={item.href}>{item.action} →</Link>
        </article>)}
      </section>
      <section className="grid sm:grid-cols-2 gap-5 my-8" aria-label="Cuide da sua tecnologia">
        <Link href="/compatibilidade" className="rounded-2xl border border-line bg-surface p-6 tech-card-hover"><h2 className="font-semibold text-lg mb-2">Confira antes de montar →</h2><p className="text-sm text-muted">Selecione processador, placa-mãe e memória para conferir os requisitos de compatibilidade.</p></Link>
        <Link href="/passaportes" className="rounded-2xl border border-line bg-surface p-6 tech-card-hover"><h2 className="font-semibold text-lg mb-2">Organize seus equipamentos →</h2><p className="text-sm text-muted">Guarde as peças e o histórico de manutenção em um passaporte digital do equipamento.</p></Link>
      </section>
      <section className="border-t border-line pt-8 max-w-3xl">
        <h2 className="text-lg font-semibold mb-3">Sobre o projeto</h2>
        <p className="text-sm text-muted leading-relaxed">A EHtech é um marketplace acadêmico desenvolvido por Emanuel Gomes dos Santos Silva e Hugo Renato Espinola de Macedo no SENAI &quot;Santo Paschoal Crepaldi&quot;, em Presidente Prudente – SP, turma SENAI 914 (2026).</p>
      </section>
    </div>
  </div>;
}
