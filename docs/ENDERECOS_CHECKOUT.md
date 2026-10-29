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

`vendedor_id`, `id`, `nome` e `valor` são obrigatórios. `ufs`, limites inclusivos de CEP e dias úteis são opcionais. Sem prazo configurado, exibe “Prazo a combinar com o vendedor”. Valor zero representa uma modalidade gratuita explicitamente configurada. Trocar endereço ou condições de entrega exige nova seleção; custos e itens são recalculados no servidor.

### Entrega e frete a combinar

No anúncio, **Comprar agora** adiciona o produto se ainda não está no carrinho e abre o checkout, preservando os outros itens e sem aumentar novamente a quantidade já escolhida. **Adicionar ao Carrinho** mantém a navegação e oferece acesso ao carrinho. O próprio vendedor e anúncios sem estoque não oferecem compra.

Quando a única opção de um grupo é frete a combinar, ela aparece selecionada como sugestão. O comprador confirma em **Continuar com frete a combinar**, revisa as condições e só então usa **Confirmar e registrar pedido**. A sugestão não salva a entrega nem cria pedido. Tarifas com preço, inclusive zero, não são pré-selecionadas. **Conversar antes de continuar (opcional)** abre o chat; não registra a compra. Ao voltar ao checkout, a opção pode ser revisada. Conversar não é pré-requisito para registrar o pedido e negociar depois.

Sem tarifa aplicável ao vendedor/origem/destino, o sistema agora oferece **Entrega e frete a combinar** (`id: a-combinar`, `tipo: a_combinar`, `valor: null`). O comprador precisa selecionar essa opção e revisar antes de registrar o pedido. Endereços próximos ou na mesma cidade não definem preço nem confirmam atendimento: disponibilidade, prazo e valor serão combinados pelo chat. A origem válida do anúncio e a confirmação do endereço próprio continuam obrigatórias.

Tarifas configuradas aplicáveis são preservadas: a negociação só aparece nos grupos sem cotação. Em carrinhos mistos, fretes conhecidos permanecem somados separadamente; nunca substituímos frete pendente por R$ 0,00 na tela ou API. Checkout, revisão, confirmação e histórico identificam a pendência e oferecem contato com o vendedor. A notificação do vendedor informa a necessidade de acordo. Alterar a tabela depois da seleção exige nova revisão do checkout.

Na API, `frete_pendente=true`, `frete=null` e `total=null` indicam que não há valor final. `frete_conhecido` soma somente tarifas definidas; `total_parcial` soma produtos e tarifas conhecidas. O pedido segue `registrado` e `status_pagamento=nao_iniciado`; a seleção não confirma entrega nem gera cobrança. O snapshot mantém `valor:null` e `tipo:a_combinar`, inclusive ao repetir o pedido ou consultar o histórico depois. Não há definição automática de tarifa após uma conversa.

A opção inicial a combinar não exige alteração nos campos de preço: por compatibilidade do schema, `pedidos_produto.total/frete` guardam **somente os valores conhecidos**, não confirmação de pagamento. O acompanhamento posterior utiliza as novas tabelas idempotentes `pedido_entregas` e `pedido_entrega_eventos`; o snapshot inicial não é reescrito. As respostas atuais consideram os acordos aceitos e as propostas ainda pendentes. Consumidores diretos do banco não devem tratar `total` isoladamente como preço final, aceite ou pagamento; consulte também o acompanhamento em [ACORDOS_E_ENTREGAS.md](ACORDOS_E_ENTREGAS.md).

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
