import Link from 'next/link'

export const metadata = { title: 'Políticas de pagamento, trocas e serviços | EHtech', description: 'Como funcionam pagamentos externos, serviços, recebimento e denúncias na EHtech.' }
const sections = [
  ['privacidade', 'Dados usados no acesso com Google', [
    'O acesso com Google é opcional. Ao utilizá-lo, a EHtech recebe a identificação da conta Google e o e-mail informado por esse provedor para autenticar ou vincular seu cadastro. Não recebemos sua senha Google nem solicitamos acesso às suas mensagens, arquivos ou contatos.',
    'O vínculo associa a identificação Google à sua conta EHtech. O nome e a foto do Google não são importados automaticamente. Seu e-mail e os dados usados para autenticação não são exibidos no perfil público.',
    'Consulte ou remova o vínculo em Perfil → Segurança → Acesso com Google. Para remover, confirme uma senha da EHtech já definida, mantendo um meio de acesso à conta. Desvincular encerra suas sessões, mas não apaga a conta EHtech, seus anúncios ou negociações. O consentimento na conta Google é gerenciado separadamente no próprio Google.'
  ]],
  ['pagamento', 'Pagamento entre os usuários', [
    'Cada anúncio identifica o vendedor ou prestador responsável. Combine valor, forma de pagamento, prazo e condições antes de pagar ou iniciar o trabalho. Mantenha os acordos registrados no pedido, orçamento e chat.',
    'O pagamento é realizado diretamente entre as partes, fora da EHtech. O site não recebe ou guarda dinheiro, não verifica saldo bancário, não realiza repasses e não executa reembolsos. Registrar um pedido, aceitar um orçamento ou confirmar recebimento não comprova pagamento.',
    'Quem recebe o pagamento deve conferir o crédito no próprio aplicativo do banco. Imagens de comprovantes e mensagens da outra parte não substituem essa conferência. Não compartilhe senhas bancárias, códigos de acesso ou recuperação de contas.'
  ]],
  ['trocas', 'Trocas, cancelamentos e reembolsos', [
    'Se houver defeito, divergência, atraso ou falta de entrega, registre o problema no chat com o responsável e guarde as condições acordadas. Nos pedidos, utilize “Relatar problema no pedido”; nas contratações, “Relatar problema na contratação”. Suspeitas de fraude podem ser encaminhadas para moderação mesmo após o recebimento.',
    'Nas relações de consumo às quais se aplica o Código de Defesa do Consumidor, a contratação fora do estabelecimento comercial está sujeita ao direito de arrependimento de sete dias, contado na forma do artigo 49. A garantia adicional não substitui a garantia legal. Condições de uma oferta não podem afastar direitos aplicáveis.',
    'Combine por escrito a devolução, quando necessária, e a restituição do valor. Não realize novo pagamento sob promessa de desbloquear um reembolso. Como o pagamento é externo, a devolução de dinheiro deve ser tratada com o recebedor e, quando cabível, com a instituição de pagamento utilizada.',
    'A análise administrativa pode resultar em medidas de moderação, mas não executa estorno, não assegura recuperação de valores e não substitui os canais de defesa do consumidor ou as autoridades competentes.'
  ]],
  ['servicos', 'Serviços da comunidade', [
    'Os serviços são anunciados e executados pelos usuários identificados como prestadores. A aprovação do anúncio é uma medida de moderação; não certifica formação, identidade civil ou qualidade do trabalho. Consulte a descrição, o perfil e as avaliações antes de contratar.',
    'O anúncio deve descrever entregáveis, critérios de aceite, prazo, modalidade, região quando necessária e revisões incluídas. A solicitação não é um aceite automático de preço: confira o orçamento antes de aceitar. Mudanças de escopo, custos adicionais e prazos precisam ser combinados antes da execução.',
    'As condições originais ficam registradas na contratação. Alterar ou pausar o anúncio não elimina obrigações anteriores. Para cancelar, registre a situação no chat e utilize as ações disponíveis na contratação; em caso de problema, faça uma denúncia para análise.',
    'A conclusão registrada pelo prestador é uma declaração de execução. Ela não significa aprovação da qualidade pelo cliente, pagamento ou perda da possibilidade de relatar um problema.'
  ]],
  ['recebimento', 'Recebimento e segurança', [
    'Confirme o recebimento apenas depois de estar com os produtos do grupo em mãos. Para retiradas, o comprador pode gerar no pedido um código de seis dígitos e informá-lo ao vendedor após receber. O código é exclusivo daquela entrega, temporário e de uso único; gerar outro invalida o anterior.',
    'Nunca forneça o código antecipadamente para liberar envio, acompanhar rastreamento ou confirmar pagamento. O vendedor deve validá-lo na própria tela do pedido, sem pedir acesso à conta do comprador. Em envios por transportadora, confirme o recebimento dentro do site depois da entrega.',
    'Uma confirmação registra recebimento, não certifica o conteúdo ou funcionamento dos produtos e não comprova pagamento. Problemas posteriores podem ser relatados. A falta de confirmação ou de código não provoca recebimento automático.'
  ]],
  ['digitais', 'Conteúdo digital e contas', [
    'O site ainda não oferece um cofre de entrega digital ou transferência verificada de contas. Combinar a entrega pelo chat não equivale a uma venda garantida pela EHtech. Não publique senhas, códigos de recuperação ou links privados de acesso no anúncio.',
    'Somente anuncie conteúdo que tenha direito de comercializar e transferir. A venda de um item de jogo não implica autorização para vender a conta. Contas e licenças cuja transferência seja proibida pela plataforma de origem não devem ser anunciadas. Uma troca de senha não impede recuperação futura pelo titular original.',
    'Produto digital não implica exclusão automática dos direitos aplicáveis. Descreva plataforma, região, requisitos e condições de uso. Relate divergências ou acesso revogado ao responsável. Recursos específicos de entrega privada de digitais estão previstos para uma etapa posterior.'
  ]],
  ['denuncias', 'Denúncias e moderação', [
    'Use os controles de denúncia no anúncio, pedido, contratação ou conversa para informar fraude, assédio, spam ou outro problema. Descreva fatos e identifique a negociação; evite documentos, senhas ou dados pessoais desnecessários.',
    'Denúncias e evidências são encaminhadas à administração para análise privada. Uma denúncia não remove conteúdo automaticamente. Decisões ficam registradas; não há prazo garantido de resolução nem reembolso automático.',
    'A confirmação de recebimento não impede relatos posteriores. A moderação não promete impedir todas as fraudes. Preserve os registros da negociação e confira o que está sendo oferecido antes de prosseguir.'
  ]]
]
export default function PoliciesPage() {
  return <div className="site-background min-h-screen px-4 py-10 text-foreground"><article className="mx-auto max-w-4xl space-y-8">
    <Link href="/" className="font-bold text-accent underline">← Início</Link><h1 className="text-3xl font-bold">Políticas da EHtech</h1>
    <p>Versão de 22/10/2026. Entenda as condições antes de anunciar, comprar ou contratar. Os pagamentos são combinados diretamente entre os usuários.</p>
    <nav aria-label="Seções das políticas" className="flex flex-wrap gap-3">{sections.map(([id, title]) => <a key={id} href={`#${id}`} className="text-accent underline">{title}</a>)}</nav>
    {sections.map(([id, title, paragraphs]) => <section id={id} key={id} className="scroll-mt-24 space-y-4 rounded-2xl border border-line bg-surface p-5"><h2 className="text-2xl font-bold">{title}</h2>{paragraphs.map(text => <p className="leading-relaxed" key={text}>{text}</p>)}</section>)}
    <p className="text-sm text-muted">Referência: <a className="text-accent underline" href="https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm" target="_blank" rel="noreferrer">Código de Defesa do Consumidor</a>. A participação dos usuários não afasta as responsabilidades legais aplicáveis à plataforma.</p>
  </article></div>
}
