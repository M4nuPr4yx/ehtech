import Link from 'next/link';

const paths = [
  { title: 'Encontre um equipamento', text: 'Busque por nome ou categoria e escolha Iniciar pedido no anúncio. Você pode tirar dúvidas pelo chat antes de registrar.', href: '/produtos', action: 'Explorar produtos' },
  { title: 'Venda o que você não usa', text: 'Crie um anúncio com fotos, preço e descrição. Após a aprovação, ele aparece no catálogo e você recebe interessados pelo chat.', href: '/anunciar', action: 'Criar anúncio' },
  { title: 'Contrate ou ofereça um serviço', text: 'Escolha um serviço e peça um orçamento. Alinhe o valor e o prazo, depois acompanhe o atendimento nas suas contratações.', href: '/servicos', action: 'Encontrar um serviço' },
];

export default function Sobre() {
  return <div className="site-background min-h-screen px-4 sm:px-6 py-10 sm:py-14">
    <div className="max-w-6xl mx-auto">
      <header className="max-w-2xl mb-10">
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
      <section className="my-8 rounded-2xl border border-line bg-surface p-6" aria-labelledby="purchase-steps">
        <h2 id="purchase-steps" className="mb-3 text-xl font-semibold">Como comprar um produto</h2>
        <ol className="list-decimal space-y-2 pl-5 text-muted">
          <li>Escolha entrega ou solicite retirada, revise os itens e registre o pedido. A EHtech avisa o vendedor.</li>
          <li>Abra o pedido para conversar com o vendedor. Revise e aceite a proposta de envio ou de retirada.</li>
          <li>Combine o pagamento fora da EHtech e registre o recebimento no pedido quando estiver com o produto.</li>
        </ol>
      </section>
      <section className="my-8" aria-labelledby="compatibility-link-heading">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-6">
          <div>
            <h2 id="compatibility-link-heading" className="mb-2 text-xl font-semibold">Confira antes de montar</h2>
            <p className="text-sm leading-relaxed text-muted">Selecione processador, placa-mãe e memória para conferir a compatibilidade entre as peças.</p>
          </div>
          <Link href="/compatibilidade" className="rounded-xl border border-line px-4 py-3 text-sm font-semibold text-accent hover:bg-surface-raised">Conferir compatibilidade →</Link>
        </div>
      </section>
      <section className="border-t border-line pt-8 max-w-3xl">
        <h2 className="text-lg font-semibold mb-3">Sobre o projeto</h2>
        <p className="text-sm text-muted leading-relaxed">A EHtech é um marketplace acadêmico desenvolvido por Emanuel Gomes dos Santos Silva e Hugo Renato Espinola de Macedo no SENAI &quot;Santo Paschoal Crepaldi&quot;, em Presidente Prudente – SP, turma SENAI 914 (2026).</p>
      </section>
    </div>
  </div>;
}
