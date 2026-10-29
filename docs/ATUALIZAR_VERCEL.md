# Atualizar o projeto existente na Vercel

As atualizações de serviços da comunidade, políticas, código de retirada e login Google usam o projeto Vercel já existente. Não é necessário criar outro projeto, banco ou armazenamento. O `vercel.json` mantém a API em `api/index.js` e o frontend Next na mesma origem.

Destino informado pelo usuário: `https://ehtech-gc18.vercel.app`. Em 22/10/2026, o cliente OAuth Google existente recebeu e confirmou a origem `https://ehtech-gc18.vercel.app` e o retorno `https://ehtech-gc18.vercel.app/api/auth/google/callback`. Nenhum Client Secret foi copiado para os arquivos. A publicação ainda depende de autenticação no painel da conta Vercel proprietária do projeto e da configuração das variáveis de Production.

## Código e ambiente existentes

1. Confirme em Settings → Git qual repositório e qual branch de produção estão ligados ao projeto.
2. Envie o conjunto de alterações locais para esse repositório/branch, incluindo arquivos novos do backend, frontend, migrações e testes. Um redeploy do commit antigo não inclui arquivos que continuam só na máquina.
3. Preserve `DATABASE_URL`, `API_SEGREDO` e `BLOB_READ_WRITE_TOKEN` já usados pelo projeto. Não troque o segredo da EHtech nem recrie o banco apenas para habilitar o Google.
4. Confira que `SITE_URL` e `FRONTEND_URL` usam a URL pública estável do projeto e que o runtime é Node 24.x. Deixe `NEXT_PUBLIC_API_URL` vazio para usar a API no mesmo domínio.

## Google no projeto existente

No cliente OAuth **Aplicativo da Web** do Google Auth Platform, configure:

- Origem JavaScript: `https://seu-dominio`.
- URI de redirecionamento: `https://seu-dominio/api/auth/google/callback`.

Na Vercel, abra o projeto existente → Settings → Environment Variables e adicione em Production:

| Nome | Valor |
| --- | --- |
| `GOOGLE_CLIENT_ID` | Client ID terminado em `.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Client Secret privado, salvo apenas no painel |
| `GOOGLE_REDIRECT_URI` | `https://seu-dominio/api/auth/google/callback` |

Um valor iniciado por `GOCSPX-` é um Client Secret OAuth; ele não substitui o Client ID. Se um segredo foi compartilhado em chat ou publicado, substitua-o no Google Auth Platform e atualize a Vercel com o novo valor. Não inclua segredos no código, no Git ou em `NEXT_PUBLIC_*`.

Depois de configurar, publique o código novo ou faça Redeploy do deployment que contém as atualizações. Alterações de variáveis não atualizam deployments anteriores automaticamente. Use Preview com ambiente e banco de teste próprios, se houver; não copie inadvertidamente uma configuração de domínio para outro.

## Migrações e validação

O primeiro acesso à API aplica as migrações aditivas necessárias e registra a versão concluída em `ehtech_schema_versoes`. Novas instâncias consultam esse registro e evitam repetir todo o DDL. A função dispõe de até 60 segundos para a primeira aplicação, incluindo a comunicação com o banco remoto; instâncias concorrentes coordenam a aplicação pela concessão temporária da versão. Contas e contratações são preservadas. Exemplos antigos de serviços que ainda correspondem exatamente ao catálogo original são pausados conforme a migração documentada. Isso não transfere dados de um banco local para o banco da Vercel.

Depois da atualização, confira `/api/health`, `/politicas`, `/servicos`, `/meus-servicos`, o login comum, o fluxo Google e as fotos. Verifique o retorno do Google usando a URL estável configurada. Não execute seed, inicialização manual ou testes de integração na base de produção para validar a entrega.

## Estado da preparação local

Em 22/10/2026, as verificações da versão com redirecionamento aprovaram lint/testes/build, 31 resultados de integração PostgreSQL e oito jornadas de navegador. Google foi simulado nos testes; a autenticação real exige configurar o cliente no provedor. MySQL local estava indisponível.

A revisão do conjunto alterado não encontrou padrões de segredo Google ou chave privada. `npm audit --omit=dev` retornou zero vulnerabilidades. Nenhuma credencial recebida no chat foi copiada para os arquivos.

Em 29/10/2026, o commit `1b1dd16` foi publicado em Production com status Ready e o endpoint de configuração Google respondeu habilitado. A entrada real revelou `FUNCTION_INVOCATION_TIMEOUT`: os logs mostraram o limite de 30 segundos no callback e no catálogo, antes da conclusão da inicialização do banco. A inicialização versionada evita refazer todas as migrações em cada instância; o limite de 60 segundos acomoda a primeira aplicação e o retorno OAuth. A correção passou em `npm run check` (100 testes aprovados, uma integração ignorada na suíte rápida e build concluído) e em PostgreSQL descartável (32 resultados aprovados, incluindo concorrência e recuperação da inicialização). Esses testes não substituem a entrada real na conta Google depois da publicação.

Veja também [LOGIN_GOOGLE.md](LOGIN_GOOGLE.md) e [SERVICOS_DA_COMUNIDADE.md](SERVICOS_DA_COMUNIDADE.md).
