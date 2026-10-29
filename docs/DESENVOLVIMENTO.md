# Referência de desenvolvimento

Leia apenas a parte relacionada à alteração. A instalação está no [README](../README.md).

## Mapa

| Área | Entrada |
| --- | --- |
| API e autenticação | composição em `backend/index.js`, `backend/routes/auth.js`, `recovery.js`, `middleware/auth.js` |
| Produtos | `backend/routes/products.js`, `src/app/produtos/`, `src/app/anunciar/` |
| Perfil, avaliações, mensagens e administração | routers próprios em `backend/routes/`; validação comum em `user-validation.js` |
| Serviços/contratações | `backend/routes/services.js`, `serviceContracts.js`; páginas correspondentes |
| Carrinho/pedidos | `src/app/carrinho/page.js`, `backend/routes/orders.js` |
| Componentes/compatibilidade | `backend/components/`, `backend/routes/components.js`, `src/app/compatibilidade/` |
| Passaportes | `backend/routes/passports.js`, `backend/database/passports.js`, `src/app/passaportes/` |
| Imagens | `src/app/complements/imagePolicy.mjs`, `imageHelper.js`, `ImageWithFallback.js`, `backend/uploads.js` |
| Banco | `backend/db.js`, `backend/database/init.js` e módulos em `backend/database/` |
| Contrato HTTP | `backend/docs/openapi.json` + `backend/docs/additional-routes.js` |
| Deploy/rede | `next.config.mjs`, `vercel.json`, `api/index.js`, `config/lan.cjs` |

`backend/index.js` compõe middleware, routers e inicialização. O contrato está em `openapi.json` e `additional-routes.js`: pesquise a rota e leia apenas o trecho necessário. `database/schema.sql` é uma base histórica; não substitui as migrações em runtime.

## Convenções

Proteções de conta, limites persistentes de senha, armazenamento de senhas e cabeçalhos: [SEGURANCA.md](SEGURANCA.md). Todas as operações que escrevem ou verificam senha usam `backend/passwords.js`, inclusive administração, recuperação e vínculo Google; não adicione chamadas diretas ao bcrypt nessas rotas. Migrações novas exigem incrementar `SCHEMA_VERSION`.

JavaScript, Express CommonJS e Next App Router. Textos da interface em pt-BR. Componentes interativos usam `'use client'`; URLs da API passam por `getApiUrl()` de `src/lib/api.js`. JWT de usuário: `localStorage.token`; administrador: `sessionStorage.adminToken`; carrinho: `localStorage.cart`; nome/foto: `userUsername`/`userFoto`. Chamadas protegidas usam `Authorization: Bearer`.

Preserve a política de imagens e os temas em `src/app/globals.css`/módulos CSS. Anúncios são pendentes até aprovação. Verifique propriedade, papel, IDs, valores monetários e transições de serviço no servidor; não relaxe autorização ou validação para resolver falhas.

O adaptador recebe SQL com `?` e retorna `[rows, fields]` nos dois bancos. A tradução continua limitada ao SQL usado pelo projeto: novas consultas precisam considerar ambos e manter migrações idempotentes. Além dos testes com doubles, a mesma suíte de negócio é executada em MySQL/MariaDB e PostgreSQL real. `DB_DRIVER=postgres` permite selecionar PostgreSQL sem URL; `DB_SSL=false` é explícito para instância local de teste. Preserve TLS na hospedagem.

O frontend usa `src/lib/api-request.js`: `apiRequest` retorna dados ou `ApiError` com status, código, erros de validação e Retry-After; `apiResponse` preserva a interface ok/status/json para telas existentes. Ambos centralizam URL, timeout, parsing, multipart e cancelamento. Não repetem escritas automaticamente. As URLs continuam em `api.js`. O erro de sessão invalida somente o token que originou a requisição, preservando login mais recente e distinguindo falta de permissão.

## Testes de integração

A inicialização registra versões concluídas em `ehtech_schema_versoes`. Uma nova instância faz apenas a consulta dessa versão; as migrações não são repetidas a cada cold start da Vercel. Ao alterar o schema, incremente `SCHEMA_VERSION` em `backend/database/schema-version.js` no mesmo commit da migração. O marcador só é concluído após todas as etapas; uma concessão temporária no banco coordena instâncias concorrentes, sem depender de conexões persistentes ou locks de sessão no Neon. Falhas liberam a concessão e a morte da instância permite recuperação após dois minutos.

`npm test` roda testes rápidos; a integração de banco fica desativada nesse comando. `npm run test:integration` cria uma base `ehtech_test_<pid>_<timestamp>`, faz requisições HTTP a um servidor temporário e remove a base e os uploads de teste ao terminar. Não envia e-mails reais e não chama provedores de IA.

A conta de teste precisa de `CREATE DATABASE`/`DROP DATABASE`. Configuração: `TEST_DB_HOST`, `TEST_DB_PORT`, `TEST_DB_USER`, `TEST_DB_PASSWORD`; na ausência dessas variáveis, usa `DB_*` do processo ou de `backend/.env`. Variáveis do processo têm prioridade. URLs PostgreSQL não são usadas pelo teste MySQL.

Exemplo PowerShell, usando o banco Docker deste projeto:

```powershell
$env:TEST_DB_HOST = '127.0.0.1'
$env:TEST_DB_PORT = '3307'
$env:TEST_DB_USER = 'root'
$env:TEST_DB_PASSWORD = 'ehtech_root_local'
npm run test:integration
```

Em Bash: `TEST_DB_HOST=127.0.0.1 TEST_DB_PORT=3307 TEST_DB_USER=root TEST_DB_PASSWORD=ehtech_root_local npm run test:integration`.

Para uma revisão transversal, rode `npm run check` e integração. Para alterações isoladas, rode o teste relevante e lint; build quando houver efeito em renderização/configuração. Não repita a suíte completa após um resultado suficiente sem mudança nova.

## PostgreSQL real em teste

`npm run test:integration:postgres` executa a mesma suíte com `TEST_PG_HOST`,
`TEST_PG_PORT`, `TEST_PG_USER`, `TEST_PG_PASSWORD` e, opcionalmente,
`TEST_PG_ADMIN_DATABASE` (padrão `postgres`). Não usa `DATABASE_URL` da aplicação.
A conta precisa criar/remover a base temporária. O runner usa uma base
`ehtech_test_<pid>_<timestamp>`, uploads temporários e servidor em porta livre.
Relatórios separados em `scratch/audit/api-results-mysql.json` e `api-results-postgres.json`.

Sem serviço instalado, baixe os [binários oficiais portáteis](https://www.enterprisedb.com/download-postgresql-binaries),
extraia fora dos arquivos versionados e aponte `TEST_POSTGRES_BIN` para `pgsql/bin`.
Rode `npm run test:integration:postgres:local`. O runner cria cluster descartável,
escolhe porta livre, escuta somente em `127.0.0.1`, testa e encerra/remove seus dados.
Não instala serviço nem altera firewall. Trust é exclusivo dessa instância de teste
em loopback; não copie para a configuração da aplicação. O CI usa PostgreSQL 17 e
roda as duas variantes da integração.

## Testes no navegador

Sem MySQL disponível, é possível executar a mesma jornada com PostgreSQL portátil descartável:
`node tests/run-postgres-local.cjs --e2e`. Reutiliza `TEST_POSTGRES_BIN` ou a pasta portátil
documentada acima. O runner cria base `ehtech_e2e_*`, usa somente loopback/portas livres e
remove base, cluster e uploads ao terminar. Para isolar as novas jornadas:
`node tests/run-postgres-local.cjs --e2e --production --grep "serviços da comunidade|jornada real"`.
O modo `--production` compila e inicia o frontend de teste em `scratch/e2e-next`, evitando
recarregamentos do Fast Refresh durante navegação entre páginas. Sem essa opção, usa desenvolvimento.
Com PostgreSQL de teste já disponível, use `npm run test:e2e -- --postgres` e `TEST_PG_*`.

Para o lote de produtos/serviços com fotos e as amostras de carga isoladas, use
`node tests/run-postgres-local.cjs --demo`. Esse modo executa somente
`run-demo-catalog.cjs`, em base descartável, sem frontend/CDN e sem chamadas externas.
Escopo, dados, controles de inserção e limites das medições: [CATALOGO_DEMONSTRACAO.md](CATALOGO_DEMONSTRACAO.md).

`npm run test:e2e` executa Playwright com Chromium em desktop e viewport de celular.
Antes da primeira execução, instale o navegador com `npx playwright install chromium`
(no Linux/CI: `npx playwright install --with-deps chromium`). Reutiliza as credenciais
`TEST_DB_*` da seção de integração e exige CREATE/DROP DATABASE. Não execute contra
produção: o runner recusa NODE_ENV=production e VERCEL, cria exclusivamente uma base
`ehtech_e2e_<pid>_<timestamp>` e usa uploads temporários. API e frontend iniciam em
portas livres, sem ocupar 3000/3001, e são encerrados ao terminar.

A fixture inicial cria o administrador; cenários específicos criam dados fictícios
via API para histórico longo e metadados. Cadastro, anúncio, aprovação,
compra, acordo, recebimento, avaliação, favoritos, comparação, denúncia, bloqueio,
decisão administrativa e troca de senha são exercitados pela interface. A consulta
externa de CEP usa uma fixture local; nenhum e-mail ou pedido de IA sai dos testes.
Os endpoints de negócio e o banco permanecem reais. O reset de rate limits existe
somente no processo da fixture, com chave aleatória por execução; não faz parte da API.

Para isolar um cenário: `npm run test:e2e -- --project=desktop` ou
`npm run test:e2e -- --project=celular`. O build E2E usa `scratch/e2e-next`,
preservando `.next`. Relatório em `scratch/e2e-report/index.html`; capturas e traces
de falhas ficam em `scratch/e2e-results`. Todos são ignorados pelo Git. O CI executa
os dois tamanhos e guarda evidências por sete dias em caso de falha.

Também são exercitados foco/teclado do modal, quatro temas com axe-core WCAG
2.1 A/AA, checagem sem IA, HTML/metadados/sitemap/404, restauração de rascunho,
paginação/rolagem de conversas e pausa de polling em aba oculta. Contraste é medido
com movimento reduzido, sem capturar transições parciais das cores. Somente o portal
de desenvolvimento do Next fica excluído da auditoria; a aplicação é incluída.
Relatórios axe são anexados ao relatório Playwright. Isso não é certificação de
acessibilidade nem substitui testes com tecnologias assistivas e aparelhos físicos.

O plano detalhado das melhorias e o registro de execução estão em
[PLANO_MELHORIAS_EHTECH.txt](PLANO_MELHORIAS_EHTECH.txt).

## Referências por assunto

- Escopo/priorização: [ROADMAP_DIFERENCIAIS.md](ROADMAP_DIFERENCIAIS.md).
- Login Google, configuração e identidade de teste: [LOGIN_GOOGLE.md](LOGIN_GOOGLE.md).
- Inspeção de usados, compra por missão e combos: [DIFERENCIAIS_IMPLEMENTADOS.md](DIFERENCIAIS_IMPLEMENTADOS.md).
- Origem de envio, endereços reutilizáveis e filtros: [ORIGEM_E_FILTROS.md](ORIGEM_E_FILTROS.md).
- Busca de pessoas e conversas diretas: [MENSAGENS_E_BUSCA.md](MENSAGENS_E_BUSCA.md).
- Compatibilidade técnica: [COMPATIBILIDADE.md](COMPATIBILIDADE.md); IA opcional: [IA_COMPATIBILIDADE.md](IA_COMPATIBILIDADE.md).
- Temas e assets: [INTERFACE_E_TEMAS.md](INTERFACE_E_TEMAS.md), [RECURSOS_VISUAIS.md](RECURSOS_VISUAIS.md).
- Rede e carga: [TESTE_CARGA_E_REDE.md](TESTE_CARGA_E_REDE.md).

As instruções do assistente ficam curtas em `AGENTS.md`; procedimentos específicos ficam nas skills locais e nesta referência, carregados só quando necessários. Esse formato segue a [orientação oficial sobre skills e contexto progressivo](https://developers.openai.com/blog/skills-agents-sdk).
