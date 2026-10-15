# Origem de envio, agenda de endereços e catálogo

## Endereços da conta

O cadastro em **Meu perfil → Meus Endereços** é a mesma agenda usada no checkout e nos formulários de anúncio. Salve uma vez, revise e selecione o endereço em compras e anúncios futuros. É possível manter até 30 endereços, definir principal, editar e excluir. Endereços usados somente em uma compra (`salvar=false`) não viram origem de anúncios.

Ao anunciar um produto físico, selecione **Origem do envio → Selecionar ou cadastrar endereço**. A revisão confirma os dados e sua versão; o servidor verifica que o endereço é salvo, completo, não excluído e pertence à conta do anunciante. Não é verificação de residência ou localização. Itens sem entrega física podem dispensar origem, mas essa opção não deve ser usada para contornar o frete de um equipamento físico.

O anúncio guarda uma cópia privada da origem. Alterar/excluir o endereço da agenda não muda anúncios ou pedidos existentes. Para mudar onde um produto será despachado, selecione outra origem em **Editar produto**; isso volta à aprovação administrativa quando feito pelo vendedor. Anúncios antigos continuam no catálogo, mas precisam receber uma origem ao editar e antes de oferecer frete.

Somente cidade e UF de origem aparecem na vitrine, busca, detalhe e checkout do comprador. Rua, número, CEP, telefone e nome do remetente não são expostos nesses endpoints. A conta proprietária pode consultar sua cópia em `GET /produtos/meus`; administradores já autorizados também acessam a gestão. Pedidos guardam a origem internamente em cada item, sem retorná-la no histórico do comprador.

## Frete: origem e destino

O checkout agrupa produtos por vendedor **e endereço físico de origem**. Um vendedor despachando de duas origens gera dois grupos de frete; selecione uma modalidade para cada grupo. A tela mostra cidades/UF de origem e destino, produtos de cada envio e o total das modalidades escolhidas. Mudança na origem do anúncio invalida checkouts anteriores, exigindo nova revisão do carrinho.

O mecanismo continua usando tabelas explícitas em `SHIPPING_RULES_JSON`, sem tarifa inventada por distância e **sem integração com transportadoras**. Sem tarifa aplicável, oferece uma solicitação de **entrega e frete a combinar**, selecionada pelo comprador, sem confirmar atendimento nem frete grátis; veja [ENDERECOS_CHECKOUT.md](ENDERECOS_CHECKOUT.md#entrega-e-frete-a-combinar). Origem válida e endereço confirmado continuam necessários. Para cotação definida, configure valores e cobertura reais. Além de `ufs`, `cep_inicio` e `cep_fim` do destino, as regras podem restringir `origem_ufs`, `origem_cep_inicio` e `origem_cep_fim`:

```json
[
  {
    "vendedor_id": 1,
    "id": "entrega-sp",
    "nome": "Entrega regional",
    "origem_ufs": ["SP"],
    "origem_cep_inicio": "01000000",
    "origem_cep_fim": "19999999",
    "ufs": ["SP"],
    "valor": 15,
    "dias_min": 2,
    "dias_max": 4
  }
]
```

O exemplo é ilustrativo, **não é cotação de transportadora**. Sem restrição de origem, a regra cobre qualquer origem cadastrada daquele vendedor; revise tabelas antigas antes de usá-las. Sem origem ou regra compatível com o trajeto não se oferece modalidade. `grupo_id` identifica cada envio; clientes antigos podem omiti-lo somente se houver uma origem por vendedor. Preço enviado pelo cliente é ignorado. Não há cobrança online ou reserva de estoque adicionada por esta mudança.

## Filtros de produtos

- `uf` e `cidade`: local de origem do envio, não endereço do comprador. Cidade exata, ignorando maiúsculas; UF brasileira válida.
- `dataInicio` / `dataFim`: datas inclusivas de publicação, formato `AAAA-MM-DD`. Datas inexistentes ou intervalo invertido retornam 400. Usa o calendário da data armazenada pelo servidor.
- `ordenacao=recentes|antigos`: publicação e desempate por ID. Registros antigos sem data ficam por último; não inventamos a data original ao migrar.
- `ordenacao=relevancia`: com busca, prioriza nome exato, prefixo do nome, trecho do nome e, depois, descrição; desempata por publicação/ID. Sem busca, usa recentes. A regra não mede qualidade, popularidade ou compatibilidade e não usa IA.
- A busca trata `%` e `_` literalmente, sem distinguir maiúsculas. Anúncios aprovados e com estoque continuam primeiro; filtros de categoria, preço e paginação são mantidos.

Campos privados da origem não entram na busca. Anúncios sem origem não correspondem a filtros regionais; anúncios sem data não correspondem a intervalos de data.

## Migração e validação

`backend/database/product-origins.js` adiciona colunas idempotentemente na inicialização normal do backend. Não redefine datas existentes, não deduz origem de e-mail e não exige SQL manual. Reinicie o backend depois de atualizar o código.

Testes isolados: `node --test tests/product-origins.test.cjs tests/addresses-checkout.test.cjs tests/database-adapter.test.cjs`. Integração: `npm run test:integration`, somente em base temporária. Revisão transversal: `npm run check`. O adaptador PostgreSQL tem validação de tradução; a integração real automatizada usa MySQL/MariaDB.
