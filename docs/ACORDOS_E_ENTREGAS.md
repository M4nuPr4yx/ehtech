# Acordos e acompanhamento de pedidos

## Uso

Após combinar pelo chat, acesse **Minha conta → Pedidos e vendas** (`/pedidos`). O comprador usa **Minhas compras**; o vendedor, **Minhas vendas**. Abra o pedido para registrar o acordo. O checkout e o histórico do perfil também possuem links diretos.

1. **Vendedor envia proposta:** entrega ou retirada, valor do frete, prazo e observações. Retirada exige frete zero; a localização é combinada pelo chat, não publicada automaticamente. O vendedor pode revisar uma proposta ainda não aceita.
2. **Comprador revisa e aceita:** precisa marcar que conferiu modalidade, preço e prazo. Aceita somente a versão exibida; se houver revisão simultânea, recebe conflito e deve conferir de novo. Também pode recusar para pedir outra proposta.
3. **Acordo confirmado:** o total passa a incluir o frete aceito. Proposta não aceita não vira cobrança. Alterar condições depois do aceite não é permitido por este fluxo.
4. **Vendedor informa envio ou retirada:** somente após o aceite. Entrega aceita transportadora e código opcionais, declarados pelo vendedor, sem consulta externa. Retirada muda para **Pronto para retirada**.
5. **Comprador confirma recebimento:** somente depois de enviado/pronto para retirada e com confirmação explícita na tela. Para retirada, pode gerar um código de seis dígitos após receber; o vendedor valida no próprio pedido. Também é possível abrir **Prefiro confirmar sem código** e confirmar diretamente. Envios por transportadora usam a confirmação direta. Quando todos os grupos de entrega física terminam, o acompanhamento fica **Concluído**. Não confirme antes de receber.

O site não cobra, não confirma pagamento, não reserva estoque, não contrata transportadora e não comprova envio/rastreio/recebimento. O pagamento continua combinado externamente. Problemas podem ser relatados no pedido, inclusive após sua conclusão, e analisados pela moderação. O fluxo não implementa cancelamentos de produtos, disputa bilateral, devoluções ou reembolso automático. Itens digitais e pedidos antigos sem grupo de entrega permanecem consultáveis, sem transição automática de entrega física.

## Orientação e recuperação de falhas

A tela apresenta quatro etapas por entrega e orientações diferentes para comprador e vendedor. A contagem de entregas recebidas distingue a conclusão de um grupo da conclusão de todo o pedido. O endereço e o histórico ficam em seções expansíveis; a ajuda e o relato de problema permanecem acessíveis após o recebimento.

Envios simultâneos de ações são bloqueados na interface. Se houver conflito de versão, falha de rede, resposta inválida ou erro de servidor, as ações ficam bloqueadas até **Atualizar pedido** confirmar o estado atual. A última consulta pode continuar visível com aviso, mas não autoriza nova alteração. Validação recusada permite corrigir os campos. Não há repetição automática de escritas. O código de retirada não é salvo no navegador; recarregar exige gerar outro.

No checkout, a confirmação perdida é recuperada por consulta à mesma sessão, sem criar outro pedido. Sessão expirada ou removida permite retomar o carrinho em uma sessão nova, exigindo revisão e confirmação novamente. Se não for possível confirmar o resultado, confira **Meus pedidos** antes de reiniciar a compra.

## Carrinhos com vários vendedores ou origens

Cada grupo possui proposta, versão, aceite, despacho e recebimento independentes. Um comprador pode aceitar um grupo enquanto negocia outro. Enquanto houver frete pendente, `total` e `frete` permanecem `null`; `total_parcial` soma produtos e fretes definidos. `acordo_pendente` indica que ainda faltam aceites, inclusive se havia tarifa inicial conhecida. A conclusão exige recebimento de todos os grupos físicos, não apenas do primeiro vendedor.

O vendedor vê apenas seus itens, grupos, valores e eventos. Não recebe preços, propostas ou histórico de outro vendedor. O endereço do comprador só aparece para o vendedor após aceite de uma proposta de entrega física daquele vendedor. Para retirada, o local é acertado pelo chat. IDs de conta são usados apenas para identificar participantes e abrir a conversa.

## Persistência e segurança

- Migração idempotente `backend/database/order-deliveries.js` cria `pedido_entregas` e `pedido_entrega_eventos`, aplicada pelo inicializador existente. Não recrie o banco. Reinicie a API ou publique um novo deploy após atualizar o código.
- Snapshot inicial do pedido e dos endereços não é reescrito. Acompanhamento, proposta e acordo ficam separados; eventos preservam condições e etapa de cada versão. Histórico retorna até 100 eventos recentes dos grupos autorizados.
- Pedidos anteriores que já tenham grupos válidos são exibidos com versão zero e ganham registros de acompanhamento na primeira ação, sem mudar valores ou aceitar proposta automaticamente.
- Toda ação ocorre em transação, bloqueia o pedido e exige versão. Pedido e grupo pertencem aos participantes consultados no servidor. O papel é inferido pelo JWT e pelo pedido, não pelo corpo. Administrador sem participação também não pode aceitar/enviar/confirmar em nome de alguém.
- Propostas só são aceitas pelo comprador; envio só pelo vendedor; recebimento só pelo comprador. Saltos de etapa, alterações após aceite e repetições são recusados com 409. Uma corrida de aceite produz uma única alteração/evento/notificação.
- Campos extras, preços negativos/com mais de duas casas, frete de retirada diferente de zero e alteração de pagamento são recusados. Notificação, auditoria, condição atual e totais são gravados atomicamente; nunca se marca o pedido como pago.
- Em pedidos acompanhados, os totais da API são calculados sobre os itens imutáveis e condições vigentes: propostas ainda não aceitas permanecem pendentes; acordos aceitos substituem o frete de referência. Colunas numéricas/status do pedido são atualizadas em cada ação como valores conhecidos, mas não devem ser interpretadas isoladamente como confirmação de pagamento.

## API

- `GET /pedidos`: compras da conta, até 50.
- `GET /pedidos/vendas`: vendas da conta, até 50, somente os próprios grupos e valores.
- `GET /pedidos/:id`: detalhe autorizado e eventos recentes.
- `PATCH /pedidos/:id/entregas/:grupo`: `{ acao, versao, ...campos }`. Grupo é o identificador estável devolvido pela API, por exemplo `12:1`; codifique-o na URL.
  - `propor`: vendedor; `modalidade`, `valor_frete`, `prazo`, `observacoes` opcional.
  - `aceitar` / `recusar`: comprador; somente ação e versão.
  - `despachar`: vendedor; observações e, para entrega, transportadora/código opcionais.
  - `receber`: comprador; somente ação e versão.
- `POST /pedidos/:id/entregas/:grupo/codigo`: comprador, `{ versao }`; gera código para retirada pronta, válido por 30 minutos.
- `POST /pedidos/:id/entregas/:grupo/recebimento`: vendedor do grupo, `{ versao, codigo }`; valida e registra recebimento. Cinco erros bloqueiam por 15 minutos. Os detalhes de proteção e uso único estão em [SERVICOS_DA_COMUNIDADE.md](SERVICOS_DA_COMUNIDADE.md#retirada-com-código).

JWT obrigatório; respostas sem cache; até 4 KB por ação e 60 atualizações/IP em dez minutos, além do limite global. Outro participante/pedido invisível retorna 404; ação do papel errado, 403; versão ou etapa incorreta, 409. O Swagger documenta as estruturas.

As rotas de código têm limite próprio de 30 solicitações/IP em dez minutos e corpo de até 1 KB, além do bloqueio persistente de tentativas incorretas por entrega.

## Verificação

Testes puros: `tests/order-deliveries.test.cjs`. Migração PostgreSQL com adaptador simulado: `tests/database-adapter.test.cjs`. Integração MySQL descartável cobre proposta, recusa, revisão, aceite concorrente, privacidade entre vendedores, fretes mistos, envio, retirada, recebimento, replay, notificações e pedidos anteriores. Nenhum desses testes altera Neon real, envia mensagens externas ou cobra valores.
