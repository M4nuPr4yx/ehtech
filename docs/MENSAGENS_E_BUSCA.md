# Busca de pessoas e conversas diretas

## Usar

1. Entre na conta e abra **Mensagens**.
2. Clique em **Nova conversa** ou **Procurar pessoas**.
3. Digite pelo menos dois caracteres do nome público ou `@usuário`. O `@` inicial é opcional.
4. Clique em **Conversar** no resultado; não é necessário que a pessoa tenha anunciado algo. A conversa entra na lista depois da primeira mensagem enviada.
5. Use **Minhas conversas** para voltar à lista e o campo de filtro para localizar um contato com quem já conversou.

O resultado também oferece link para o perfil público. Links diretos usam `/mensagens?usuario=ID`; links antigos com `vendedor=ID&produto=ID` continuam funcionando. Conversas iniciadas por um anúncio podem manter o contexto do produto. Ao escolher outra pessoa ou iniciar conversa direta, o contexto anterior é removido para não anexar um anúncio por engano.

## Privacidade e regras

- A busca exige JWT válido, exclui a própria conta e retorna somente ID, `username`, nome e foto que já compõem o perfil público. Não retorna nem pesquisa e-mail, senha, papéis, endereços ou conteúdo das mensagens.
- O servidor aceita termos de 2 a 80 caracteres, depois de remover espaços e o `@` inicial. Busca ignora maiúsculas e trata `%` e `_` literalmente. Prioriza username exato/prefixo e nome exato, com desempate por username/ID.
- Resultados têm paginação de 12 itens, até 100 páginas. Refine o termo se necessário. Aplica-se o rate limit global existente; não há serviço externo nem API paga.
- `POST /mensagens` já aceita ausência de `produtoId`. O remetente vem exclusivamente do JWT; o destinatário deve existir e ser outra conta. Histórico e leitura continuam limitados às mensagens trocadas entre a conta autenticada e o contato.
- Respostas atrasadas de outra conversa não substituem o histórico ou contexto atual. Falha no envio preserva o texto para nova tentativa na mesma conversa. O limite da interface é de 2.000 caracteres, alinhado ao servidor.
- Mantém notificações e indicadores existentes. A atualização continua por consultas periódicas, não por WebSocket. Conversas e cabeçalho suspendem polling com a aba oculta e retomam ao voltar. Denúncia e bloqueio estão disponíveis na conversa; não há chamadas ou verificação de identidade.

## Histórico paginado

O histórico inicial traz as 40 mensagens mais recentes, em ordem crescente de ID.
Carregar mensagens anteriores busca mais 40 e preserva a posição de leitura.
Polling usa `depois=ID` e retorna somente novidades; `antes=ID` busca histórico.
O servidor aceita limite de 1 a 100 e rejeita dois cursores simultâneos. Não há
deduplicação por texto: IDs preservam mensagens iguais e evitam repetições na junção.
Recibos `lidas_ate` atualizam a leitura de mensagens já carregadas, mesmo sem novas
mensagens. O cliente marca leitura até o maior ID recebido, sem antecipar mensagens
ainda não baixadas. Requisições pendentes são canceladas ao mudar de conversa.

Com conversa aberta, novidades são consultadas a cada oito segundos e a lista de
conversas a cada três ciclos; notificações do cabeçalho a cada 30 segundos. Enviar
mensagem atualiza a própria tela imediatamente. Voltar à aba atualiza os dados.
Isso reduz consultas periódicas sem ampliar o rate limit global. Fora de escritas
e mudanças de tela, a estimativa de consultas cai de 570 para cerca de 210 por
15 minutos de aba visível. Latência de chegada de mensagem pode chegar a oito
segundos, além do tempo de rede; não é comunicação por WebSocket.

## Código e testes

Busca: `backend/user-search.js` e `GET /usuarios/busca` em `backend/routes/profile.js`. Histórico/envio: `backend/routes/messages.js`, com validação de cursor em `backend/message-pagination.js`. Interface: `src/app/complements/UserSearch.js` e `src/app/mensagens/page.js`. Contrato atualizado em `/docs/openapi.json`.

Testes: `node --test tests/user-search.test.cjs tests/swagger-additions.test.cjs`. A integração em base temporária (`npm run test:integration`) verifica busca por username/nome, ausência de dados privados, paginação, pessoa sem anúncios, mensagens diretas, destinatário/remetente e privacidade do histórico. `npm run check` verifica lint, suíte rápida e build.

Não há migração de banco nova para esta funcionalidade. Reinicie o backend para carregar a rota e atualize o frontend. A integração automatizada real usa MySQL/MariaDB; as consultas de produção usam placeholders `?` e SQL compatível com o adaptador PostgreSQL, sem comprovar execução real neste último.
