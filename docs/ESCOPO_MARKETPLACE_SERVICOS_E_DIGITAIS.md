# Escopo proposto para serviços e produtos digitais

Data: 22/10/2026. Status: primeiras prioridades autorizadas pelo usuário, implementadas e verificadas localmente. Pagamento externo mantido; nenhum serviço externo ou gateway contratado. A entrega inicial compreende serviços da comunidade, categorias predefinidas mais amplas, moderação, políticas, denúncias de negociações e código de retirada. Veja [SERVICOS_DA_COMUNIDADE.md](SERVICOS_DA_COMUNIDADE.md) para funcionamento, resultados dos testes e limites. As demais capacidades abaixo permanecem como escopo posterior.

## Objetivo

Transformar a EHtech em um marketplace no qual os usuários anunciam produtos físicos, produtos digitais e serviços de diferentes áreas. A interface deve identificar o vendedor ou prestador responsável por cada oferta e explicar o papel da plataforma, seus canais de atendimento e suas responsabilidades aplicáveis.

Na avaliação inicial, o projeto oferecia leitura do catálogo de serviços e contratação de um prestador, sem publicação de serviços pelo usuário, e gerava serviços de exemplo automaticamente. A primeira etapa descrita no início deste documento altera esse comportamento. O checkout não cobra nem confirma pagamento; pedidos permanecem com pagamento não iniciado. Disputa bilateral, devolução e reembolso automatizados permanecem fora desta entrega.

## 1. Serviços publicados pelos usuários

- Qualquer usuário autenticado e elegível poderá publicar uma oferta, sem precisar ser administrador. A mesma conta poderá comprar, vender e prestar serviços.
- O fluxo de criação de anúncio oferecerá três tipos: produto físico, produto digital e serviço.
- Criar uma área de meus anúncios com ofertas de serviço, edição, pausa, reativação e arquivamento. Somente o proprietário poderá gerenciar sua oferta; a administração fará a moderação.
- Serviços novos passarão por aprovação, como os produtos. Alterações materiais de conteúdo, categoria, preço e condições poderão exigir nova análise. Durante a análise, a versão pública aprovada não será substituída por conteúdo não aprovado.
- Informar título, descrição, categoria, imagens/portfólio, prestador, modalidade presencial/remota/híbrida, local de atendimento quando necessário, prazo, disponibilidade e preço fixo, a partir de ou sob orçamento.
- Informar o que está incluído, entregáveis, critérios de aceite, quantidade de revisões e condições adicionais. Uma informação omitida não poderá ser presumida como aceita pelo cliente.
- Manter solicitação, orçamento, aceite, execução e conclusão; acrescentar entrega para análise, pedido de ajuste e contestação com papéis e transições explícitos.
- O orçamento aceito guardará uma cópia das condições, valores e prazos. A edição posterior do anúncio não alterará contratações em andamento.
- Ampliar categorias para programação e sites, design e ilustração, edição de vídeo/áudio, fotografia, marketing, redação/tradução, aulas e mentoria, consultoria e suporte/manutenção. A administração poderá gerenciar as categorias.
- Generalizar termos como problema do aparelho, reputação técnica e garantia para necessidade, avaliação do prestador e condições do serviço. Integração com passaportes de equipamentos será opcional e específica das categorias pertinentes.
- Interromper a geração automática de ofertas de demonstração no catálogo real. Ofertas antigas e contratações não serão apagadas nem terão proprietário trocado automaticamente; a migração distinguirá exemplos de ofertas legítimas antes de ocultá-los ou arquivá-los.

## 2. Produtos digitais

- Classificar explicitamente o anúncio como físico ou digital; ausência de frete não será usada como única identificação de um produto digital.
- Permitir categorias como arquivos de autoria própria, templates, materiais digitais, licenças/códigos com revenda autorizada e itens de jogos cuja negociação externa e transferência sejam permitidas pela plataforma de origem.
- Informar plataforma/jogo, região, requisitos, conteúdo recebido, limitações de uso, prazo e método de entrega, possibilidade de transferência e condições de suporte.
- Produtos digitais não pedirão endereço físico ou frete. Em pedidos mistos, cada item e vendedor terá acompanhamento próprio e apenas os itens físicos usarão entrega física.
- Arquivos e códigos terão entrega privada vinculada ao pedido e ao comprador. Não usar o armazenamento público de fotos para armazenar conteúdo comprado ou segredos de entrega.
- Unidades digitais exclusivas terão reserva temporária e entrega atômica para evitar vender o mesmo código ou item a dois compradores. A liberação da reserva terá regras específicas para expiração, falha de pagamento e disputa.
- Licenças e códigos secretos terão criptografia no servidor com chave fora do banco, controle de acesso e exclusão dos logs. Downloads usarão autorização e links de curta duração, com retenção e limites definidos.
- Para itens de jogos, priorizar transferência por mecanismo oficial, identificação do destinatário e registro do identificador da transação quando disponível. Screenshot isolado não será considerado prova definitiva de entrega.
- O acesso a um arquivo não prova satisfação, e a liberação de um código não prova sua validade. Esses eventos serão evidências para análise, não conclusão automática de uma disputa.

### Contas e restrições de origem

Contas ficam condicionadas à permissão expressa da plataforma de origem e possibilidade real de transferência. A proposta inicial é mantê-las desabilitadas até essas condições serem verificadas para cada plataforma. A simples troca de senha não impede que o titular original recupere a conta depois.

Não permitir contas roubadas, acessos compartilhados sem autorização, ativos de origem ilícita, códigos obtidos fraudulentamente, pirataria ou métodos que contornem restrições de transferência. Não solicitar senhas de e-mail, códigos de recuperação ou credenciais bancárias para concluir uma compra.

Exemplo de restrição: o contrato da Steam declara a conta pessoal e proíbe sua venda ou transferência, salvo autorização expressa da Valve. A possibilidade de negociar determinados itens não autoriza negociar a conta inteira.

## 3. Proteção de comprador e vendedor

### Proteções internas sem gateway

- Exigir e-mail confirmado para publicar e realizar ações sensíveis; disponibilizar autenticação em dois fatores por aplicativo autenticador. A confirmação por e-mail dependerá de um remetente configurado, sem contratação automática.
- Revalidar identidade da sessão em alterações sensíveis e registrar eventos de segurança. Selo de e-mail confirmado não significará identidade civil verificada.
- Manter histórico de condições aceitas, entrega, revisões e mensagens associadas à negociação. Evidências enviadas posteriormente serão identificadas como declarações de quem as forneceu.
- Exibir reputação baseada em transações efetivamente concluídas, diferenciando avaliações de produto e serviço. Evitar autoavaliação, duplicidade e avaliações de transações canceladas.
- Aplicar limites explicáveis para anúncios, tentativas de acesso e transações suspeitas, com revisão administrativa e possibilidade de recurso.
- Criar denúncia e contestação por pedido, com motivo, resposta de ambas as partes, anexos privados, histórico e decisão justificada. Somente pessoas autorizadas terão acesso às evidências; acessos administrativos serão auditados.
- Coletar apenas dados necessários, limitar retenção e restringir anexos. Anexos privados terão tipos e tamanhos limitados; não serão executados nem tratados como prova automaticamente confiável.
- A conclusão do pedido ou uma decisão administrativa interna não confirmará pagamento, não executará estorno e não garantirá recuperação financeira externa.

### Pagamento externo definido pelo usuário

Comprador e vendedor combinarão o pagamento diretamente, fora da EHtech. A plataforma não receberá, custodiará, liberará ou devolverá dinheiro. Gateway, carteira, split e automação de reembolso ficam fora deste escopo.

Se houver registro de pagamento no pedido, usar estados como pagamento informado pelo comprador e recebimento do valor declarado pelo vendedor. Esses registros são declarações dos participantes, não confirmação bancária. O vendedor deverá conferir o crédito em seu banco; um comprovante enviado não substitui essa conferência.

Pagamento, entrega, contratação e disputa terão estados separados. Uma entrega confirmada não marcará automaticamente o pedido como pago. A administração poderá analisar evidências e moderar contas, mas não poderá forçar estorno ou recuperar valores externos pelo sistema.

### Confirmação de recebimento por código — proposta

1. Gerar código aleatório de seis dígitos, exclusivo por grupo de entrega e destinatário. Não derivar de telefone ou de dados pessoais; não reutilizar entre pedidos ou vendedores.
2. Exibir o código somente ao comprador autenticado. O vendedor terá apenas um campo para validá-lo em seu próprio grupo de entrega. Administrador não poderá consultar ou validar o código em nome do comprador pelo fluxo comum.
3. Na entrega presencial ou retirada, o comprador receberá a encomenda antes de informar o código. A interface alertará para não enviá-lo antecipadamente pelo chat, para liberar envio ou para rastreamento.
4. Validar o código no servidor com validade, limite de tentativas e bloqueio temporário de abuso. Armazenar verificador protegido com segredo do servidor, sem código em texto puro ou nos logs. Invalidar códigos anteriores ao gerar um substituto.
5. Registrar recebimento confirmado por código, participantes, grupo e data em transação atômica. Repetições e validações concorrentes não poderão gerar eventos ou conclusões duplicados.
6. Para transportadora sem integração com a EHtech, preferir confirmação pelo comprador dentro do site após receber. O código não se tornará uma exigência da transportadora nem comprovará seu rastreamento.
7. Em serviços, separar entrega do resultado de aceite do escopo. Em digitais, o comprador precisará conseguir acessar/conferir o conteúdo antes de confirmar; não exigir código para liberar o acesso que ele deveria confirmar.
8. Manter o direito de relatar defeito, conteúdo divergente, acesso revogado ou outro problema após a confirmação. Código validado não significa qualidade, satisfação, pagamento, renúncia de direitos ou impossibilidade de contestar.
9. Se o comprador não confirmar apesar de entrega alegada pelo vendedor, abrir revisão com evidências e contraditório. Não concluir automaticamente nem penalizar alguém apenas por silêncio ou ausência do código.

Esse mecanismo reduz o risco de marcação unilateral de entrega e melhora o histórico da negociação, mas não elimina fraude, conluio, compartilhamento antecipado do código ou recuperação posterior de contas. Ele não oferece garantia financeira.

## 4. Políticas no site

Criar páginas de pagamento, trocas/devoluções/reembolsos, serviços, produtos digitais e segurança/disputas. Disponibilizar links no rodapé, anúncio, pedido e contratação, com linguagem em português do Brasil e os temas existentes.

### Pagamento

Explicar que o pagamento é combinado diretamente entre os participantes, identificar o vendedor/prestador e registrar o valor e as condições acordados. Informar que a EHtech não processa pagamento, não verifica crédito bancário nem garante estorno. Distinguir pagamento declarado e entrega confirmada; orientar a conferência do crédito pelo recebedor.

### Trocas, cancelamento e reembolso

Distinguir produto físico, produto digital e serviço; definir como solicitar ajuda, devolver, relatar defeito/divergência/não entrega e acompanhar resposta. Explicar como funcionam ajustes de serviço, cancelamento antes/depois do início e restituição de valores conforme o caso. Condições de vendedor não poderão afastar direitos aplicáveis.

Nas relações de consumo aplicáveis, contemplar o direito de arrependimento previsto no artigo 49 do CDC e a garantia legal, sem tratar uma garantia adicional como substituta da legal. Não estabelecer uma exclusão genérica de direitos apenas porque um produto é digital ou um serviço começou. Casos de conteúdo consumido, transferência irreversível ou serviço personalizado precisarão de tratamento específico nas minutas.

### Registro e atendimento

Versionar políticas e guardar no pedido a versão apresentada e o aceite específico. Definir prazos operacionais de atendimento e análise antes da publicação das políticas; esses prazos não limitarão direitos legais nem significarão reembolso automático. A administração precisará de uma pessoa responsável pelo atendimento e julgamento das contestações.

## 5. Entregas e etapas propostas

### Etapa 1 — sem integração financeira

Publicação e gerenciamento de serviços pelos usuários, ampliação de categorias, revisão dos textos da interface, catálogo digital, histórico de condições, autenticação reforçada, denúncias/contestações, administração e páginas de políticas coerentes com pagamento externo. A entrega privada de digitais dependerá das opções de armazenamento aprovadas. Nenhuma cobrança ou garantia financeira será ativada.

### Etapa 2 — confirmação de recebimento e análise de problemas

Se aprovado, implementar o código proposto para entregas presenciais/retiradas, confirmação no site para envios e os fluxos específicos de recebimento/aceite para digitais e serviços. O código não exigirá SMS, gateway ou serviço pago. Integrar as confirmações ao histórico e às contestações, sem automatizar movimentações financeiras.

Arquivos digitais também exigem armazenamento privado persistente no ambiente de publicação. Antes de integrar um serviço de arquivos, envio de e-mail ou verificação de identidade, apresentar a alternativa disponível, seus limites gratuitos e eventuais custos. A versão local poderá usar armazenamento privado no próprio servidor; fotos públicas existentes não serão convertidas em repositório de conteúdo vendido. A proteção de download não impede que um comprador copie um arquivo depois de recebê-lo.

As duas etapas manterão compatibilidade MySQL/PostgreSQL, migrações idempotentes, permissões, limites de upload/rate limit, OpenAPI e chamadas da interface sincronizadas. Dados e negociações existentes serão preservados.

## 6. Critérios de aceite e verificação

- Usuário publica e gerencia somente suas ofertas; anúncio pendente não aparece publicamente; administração aprova/reprova com motivo.
- Oferta e contratação identificam o prestador real, inclusive após edição ou arquivamento do anúncio.
- Categorias não relacionadas a manutenção permitem contratar com entregáveis e critérios de aceite adequados.
- Conteúdo digital e evidências privadas não podem ser consultados por visitantes, outros compradores ou outros vendedores do mesmo pedido.
- Item digital exclusivo não pode ser entregue duas vezes; expiração e concorrência não geram entrega duplicada.
- Pagamento externo declarado não aparece como pagamento verificado pela EHtech. Nenhum código de entrega altera esse significado ou os valores aceitos.
- Código de outro pedido, vendedor, destinatário, expirado ou invalidado não confirma recebimento. Tentativas de adivinhação são limitadas e validações concorrentes não duplicam eventos.
- Ausência do código não causa confirmação automática. Disputas continuam possíveis após o recebimento confirmado, sem apagar o histórico nem executar movimentação financeira.
- Políticas têm versão e ficam acessíveis antes do aceite; contas/produtos vedados não passam na moderação.
- Executar testes isolados, npm run check, integração com bancos temporários MySQL/PostgreSQL e E2E em desktop/celular. Cobrir códigos inválidos/expirados/reutilizados, acesso de terceiros, abuso de tentativas, corrida de confirmação/estoque, pagamento declarado e contestação posterior.

## Decisões propostas para aprovação

1. Aprovar o escopo funcional com pagamento externo, conforme preferência já definida pelo usuário.
2. Avaliar a confirmação de recebimento por código e suas diferenças para produtos físicos, digitais e serviços antes de implementar.
3. Permitir produtos digitais transferíveis e autorizados; deixar contas condicionadas à validação da plataforma de origem.
4. Definir responsáveis/prazos para atendimento e contestações. Qualquer serviço externo ou custo novo exige aprovação específica; gateway não está previsto.

## Fontes consultadas

- Código de Defesa do Consumidor, especialmente artigos 49, 50 e 51: https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm
- Steam Subscriber Agreement, seção Your Account: https://store.steampowered.com/subscriber_agreement/
- Orientação do iFood sobre código somente após recebimento: https://institucional.ifood.com.br/ajuda/problemas-com-o-pedido-ifood/

Nenhum provedor foi escolhido, contratado ou integrado. O fluxo por código é uma proposta própria da EHtech, inspirada na finalidade da confirmação de entrega; não há integração com o iFood.
