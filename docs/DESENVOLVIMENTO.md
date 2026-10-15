# Referência de desenvolvimento

Leia apenas a parte relacionada à alteração. A instalação está no [README](../README.md).

## Mapa

| Área | Entrada |
| --- | --- |
| API e autenticação | `backend/index.js`, `backend/middleware/auth.js` |
| Produtos | rotas no `backend/index.js`, `src/app/produtos/`, `src/app/anunciar/` |
| Serviços/contratações | `backend/routes/services.js`, `serviceContracts.js`; páginas correspondentes |
| Carrinho/pedidos | `src/app/carrinho/page.js`, `backend/routes/orders.js` |
| Componentes/compatibilidade | `backend/components/`, `backend/routes/components.js`, `src/app/compatibilidade/` |
| Passaportes | `backend/routes/passports.js`, `backend/database/passports.js`, `src/app/passaportes/` |
| Imagens | `src/app/complements/imagePolicy.mjs`, `imageHelper.js`, `ImageWithFallback.js`, `backend/uploads.js` |
| Banco | `backend/db.js`, `backend/database/init.js` e módulos em `backend/database/` |
| Contrato HTTP | `backend/docs/openapi.json` + `backend/docs/additional-routes.js` |
| Deploy/rede | `next.config.mjs`, `vercel.json`, `api/index.js`, `config/lan.cjs` |

`backend/index.js` e `openapi.json` são grandes: pesquise a rota e leia o trecho necessário. `database/schema.sql` é apenas uma base histórica; não substitui as migrações em runtime.

## Convenções

JavaScript, Express CommonJS e Next App Router. Textos da interface em pt-BR. Componentes interativos usam `'use client'`; URLs da API passam por `getApiUrl()` de `src/lib/api.js`. JWT de usuário: `localStorage.token`; administrador: `sessionStorage.adminToken`; carrinho: `localStorage.cart`; nome/foto: `userUsername`/`userFoto`. Chamadas protegidas usam `Authorization: Bearer`.

Preserve a política de imagens e os temas em `src/app/globals.css`/módulos CSS. Anúncios são pendentes até aprovação. Verifique propriedade, papel, IDs, valores monetários e transições de serviço no servidor; não relaxe autorização ou validação para resolver falhas.

O adaptador de banco recebe SQL com `?` e retorna `[rows, fields]`, inclusive no PostgreSQL. A tradução é parcial: mudanças de SQL precisam considerar os dois bancos e manter migrações idempotentes. Os testes do adaptador cobrem tradução e transações com doubles; a integração real automatizada usa MySQL/MariaDB, não comprova execução completa em PostgreSQL.

## Testes de integração

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

## Referências por assunto

- Escopo/priorização: [ROADMAP_DIFERENCIAIS.md](ROADMAP_DIFERENCIAIS.md).
- Compatibilidade técnica: [COMPATIBILIDADE.md](COMPATIBILIDADE.md); IA opcional: [IA_COMPATIBILIDADE.md](IA_COMPATIBILIDADE.md).
- Temas e assets: [INTERFACE_E_TEMAS.md](INTERFACE_E_TEMAS.md), [RECURSOS_VISUAIS.md](RECURSOS_VISUAIS.md).
- Rede e carga: [TESTE_CARGA_E_REDE.md](TESTE_CARGA_E_REDE.md).

As instruções do assistente ficam curtas em `AGENTS.md`; procedimentos específicos ficam nas skills locais e nesta referência, carregados só quando necessários. Esse formato segue a [orientação oficial sobre skills e contexto progressivo](https://developers.openai.com/blog/skills-agents-sdk).
