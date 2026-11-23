# Histórico de inspeções, busca por objetivo e combos

Histórico de recursos gratuitos da ordem de implementação do [roadmap](ROADMAP_DIFERENCIAIS.md), adicionados em 15/10/2026. Os fluxos de passaporte e inspeção foram retirados da versão atual em 19/11/2026; as seções correspondentes abaixo descrevem apenas o histórico, não funcionalidades disponíveis.

## Certificados de usados

1. O dono cadastra o equipamento em `/passaportes` e vincula um atendimento concluído como cliente. Esse vínculo continua sendo uma declaração do dono.
2. Em `/certificados`, seleciona passaporte, anúncio aprovado próprio e atendimento vinculado, confirma que o equipamento é usado e autoriza o prestador a consultar a ficha da solicitação.
3. Somente o prestador daquele atendimento, diferente do dono, pode preencher funcionamento, integridade visual, temperaturas, armazenamento e bateria. Funcionamento/integridade não aceitam “não aplicável”; os demais aceitam com justificativa no laudo. O prestador confirma ter inspecionado o mesmo equipamento e deve descrever método e medições.
4. Qualquer reprovação impede o selo. Aprovação emite por 90 dias, cria registro no passaporte e notifica o dono. A solicitação e a revogação também notificam a outra parte.
5. O detalhe do produto exibe selo e laudo válidos. A consulta não revela contas, contrato, ID do passaporte, histórico privado ou códigos de compartilhamento. O dono autoriza a publicação do laudo, que não deve conter dados pessoais.

O servidor compara um hash da ficha e dos campos técnicos do anúncio em cada consulta/emissão. Mudanças nesses dados, propriedade ou aprovação retiram o selo; preço/estoque não renovam nem invalidam a inspeção por si só. Expiração é calculada na consulta, sem agendador/e-mail automático. Solicitante ou prestador podem revogar. Uma nova solicitação revoga o certificado anterior do mesmo anúncio; somente uma inspeção pode estar pendente por produto.

O snapshot da solicitação não acompanha alterações privadas futuras do novo dono. Excluir o passaporte remove as inspeções em cascata. O fluxo comprova a conta responsável pelo atendimento, **não verifica diploma/credenciais, não gera certificação oficial, não garante desempenho futuro e não substitui garantias legais**. A EHtech não mede o hardware remotamente: o laudo é uma declaração do prestador. A inspeção não é requisito da aprovação administrativa do anúncio.

## Compra por missão

O histórico de `/missoes` oferece estudar/trabalhar, home office e melhorar Wi-Fi, usando categorias do cadastro de anúncios. Em 19/11/2026, a tela deixou de montar três faixas e passou a buscar opções do catálogo por objetivo e orçamento máximo por item.

- Preço e categoria são dados do catálogo, não indicadores de qualidade ou desempenho.
- Consulta até 100 anúncios aprovados/com estoque por categoria, ordenados por menor preço, e até 100 serviços ativos da categoria.
- Mostra anúncios aprovados com estoque e serviços ativos com preço-base, agrupados por categoria e limitados ao orçamento por item.
- Em home office, itens de áudio ou acessórios precisam ter um periférico relacionado no título, como teclado, mouse, webcam ou fone. A interface exibe somente grupos com resultados.
- A busca não monta um conjunto nem avalia desempenho, compatibilidade, cobertura, consumo ou qualidade. Preços, estoque e propostas finais precisam ser confirmados; não há compra ou reserva automática.

## Combos

`/combos` tem catálogo público e gerenciamento autenticado. Para publicar, a mesma conta precisa ter o anúncio aprovado com estoque e o serviço ativo e aprovado. A API revalida propriedade e elegibilidade. Só o dono pode desativar a oferta. Cada par de produto e serviço aceita uma oferta ativa.

A tela mostra separadamente o preço do anúncio e o preço ou orçamento do serviço. A API continua calculando o total estimado quando existe preço-base. A oferta exige estoque positivo, anúncio aprovado e serviço ativo. Modalidade e região aparecem junto do serviço.

Solicitar orçamento envia `combo_id` a `POST /contratacoes`. O servidor confere disponibilidade, correspondência do serviço, modalidade e identidade do comprador. A contratação guarda referência imutável do produto, serviço e valores no momento da solicitação. A proposta final, o aceite e a garantia cobrem o serviço. O produto segue o checkout existente separadamente. Desativar a oferta preserva contratos anteriores.

## Código e migração

- Regras: `backend/differentials.js`; rotas ativas `missions.js` e `combos.js` em `backend/routes/`. Rotas de passaporte e certificado não são montadas pelo servidor.
- Migração idempotente `backend/database/differentials.js`: cria `combos_instalacao` e adiciona `contratacoes_servico.combo_snapshot`.
- A inicialização normal do backend aplica a migração de combos. Não cria tabelas de passaportes/inspeções em bases novas. Se tabelas históricas já existirem, permanecem intactas, mas sem API ou tela ativa; não são apagadas automaticamente.
- SQL segue placeholders `?`, booleanos portáveis e interface `[rows, fields]`. A integração real automatizada é executada em MySQL/MariaDB e PostgreSQL descartáveis. A revisão histórica de 10/11/2026 verificou nos dois bancos as versões então ativas de passaportes, inspeções, missões e combos; resultados em [CHECKUP.md](CHECKUP.md).
- OpenAPI completo em `/docs/openapi.json`, incluindo corpos, autorização, respostas e limitações.

## Verificar

`node --test tests/differentials.test.cjs tests/database-adapter.test.cjs tests/swagger-additions.test.cjs` verifica regras e documentação. `npm run test:integration` exercita HTTP e migrações em base temporária, incluindo papéis, estoque/aprovação, checklist, expiração, revogação, transferência e privacidade. `npm run check` cobre lint, suíte rápida e build. Não execute sementes ou testes diretamente em banco real.
