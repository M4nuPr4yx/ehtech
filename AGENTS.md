# AGENTS.md — contexto operacional da EHtech

## Regra de leitura e economia de tokens

Leia este arquivo inteiro antes de executar qualquer comando neste repositório. Depois:

1. Não faça uma varredura geral se a tarefa puder ser resolvida pelos caminhos indicados aqui.
2. Antes de editar, use `git status --short` uma única vez e preserve todas as alterações existentes do usuário.
3. Localize código com `rg -n "termo" caminho` e arquivos com `rg --files caminho`; não despeje arquivos grandes inteiros.
4. Ignore sempre `.next/`, `node_modules/`, `backend/node_modules/`, `backend/uploads/`, `scratch/`, `coverage/`, `out/` e `build/`, salvo se a tarefa mencionar diretamente um deles.
5. Para `backend/index.js`, procure primeiro a rota ou função exata e leia apenas o trecho ao redor. O arquivo é grande e concentra rotas legadas.
6. Não leia `backend/docs/openapi.json` inteiro: pesquise o path ou schema necessário. Atualize-o quando o contrato HTTP mudar.
7. Não rode `npm install` se `node_modules/` já existir e as dependências não tiverem mudado.
8. Rode somente os testes proporcionais à mudança; deixe a suíte completa para alterações transversais.
9. Não repita comandos que já produziram informação suficiente. Resuma resultados; não cole logs extensos.
10. Se este arquivo responder à dúvida estrutural, confie nele e inspecione o código somente para confirmar detalhes que possam ter mudado.

## Ideia do produto

EHtech é um marketplace acadêmico brasileiro de tecnologia. Une, no mesmo produto:

- compra e venda de equipamentos e componentes;
- anúncios sujeitos à aprovação administrativa;
- contratação de serviços técnicos de TI;
- orçamento, andamento, garantia e avaliação de serviços;
- carrinho e registro de pedidos;
- perfis, reputação, mensagens e notificações.

A visão de longo prazo é acompanhar o ciclo de vida do equipamento: escolha, compatibilidade, compra, instalação, manutenção, upgrade, revenda e descarte. O diferencial pretendido é combinar comércio, serviço técnico e histórico confiável. Veja `docs/ROADMAP_DIFERENCIAIS.md` somente quando a tarefa envolver produto, escopo ou priorização.

Princípios do projeto:

- manter o MVP executável sem custos recorrentes, usando código próprio, open source e planos gratuitos;
- preferir regras explicáveis a recomendações em “caixa-preta”;
- priorizar confiança, privacidade e utilidade antes de gamificação;
- separar estimativa, orçamento e preço final;
- não introduzir API paga, cartão ou infraestrutura com cobrança automática sem solicitação explícita.

## Tecnologias

- Node.js e JavaScript, sem TypeScript no código atual.
- Frontend: Next.js 16 App Router, React 19, React Compiler e Tailwind CSS 4/PostCSS.
- Backend: Express 4 em CommonJS.
- Banco: MySQL local ou PostgreSQL/Neon em produção, por meio do adaptador `backend/db.js`.
- Segurança/autenticação: JWT HS256, bcrypt, Helmet, CORS, rate limiting e validator.
- Uploads: Multer, arquivos servidos por `/uploads`.
- E-mail: Nodemailer, principalmente para recuperação de senha.
- API: OpenAPI 3 e Swagger UI servidos localmente.
- Testes: runner nativo `node:test`; lint com ESLint 9/Core Web Vitals.
- Deploy: Vercel; o frontend Next e a função serverless `api/index.js` compartilham o mesmo domínio.

## Arquitetura e caminhos importantes

| Caminho | Responsabilidade |
| --- | --- |
| `src/app/` | páginas e rotas do Next App Router |
| `src/app/complements/` | Header, Footer e política/componentes de imagem |
| `src/lib/api.js` | única fonte para construir URLs de API no frontend |
| `src/app/api/` | handlers Next específicos e proxy auxiliar |
| `backend/index.js` | aplicação Express, autenticação, produtos, perfil, mensagens e notificações |
| `backend/routes/` | uploads, serviços, contratações e pedidos |
| `backend/middleware/` | autenticação e política especial de carga |
| `backend/database/init.js` | inicialização/migrações idempotentes e seed de serviços |
| `backend/db.js` | compatibilidade MySQL/PostgreSQL e tradução parcial de SQL |
| `backend/docs/openapi.json` | contrato público da API |
| `database/schema.sql` | schema-base MySQL; não contém sozinho todas as tabelas atuais |
| `tests/` | testes unitários, integração, páginas, imagens, banco e Swagger |
| `docs/` | roadmap e instruções de rede/teste de carga |
| `config/lan.cjs` | hosts permitidos para desenvolvimento na rede local |

O `README.md` está vazio no estado atual; use este arquivo como mapa inicial.

## Fluxo de execução

- `npm run dev`: Next em `http://localhost:3001` e Express em `http://localhost:3000`.
- No navegador, o frontend chama `/api/...` pelo helper `getApiUrl()`.
- Em desenvolvimento, `next.config.mjs` reescreve `/api/*` para o Express e `/uploads/*` para o backend.
- Na Vercel, `vercel.json` encaminha `/api/*` para `api/index.js`, que reutiliza `backend/index.js`.
- `NEXT_PUBLIC_API_URL`, quando definido, tem prioridade no cliente. Não fixe `localhost` em código.
- `BACKEND_URL` muda o destino do rewrite no servidor.
- Swagger: `/api/docs` pelo Next/rewrite ou `/docs` diretamente no Express.
- Saúde: `/api/health` pelo site ou `/health` diretamente no Express.

## Comandos oficiais

Execute na raiz do repositório:

```powershell
npm run dev              # frontend + backend
npm run dev:front        # somente Next, porta 3001
npm run dev:back         # somente Express, porta 3000
npm run lint             # ESLint
npm test                 # testes rápidos: tests/*.test.cjs
npm run test:integration # integração com servidores temporários
npm run build            # build de produção do Next
npm start                # Next de produção, porta 3001
```

Não inicie uma segunda instância de `npm run dev`: ela disputará as portas. O teste de integração pode depender de banco e ambiente; se falhar por infraestrutura ausente, diferencie isso de regressão no código.

## Banco de dados e ambiente

Nunca leia, exiba, edite ou versione `backend/.env` sem necessidade explícita. Use apenas nomes de variáveis e `backend/.env.example`; não exponha valores.

Variáveis principais:

- conexão: `DATABASE_URL`/`POSTGRES_URL` para PostgreSQL ou `MYSQL_URL`; alternativamente `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE` e `DB_SSL`;
- autenticação: `API_SEGREDO` é obrigatória em produção;
- aplicação: `PORT`, `FRONTEND_URL`, `NEXT_PUBLIC_API_URL`, `BACKEND_URL` e `VERCEL`;
- e-mail: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` e `SMTP_PASS`.

`backend/db.js` oferece uma interface semelhante a `mysql2/promise` (`[rows, fields]`) também no PostgreSQL. Sua tradução SQL é parcial. Ao criar ou mudar consultas:

- use placeholders `?` e a interface do pool existente;
- confirme compatibilidade com MySQL e PostgreSQL;
- não dependa de sintaxe específica de um banco sem adaptar `backend/db.js`;
- mantenha inicializações idempotentes em `backend/database/init.js`;
- trate `database/schema.sql` como bootstrap/base, e `backend/database/init.js` como fonte das tabelas adicionais em runtime.

Entidades atuais: `usuarios`, `produtos`, `pedidos` legados, `pagamento`, `password_resets`, `notificacoes`, `avaliacoes`, `mensagens`, `servicos`, `contratacoes_servico`, `avaliacoes_servico`, `pedidos_produto` e `pedido_produto_itens`.

## Convenções do frontend

- Interface e mensagens ao usuário devem continuar em português do Brasil.
- Componentes interativos começam com `'use client'`.
- Use `getApiUrl()` de `src/lib/api.js`; não duplique lógica de host ou porta.
- JWT do usuário fica em `localStorage` sob `token`; nome/foto usam `userUsername` e `userFoto`.
- Token administrativo fica em `sessionStorage` sob `adminToken`.
- Carrinho fica em `localStorage` sob `cart`.
- Rotas protegidas enviam `Authorization: Bearer <token>`.
- Preserve o padrão visual existente em `src/app/globals.css` e nos módulos CSS das áreas de serviços/contratações.
- Imagens devem passar pelos helpers/políticas em `src/app/complements/`; não reintroduza URLs ou formatos bloqueados sem revisar segurança e fallback.

## API e regras de domínio

Grupos principais de rotas:

- autenticação: `/cadastro`, `/login`, `/esqueci-senha`, `/redefinir-senha`;
- administração: `/admin/*`;
- produtos: `/produtos`, `/produtos/catalogo`, `/produtos/meus`, `/produtos/:id`;
- serviços: `/servicos` e `/servicos/:slug`;
- contratações: `/contratacoes` e transições de orçamento/status/avaliação;
- pedidos: `/pedidos`;
- perfil e reputação: `/perfil`, `/usuarios/:id/publico`, `/avaliacoes/*`;
- comunicação: `/mensagens/*` e `/notificacoes/*`;
- arquivos: `/upload/*` e `/uploads/*`;
- documentação/operação: `/docs` e `/health`.

Regras importantes:

- anúncios nascem pendentes e só produtos aprovados devem aparecer no catálogo público;
- alterações e exclusões devem conferir propriedade ou função de administrador;
- somente perfis autorizados atuam como prestadores/vendedores conforme as regras já existentes;
- transições de contratação, orçamento, garantia e avaliação devem manter as autorizações de cliente/prestador;
- não relaxe validação, limites de payload/upload, rate limits ou verificação JWT para “fazer funcionar”;
- mudanças de endpoint exigem sincronizar backend, chamadas do frontend, testes e OpenAPI.

## Segurança e dados

- Nunca registre senha, JWT, segredo, credencial SMTP, string de conexão ou conteúdo pessoal.
- Não versione `.env`, dumps, backups ou dados reais; `.gitignore` já protege esses arquivos.
- Senhas devem permanecer com hash bcrypt; tokens de redefinição são armazenados por hash e têm expiração.
- Valide IDs, dinheiro, strings, propriedade do recurso e papel do usuário no servidor, mesmo se o frontend já validar.
- Uploads precisam preservar whitelist de MIME/extensão, limite de tamanho, nomes gerados e proteção contra path traversal.
- Não altere firewall, roteador, credenciais do banco ou serviços externos como efeito colateral de desenvolvimento.

## Estratégia de inspeção por tipo de tarefa

- UI/página: abra somente a página em `src/app/...`, seus componentes importados e o CSS correspondente.
- chamada de API: comece em `src/lib/api.js`, depois na chamada da página e na rota Express correspondente.
- produto/catálogo: `backend/index.js`, páginas `src/app/produtos/`, `src/app/anunciar/` e testes de imagens.
- serviço/contratação: `backend/routes/services.js`, `backend/routes/serviceContracts.js`, `src/app/servicos/` e `src/app/contratacoes/`.
- carrinho/pedido: `src/app/carrinho/page.js` e `backend/routes/orders.js`.
- banco: `backend/db.js`, `backend/database/init.js` e só então `database/schema.sql`.
- deploy/rede: `next.config.mjs`, `vercel.json`, `api/index.js`, `config/lan.cjs` e `docs/TESTE_CARGA_E_REDE.md`.
- documentação da API: pesquise a rota em `backend/docs/openapi.json` e confira `backend/docs/additional-routes.js`.

## Estado do repositório e disciplina de edição

O projeto pode estar com muitas mudanças não commitadas. Considere-as trabalho do usuário:

- não use `git reset --hard`, `git checkout --`, `git clean` ou equivalentes destrutivos;
- não reformate arquivos sem relação com a tarefa;
- não sobrescreva imagens, uploads ou banco;
- antes de editar uma região já modificada, examine o diff apenas daquele arquivo;
- mantenha a mudança mínima e focada; não faça refatoração paralela sem pedido.

## Verificação e definição de pronto

Escolha a menor verificação que cubra o risco:

- documentação apenas: revisar o diff e os caminhos/comandos citados;
- frontend isolado: `npm run lint -- <arquivo>` quando suportado, ou lint geral se necessário;
- backend/validação: teste `.test.cjs` relacionado;
- contrato ou rota: teste de API/Swagger relacionado;
- mudança transversal: `npm test`, depois `npm run lint`; use `npm run build` quando afetar renderização, configuração Next ou deploy;
- integração real: `npm run test:integration` apenas quando banco/servidores forem relevantes.

Ao finalizar, informe de forma curta: arquivos alterados, comportamento resultante, testes executados e qualquer limitação real. Não afirme que um teste passou se ele não foi executado.
