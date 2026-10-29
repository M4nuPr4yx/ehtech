# Serviços da comunidade e recebimento

Primeira etapa do escopo de marketplace: serviços publicados pelos usuários, políticas para pagamento externo e confirmação de retirada. Não há gateway, custódia ou cobrança na EHtech.

## Publicar e moderar

- `/meus-servicos`: criar, editar, pausar, ativar e arquivar as próprias ofertas. Cadastro comum basta; não é necessário papel administrativo ou vendedor.
- Categorias incluem programação, design, audiovisual, fotografia, marketing, redação/tradução e aulas/mentoria, além das categorias técnicas existentes.
- Ofertas exigem descrição, entregáveis, critérios de aceite, revisões, modalidade, prazo, preço fixo/a partir de/sob orçamento e aceite da versão das políticas.
- `/admin/servicos`: administração compara a revisão com a versão anterior, aprova, reprova com motivo ou suspende. Uma revisão não altera o conteúdo público antes da aprovação. Ofertas pausadas não são reativadas automaticamente pela moderação.
- Cada alteração usa a versão atual para rejeitar concorrência. Propriedade e papel são conferidos no servidor. Respostas de gerenciamento não usam cache.
- A nova contratação guarda uma cópia da descrição, categoria, preço anunciado, modalidade, região, prazo, destaques, entregáveis, critérios, revisões e versão das políticas. Edições posteriores, arquivamento e suspensão não apagam contratações. O preço final continua sendo o orçamento aceito.

## Migração

A inicialização aplica colunas aditivas em `servicos`, snapshots nas contratações e a tabela de códigos de recebimento, nos dois bancos. Não recria o banco. Serviços legítimos anteriores mantêm aprovação e propriedade. Exemplos antigos só são classificados e pausados quando slug, conteúdo, preço, prazo, modalidade, região e destaques ainda correspondem exatamente ao catálogo original. A classificação impede repetir a pausa após revisão pelo usuário. Nenhum registro ou contratação é apagado.

Migrações são executadas ao iniciar a API. Não rode inicialização contra uma base real somente para testar; utilize as fixtures temporárias documentadas em DESENVOLVIMENTO.md.

Nas contratações anteriores sem snapshot, a migração preserva o conteúdo disponível no anúncio no momento da atualização. Não é possível recuperar condições históricas que já tenham sido sobrescritas antes desta versão.

## Retirada com código

Depois de a retirada ficar pronta, o comprador pode gerar um código na tela do pedido. Ele declara que já recebeu antes de gerar. O vendedor digita o código em sua própria tela do grupo de entrega. Alternativamente, o comprador continua podendo confirmar recebimento diretamente no site. Envios por transportadora usam a confirmação no site.

O código tem seis dígitos aleatórios, validade de 30 minutos e uso único. Gerar outro invalida o anterior, inclusive evitando repetir a mesma sequência. Cinco tentativas incorretas persistentes bloqueiam por 15 minutos e invalidam o código. Nem regeneração pelo comprador contorna o bloqueio. O banco guarda salt e HMAC contextual, usando o segredo da API; o valor não é registrado em logs, eventos, notificações ou respostas de vendedores. Recarregar a página não recupera o código; o comprador gera outro quando necessário.

A validação bloqueia o pedido em transação, preserva a versão, registra o vendedor como autor e identifica o método no histórico. O retorno respeita a visão restrita de cada vendedor. Confirmação direta também invalida o código. Não há confirmação automática por silêncio, comprovação bancária, aceite de qualidade ou renúncia de direitos.

## Políticas e problemas

`/politicas` reúne pagamento externo, trocas, cancelamento, reembolso, serviços, recebimento e digitais. Links estão no rodapé, nos serviços, pedidos e contratações. Somente a publicação/revisão de serviços registra o aceite de versão nesta etapa; não há aceite retroativo de políticas para pedidos antigos.

Os controles de denúncia agora aceitam serviço público de outro usuário, pedido e contratação de quem participa da negociação, mesmo concluídos. O painel existente `/admin/denuncias` recebe as evidências privadas e registra decisões. Um vendedor não envia como evidência itens de outros vendedores. Esse canal é de moderação: ainda não existe disputa bilateral com anexos, acompanhamento pelo denunciante, reembolso ou resolução financeira.

## API

- `GET/POST /servicos/meus`; `PUT /servicos/meus/:id`; `PATCH /servicos/meus/:id/status`.
- `GET /servicos/moderacao`; `PATCH /servicos/moderacao/:id` (administrador).
- `POST /pedidos/:id/entregas/:grupo/codigo` (comprador); `POST /pedidos/:id/entregas/:grupo/recebimento` (vendedor).
- `POST /denuncias` recebe também tipos `servico`, `pedido` e `contratacao`.

Swagger contém campos, limites e respostas. Chamadas Next de gerenciamento preservam autorização e não passam pelo proxy público de slug.

## Etapas posteriores

Entrega privada de produtos digitais, controle específico de unidades digitais, transferência de contas permitidas, portfólio com imagens, gestão dinâmica de categorias, confirmação de e-mail/2FA e disputa bilateral continuam no escopo posterior. Serviços usam categorias amplas predefinidas nesta entrega. Nenhum serviço externo foi contratado.

## Verificação

Suíte rápida cobre validação, versão, HMAC contextual e idempotência de migração. A integração real cobre propriedade, aprovação, suspensão, preservação da versão pública, snapshots, expiração/rotação/bloqueio/uso único do código, privacidade entre vendedores e denúncia após confirmação. Há jornada Playwright específica em desktop e celular para publicar, aprovar e revisar um serviço.

Execução local em 22/10/2026:

- `npm run check`: aprovado; lint sem erros (15 avisos preexistentes de imagens), 95 testes aprovados e uma integração MySQL ignorada por não estar habilitada na suíte rápida; build de produção concluído.
- `node tests/run-postgres-local.cjs`: 30 resultados aprovados, 125 operações de API e 782 requisições HTTP verificadas, usando cluster e base descartáveis.
- `node tests/run-postgres-local.cjs --e2e --production --grep "serviços da comunidade|jornada real"`: quatro jornadas aprovadas, duas em desktop e duas em viewport de celular. Incluem publicação/revisão/pausa de serviços, aprovação administrativa, compra, retirada por código, avaliação e moderação de denúncia. Capturas das políticas e do serviço publicado foram conferidas.
- As primeiras execuções em desenvolvimento tiveram falhas de seletores e navegação interrompida por Fast Refresh. Seletores foram corrigidos e a rodada com build de produção passou integralmente.
- A integração MySQL foi tentada separadamente, mas a conexão em `127.0.0.1:3307` retornou `ECONNREFUSED`; não foi possível validar esse banco nesta máquina. Não houve alteração da base real nem instalação de serviço.

Swagger, documentação e verificações de permissões acompanham as rotas. Não foram executadas todas as demais jornadas Playwright do projeto, nem testes em aparelhos físicos. As capturas e relatórios gerados ficam em `scratch/`, ignorado pelo Git.
