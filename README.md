# EHtech
# EHtech

Marketplace acadêmico de tecnologia: produtos com aprovação administrativa, serviços técnicos, pedidos, mensagens, passaporte de equipamentos e verificação de compatibilidade de componentes.

Next.js 16 / React 19 no frontend, Express no backend e MySQL (local) ou PostgreSQL/Neon. Interface em português do Brasil.

## Rodar depois do clone

Requisitos: **Node.js 24** (veja `.nvmrc`), npm 10+ e Git. Para o banco, use Docker com Compose v2 ou uma instalação própria de MySQL/MariaDB. Todas as dependências JavaScript são instaladas **na raiz**.

```sh
git clone https://github.com/M4nuPr4yx/ehtech.git
cd ehtech
npm ci
npm run setup
npm run db:up
npm run db:init
npm run dev
```

Abra **http://localhost:3001**. A API usa a porta 3000; o MySQL do Compose usa **3307**, acessível apenas pela máquina local. O banco fica em volume persistente. `npm run db:stop` para o contêiner sem apagar os dados.

`npm run setup` cria `backend/.env` com segredo JWT aleatório e os parâmetros do banco Docker. Se o arquivo já existir, ele é preservado: confira se sua configuração corresponde ao banco que pretende usar. `npm run db:init` aplica tabelas, migrações e catálogo técnico; o backend também faz essa inicialização ao iniciar. Não é necessário importar SQL manualmente.

O Compose contém credenciais públicas **exclusivas para desenvolvimento local**. O primeiro download da imagem e das dependências exige internet. A compilação usa fontes locais.

### Usar seu MySQL/MariaDB sem Docker

Execute `npm ci` e `npm run setup`. Crie um banco vazio `ehtech` em UTF-8 e ajuste `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` e `DB_DATABASE` em `backend/.env`. A conta precisa poder criar/alterar tabelas nessa base. Em seguida, execute `npm run db:init` e `npm run dev`; pule `db:up`.

```sql
CREATE DATABASE IF NOT EXISTS ehtech CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
```

### Primeiro acesso e administração

Cadastre sua conta pelo site. O banco novo não inclui usuários nem senhas padrão. Para habilitar a aprovação de anúncios e a gestão de componentes:

```sh
npm run admin:promote -- --email seu-email@example.com
```

O comando promove uma conta já cadastrada no banco configurado. Acesse `/admin` e entre com a senha dessa conta. Reinicie o backend para criar os serviços de exemplo vinculados ao administrador. Anúncios novos ficam pendentes até aprovação.

Opcionalmente, em uma base **local de demonstração chamada `ehtech`**, após `db:init`:

```sh
npm run seed:test-data -- --confirm-local
```

Esse seed cria/atualiza 50 contas (`usuario1@gmail.com` a `usuario50@gmail.com`, senha de teste `aA123456`) e produtos fictícios aprovados. Ele redefine as contas de demonstração se já existirem; use apenas em banco de teste. As imagens ausentes recebem o logo local como ilustração. Não execute em banco com dados reais.

## Configuração opcional

- **Frontend:** não precisa de `.env.local` na instalação padrão. Use `.env.example` como referência para mudar `BACKEND_URL` (destino do proxy no servidor). `NEXT_PUBLIC_API_URL` substitui `/api` no navegador; mantenha vazio para o mesmo domínio. Nunca use `NEXT_PUBLIC_*` para segredos.
- **E-mail:** configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` e `SMTP_PASS` no backend. Sem SMTP, a recuperação de senha não envia o link.
- **IA:** vem desativada. A análise de compatibilidade por regras funciona sem chave ou API externa. Para explicações opcionais, consulte [IA_COMPATIBILIDADE.md](docs/IA_COMPATIBILIDADE.md).
- **PostgreSQL/Neon:** configure `DATABASE_URL` no ambiente do backend e um `API_SEGREDO` exclusivo. O caminho local e a integração automatizada deste guia usam MySQL/MariaDB; veja [DESENVOLVIMENTO.md](docs/DESENVOLVIMENTO.md) para as limitações do adaptador.

## Comandos e verificações

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Next (3001) e API (3000); Ctrl+C encerra os dois |
| `npm run dev:front` / `npm run dev:back` | Iniciar cada parte separadamente |
| `npm run db:init` | Criar/migrar tabelas no banco configurado, sem abrir servidor |
| `npm run check` | Lint, testes rápidos e build de produção |
| `npm run test:integration` | Exercitar a API em banco e uploads temporários |
| `npm run build` | Compilar o frontend para produção |
| `npm run start:all` | Frontend compilado e backend; exige banco e build prévios |
| `npm start` | Somente frontend compilado |

O CI do GitHub instala com `npm ci`, inicializa um MySQL limpo, roda `check` e a integração, sem segredos da máquina do autor. A integração precisa de uma conta com permissão para criar/remover bancos temporários; veja [como configurar](docs/DESENVOLVIMENTO.md#testes-de-integração).

Diagnóstico: **http://localhost:3001/api/health**, documentação da API em **http://localhost:3001/api/docs**. A API direta também responde em `/health` e `/docs` na porta 3000.

## Problemas comuns

- **Conexão recusada / banco desconhecido:** inicie o banco e confira porta/credenciais. O Compose usa 3307; uma instalação própria geralmente usa 3306. O banco precisa existir antes de `db:init`.
- **Porta 3000 ou 3001 ocupada:** encerre a instância anterior antes de iniciar outra.
- **Catálogo ou serviços vazios:** produtos precisam de aprovação; serviços de exemplo exigem um administrador e reinicialização da API.
- **Falha no `npm ci`:** confirme a versão do Node e o acesso ao registro npm. Não instale um segundo conjunto de dependências dentro de `backend/`.

## Estrutura e publicação

`src/`: frontend; `backend/`: API e migrações; `api/`: entrada serverless; `tests/`: testes; `docs/`: documentação; `.agents/skills/`: fluxo específico para o assistente.

Para publicar no GitHub, inclua código, assets locais, exemplos de ambiente e `package-lock.json`. `.env`, uploads, `node_modules`, `.next`, dumps e `scratch` são locais e ficam fora do Git. Confira `git diff --check` e `git status --short` depois das verificações.

A configuração Vercel está incluída, mas publicar exige banco e variáveis no provedor. Uploads locais em serverless são temporários; armazenamento persistente de arquivos precisa ser configurado antes de usar esse modo com dados reais. O funcionamento local segue o fluxo acima.

Resultado da revisão de entrega: [CHECKUP.md](docs/CHECKUP.md).
Marketplace acadêmico de tecnologia: produtos com aprovação administrativa, serviços técnicos, pedidos, mensagens, passaporte de equipamentos e verificação de compatibilidade de componentes.

Next.js 16 / React 19 no frontend, Express no backend e MySQL (local) ou PostgreSQL/Neon. Interface em português do Brasil.

## Rodar depois do clone

Requisitos: **Node.js 24** (veja `.nvmrc`), npm 10+ e Git. Para o banco, use Docker com Compose v2 ou uma instalação própria de MySQL/MariaDB. Todas as dependências JavaScript são instaladas **na raiz**.

```sh
git clone https://github.com/M4nuPr4yx/ehtech.git
cd ehtech
npm ci
npm run setup
npm run db:up
npm run db:init
npm run dev
```

Abra **http://localhost:3001**. A API usa a porta 3000; o MySQL do Compose usa **3307**, acessível apenas pela máquina local. O banco fica em volume persistente. `npm run db:stop` para o contêiner sem apagar os dados.

`npm run setup` cria `backend/.env` com segredo JWT aleatório e os parâmetros do banco Docker. Se o arquivo já existir, ele é preservado: confira se sua configuração corresponde ao banco que pretende usar. `npm run db:init` aplica tabelas, migrações e catálogo técnico; o backend também faz essa inicialização ao iniciar. Não é necessário importar SQL manualmente.

O Compose contém credenciais públicas **exclusivas para desenvolvimento local**. O primeiro download da imagem e das dependências exige internet. A compilação usa fontes locais.

### Usar seu MySQL/MariaDB sem Docker

Execute `npm ci` e `npm run setup`. Crie um banco vazio `ehtech` em UTF-8 e ajuste `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` e `DB_DATABASE` em `backend/.env`. A conta precisa poder criar/alterar tabelas nessa base. Em seguida, execute `npm run db:init` e `npm run dev`; pule `db:up`.

```sql
CREATE DATABASE IF NOT EXISTS ehtech CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
```

### Primeiro acesso e administração

Cadastre sua conta pelo site. O banco novo não inclui usuários nem senhas padrão. Para habilitar a aprovação de anúncios e a gestão de componentes:

```sh
npm run admin:promote -- --email seu-email@example.com
```

O comando promove uma conta já cadastrada no banco configurado. Acesse `/admin` e entre com a senha dessa conta. Reinicie o backend para criar os serviços de exemplo vinculados ao administrador. Anúncios novos ficam pendentes até aprovação.

Opcionalmente, em uma base **local de demonstração chamada `ehtech`**, após `db:init`:

```sh
npm run seed:test-data -- --confirm-local
```

Esse seed cria/atualiza 50 contas (`usuario1@gmail.com` a `usuario50@gmail.com`, senha de teste `aA123456`) e produtos fictícios aprovados. Ele redefine as contas de demonstração se já existirem; use apenas em banco de teste. As imagens ausentes recebem o logo local como ilustração. Não execute em banco com dados reais.

## Configuração opcional

- **Frontend:** não precisa de `.env.local` na instalação padrão. Use `.env.example` como referência para mudar `BACKEND_URL` (destino do proxy no servidor). `NEXT_PUBLIC_API_URL` substitui `/api` no navegador; mantenha vazio para o mesmo domínio. Nunca use `NEXT_PUBLIC_*` para segredos.
- **E-mail:** configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` e `SMTP_PASS` no backend. Sem SMTP, a recuperação de senha não envia o link.
- **IA:** vem desativada. A análise de compatibilidade por regras funciona sem chave ou API externa. Para explicações opcionais, consulte [IA_COMPATIBILIDADE.md](docs/IA_COMPATIBILIDADE.md).
- **PostgreSQL/Neon:** configure `DATABASE_URL` no ambiente do backend e um `API_SEGREDO` exclusivo. O caminho local e a integração automatizada deste guia usam MySQL/MariaDB; veja [DESENVOLVIMENTO.md](docs/DESENVOLVIMENTO.md) para as limitações do adaptador.

## Comandos e verificações

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Next (3001) e API (3000); Ctrl+C encerra os dois |
| `npm run dev:front` / `npm run dev:back` | Iniciar cada parte separadamente |
| `npm run db:init` | Criar/migrar tabelas no banco configurado, sem abrir servidor |
| `npm run check` | Lint, testes rápidos e build de produção |
| `npm run test:integration` | Exercitar a API em banco e uploads temporários |
| `npm run build` | Compilar o frontend para produção |
| `npm run start:all` | Frontend compilado e backend; exige banco e build prévios |
| `npm start` | Somente frontend compilado |

O CI do GitHub instala com `npm ci`, inicializa um MySQL limpo, roda `check` e a integração, sem segredos da máquina do autor. A integração precisa de uma conta com permissão para criar/remover bancos temporários; veja [como configurar](docs/DESENVOLVIMENTO.md#testes-de-integração).

Diagnóstico: **http://localhost:3001/api/health**, documentação da API em **http://localhost:3001/api/docs**. A API direta também responde em `/health` e `/docs` na porta 3000.

## Problemas comuns

- **Conexão recusada / banco desconhecido:** inicie o banco e confira porta/credenciais. O Compose usa 3307; uma instalação própria geralmente usa 3306. O banco precisa existir antes de `db:init`.
- **Porta 3000 ou 3001 ocupada:** encerre a instância anterior antes de iniciar outra.
- **Catálogo ou serviços vazios:** produtos precisam de aprovação; serviços de exemplo exigem um administrador e reinicialização da API.
- **Falha no `npm ci`:** confirme a versão do Node e o acesso ao registro npm. Não instale um segundo conjunto de dependências dentro de `backend/`.

## Estrutura e publicação

`src/`: frontend; `backend/`: API e migrações; `api/`: entrada serverless; `tests/`: testes; `docs/`: documentação; `.agents/skills/`: fluxo específico para o assistente.

Para publicar no GitHub, inclua código, assets locais, exemplos de ambiente e `package-lock.json`. `.env`, uploads, `node_modules`, `.next`, dumps e `scratch` são locais e ficam fora do Git. Confira `git diff --check` e `git status --short` depois das verificações.

A configuração Vercel está incluída, mas publicar exige banco e variáveis no provedor. Uploads locais em serverless são temporários; armazenamento persistente de arquivos precisa ser configurado antes de usar esse modo com dados reais. O funcionamento local segue o fluxo acima.
