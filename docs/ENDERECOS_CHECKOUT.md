# Endereços e checkout

O carrinho encaminha para `/checkout`. A conta permite cadastrar, revisar, confirmar, editar, excluir e definir endereço principal em `/perfil?aba=enderecos`. A confirmação registra a revisão do usuário; não comprova residência. Endereços são privados e nunca são retornados em rotas administrativas ou perfis públicos.

## Banco e migração

`npm run db:init` aplica a migração idempotente `backend/database/addresses.js`, também executada pelo backend ao iniciar. Cria `enderecos` e `checkout_sessoes`, adiciona `produtos.exige_entrega` (padrão `TRUE`) e campos de endereço, entrega, frete, pagamento e checkout em `pedidos_produto`. Produtos digitais podem ser classificados pela operação com `exige_entrega = FALSE`; o cliente não pode mudar essa regra pela API. Serviços mantêm seu fluxo próprio de contratação.

Cada endereço possui versão e data de confirmação. A edição invalida a confirmação e todos os checkouts que usavam a versão anterior. Exclusão é lógica; a cópia JSON do endereço e da modalidade de entrega no pedido é imutável para alterações futuras na conta. A criação do pedido e os avisos são transacionais; repetir o mesmo checkout retorna o mesmo pedido. Sessões de checkout expiram em 24 horas.

Desmarcar “Salvar para futuras compras” mantém o endereço privado para a compra atual e para o histórico do pedido, mas o remove da lista de endereços reutilizáveis. Isso não impede a persistência necessária para concluir a compra. Rascunhos de formulário ficam apenas na memória da página; uma falha de rede mantém os campos para nova tentativa. O navegador guarda somente o identificador do checkout e a seleção de produtos, separados por conta, sem endereço pessoal.

## CEP

A API autenticada `/enderecos/cep/:cep` consulta `https://viacep.com.br/ws/{cep}/json/`, com timeout de 5 segundos. Envia somente o CEP ao ViaCEP, nunca nome ou telefone. O formulário preenche logradouro, bairro, cidade e UF e mantém preenchimento manual disponível se a consulta falhar ou não tiver todos os dados. Trocar o CEP limpa os dados de localização anteriores. Documentação: https://viacep.com.br/.

## Entrega

Configure `SHIPPING_RULES_JSON` no ambiente do backend com as condições comerciais reais de cada vendedor. Não há transportadora contratada nem integração paga. O sistema usa a tabela declarada pelo vendedor, não anuncia uma cotação de transportadora. Exemplo de formato (substitua os valores pelas condições reais antes de habilitar):

```json
[
  { "vendedor_id": 12, "id": "entrega-local", "nome": "Entrega local", "ufs": ["SP"], "cep_inicio": "18650000", "cep_fim": "18659999", "valor": 15, "dias_min": 2, "dias_max": 5 }
]
```

`vendedor_id`, `id`, `nome` e `valor` são obrigatórios. `ufs`, limites inclusivos de CEP e dias úteis são opcionais. Sem prazo configurado, exibe “Prazo a combinar com o vendedor”. Valor zero representa uma modalidade gratuita explicitamente configurada. Sem uma modalidade compatível para cada vendedor físico, a compra fica bloqueada na entrega. Trocar endereço ou condições de entrega exige nova seleção; custos e itens são recalculados no servidor.

## Pagamento

O projeto não possui provedor de pagamento. `/checkout/:id/pagamento` valida conta, versão do endereço, confirmação por checkout, itens e entregas antes de responder que a cobrança online está indisponível. O fluxo existente de registrar pedido sem cobrança foi mantido após a revisão. Todos os pedidos novos têm `status_pagamento = nao_iniciado`. Não existe endpoint para o cliente marcar um pedido como pago. Uma futura integração deverá validar essas mesmas regras no servidor e usar confirmação autenticada do provedor.

## Operação e privacidade

Use HTTPS no domínio publicado e no proxy de produção. As respostas privadas usam `Cache-Control: no-store`, JWT e filtro de proprietário. A consulta CEP usa HTTPS. O ambiente local continua disponível em HTTP para desenvolvimento. Não registre payloads de endereços em logs. Defina retenção e exclusão de dados pessoais conforme a finalidade e as obrigações aplicáveis ao negócio antes de operar com clientes reais.

## Verificação

Arquivos da implementação:

- `backend/addresses.js`: validação, normalização, consulta CEP e transações.
- `backend/checkout.js`: consistência do carrinho, endereço e regras de frete.
- `backend/database/addresses.js` e `backend/database/init.js`: migração idempotente.
- `backend/routes/addresses.js`, `backend/routes/checkout.js`, `backend/routes/orders.js` e `backend/index.js`: APIs autenticadas e registro transacional.
- `backend/docs/additional-routes.js`: contrato OpenAPI publicado no Swagger.
- `backend/.env.example`: configuração de modalidades de entrega.
- `src/lib/address-api.js`: chamadas autenticadas e máscaras.
- `src/app/complements/AddressBook.js`: formulário, revisão e gerenciamento.
- `src/app/checkout/page.js`, `src/app/carrinho/page.js` e `src/app/perfil/page.js`: etapas da compra, gerenciamento e histórico.
- `tests/addresses-checkout.test.cjs`, `tests/api-integration.test.cjs`, `tests/database-adapter.test.cjs` e `tests/swagger-additions.test.cjs`: validação e regressão.

Testes de validação, consulta CEP simulada e regras de frete: `node --test tests/addresses-checkout.test.cjs`. Integração com banco e uploads temporários: `npm run test:integration`. `npm run check` cobre lint, testes rápidos e build. A integração simula o ViaCEP para ser determinística e não envia consultas reais de dados pessoais.
