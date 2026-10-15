# Certificados de usados, compra por missão e combos

MVPs gratuitos da ordem de implementação do [roadmap](ROADMAP_DIFERENCIAIS.md), adicionados em 15/10/2026. Não utilizam APIs pagas nem alteram a aprovação administrativa dos anúncios.

## Certificados de usados

1. O dono cadastra o equipamento em `/passaportes` e vincula um atendimento concluído como cliente. Esse vínculo continua sendo uma declaração do dono.
2. Em `/certificados`, seleciona passaporte, anúncio aprovado próprio e atendimento vinculado, confirma que o equipamento é usado e autoriza o prestador a consultar a ficha da solicitação.
3. Somente o prestador daquele atendimento, diferente do dono, pode preencher funcionamento, integridade visual, temperaturas, armazenamento e bateria. Funcionamento/integridade não aceitam “não aplicável”; os demais aceitam com justificativa no laudo. O prestador confirma ter inspecionado o mesmo equipamento e deve descrever método e medições.
4. Qualquer reprovação impede o selo. Aprovação emite por 90 dias, cria registro no passaporte e notifica o dono. A solicitação e a revogação também notificam a outra parte.
5. O detalhe do produto exibe selo e laudo válidos. A consulta não revela contas, contrato, ID do passaporte, histórico privado ou códigos de compartilhamento. O dono autoriza a publicação do laudo, que não deve conter dados pessoais.

O servidor compara um hash da ficha e dos campos técnicos do anúncio em cada consulta/emissão. Mudanças nesses dados, propriedade ou aprovação retiram o selo; preço/estoque não renovam nem invalidam a inspeção por si só. Expiração é calculada na consulta, sem agendador/e-mail automático. Solicitante ou prestador podem revogar. Uma nova solicitação revoga o certificado anterior do mesmo anúncio; somente uma inspeção pode estar pendente por produto.

O snapshot da solicitação não acompanha alterações privadas futuras do novo dono. Excluir o passaporte remove as inspeções em cascata. O fluxo comprova a conta responsável pelo atendimento, **não verifica diploma/credenciais, não gera certificação oficial, não garante desempenho futuro e não substitui garantias legais**. A EHtech não mede o hardware remotamente: o laudo é uma declaração do prestador. A inspeção não é requisito da aprovação administrativa do anúncio.

## Compra por missão

`/missoes` oferece estudar/trabalhar (notebook + suporte), home office (notebook, acessórios, áudio + suporte) e melhorar Wi-Fi (equipamento de rede + serviço de redes), usando categorias que já existem no cadastro de anúncios.

- Preço e categoria são dados do catálogo, não indicadores de qualidade ou desempenho.
- Consulta até 100 anúncios aprovados/com estoque por categoria, ordenados por menor preço, e até 100 serviços ativos da categoria.
- Escolhe o menor preço-base conhecido de serviço que caiba no orçamento. Serviço sob consulta não é tratado como gratuito; sem serviço precificado a composição fica incompleta.
- Reserva esse preço-base e usa 50%, 75% e 100% do saldo para as faixas Essencial, Intermediária e Ampliada. Para cada categoria reserva o menor preço das próximas; escolhe, entre os candidatos que cabem, o menor, o intermediário ou o maior preço conforme a faixa. Empates usam o ID.
- Informa lacunas sem inventar estoque. Catálogo reduzido pode gerar faixas iguais. “Completo” significa apenas que as categorias e um serviço precificado foram encontrados dentro do orçamento, não aprovação técnica.
- Não estima consumo, FPS, alcance, dimensionamento de rede ou compatibilidade sem dados. A interface direciona à análise por regras e ao prestador. Frete, preço final e disponibilidade precisam ser confirmados; não há compra/reserva automática.

## Combos

`/combos` tem catálogo público e gerenciamento autenticado. Para publicar, o anúncio aprovado e o serviço ativo devem pertencer à mesma conta. A API revalida propriedade; desativar oferta alheia é negado. Par ativo produto/serviço não pode ser duplicado.

O preço do produto é somado ao preço-base do serviço em centavos, sem desconto inventado. Sem preço-base o total fica sob consulta. Oferta só aparece com estoque positivo, aprovação e serviço ativo. A modalidade e a região são exibidas para confirmação de atendimento.

Solicitar orçamento envia `combo_id` a `POST /contratacoes`; o servidor confere disponibilidade e correspondência do serviço. A contratação guarda referência imutável do produto, serviço e valores no momento da solicitação. A proposta final, o aceite e a garantia cobrem **somente o serviço**. O produto segue o checkout existente separadamente. Não há pagamento conjunto, reserva atômica de estoque, desconto automático ou confirmação de compatibilidade. Desativação do combo preserva contratos anteriores.

## Código e migração

- Regras: `backend/differentials.js`; rotas `certificates.js`, `missions.js`, `combos.js` em `backend/routes/`.
- Migração idempotente `backend/database/differentials.js`: cria `certificados_usado`, `combos_instalacao` e adiciona `contratacoes_servico.combo_snapshot`.
- A inicialização normal do backend aplica a migração. Não é preciso importar outro dump ou executar SQL manualmente.
- SQL segue placeholders `?`, booleanos portáveis e interface `[rows, fields]`. PostgreSQL tem teste de tradução; a integração real automatizada usa MySQL/MariaDB.
- OpenAPI completo em `/docs/openapi.json`, incluindo corpos, autorização, respostas e limitações.

## Verificar

`node --test tests/differentials.test.cjs tests/database-adapter.test.cjs tests/swagger-additions.test.cjs` verifica regras e documentação. `npm run test:integration` exercita HTTP e migrações em base temporária, incluindo papéis, estoque/aprovação, checklist, expiração, revogação, transferência e privacidade. `npm run check` cobre lint, suíte rápida e build. Não execute sementes ou testes diretamente em banco real.
