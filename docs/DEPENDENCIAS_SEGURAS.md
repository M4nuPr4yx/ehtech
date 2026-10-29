# Revisão de dependências — 29/10/2026

A revisão corrige os alertas encontrados após a entrega de desempenho. Antes da atualização, `npm audit --omit=dev` registrou 17 vulnerabilidades (3 moderadas, 12 altas e 2 críticas); a árvore completa tinha 25 (1 baixa, 4 moderadas, 16 altas e 4 críticas). Após as correções, as duas auditorias registraram **zero** em todas as categorias. O resultado é uma fotografia dos avisos conhecidos pelo registro npm nessa data, não uma garantia de ausência de falhas nem um pentest.

## Versões e compatibilidade

| Dependência | Antes | Depois |
| --- | --- | --- |
| Next / eslint-config-next | 16.1.7 | 16.4.3 |
| React / React DOM | 19.2.3 | 19.2.9 |
| Nodemailer | 9.0.5 | 10.3.1 |
| Multer | 2.2.0 | 2.5.0 |
| concurrently | 9.2.4 | 9.2.5 |
| qs usado pelo Express | 6.15.4 | 6.17.1 |
| zod fixado por @vercel/cli-config | 4.1.11 | 4.6.7 |

O lockfile também atualiza dependências transitivas, incluindo body-parser, proxy-addr, sharp, shell-quote e undici. Não foi usado `npm audit fix --force`. O SDK `@vercel/blob` permanece na versão 2.8.2. Dois overrides, limitados aos respectivos pais Express e @vercel/cli-config, selecionam versões corrigidas de qs e zod na mesma versão principal. Revise esses overrides quando os pais incorporarem as correções.

Nodemailer 10 exige Node >=20; o projeto usa Node 24 e preserva CommonJS no backend. Um teste com transporte local verifica destinatário e composição do link de recuperação. O teste de Blob exercita o SDK verdadeiro com rede externa bloqueada e respostas interceptadas, sem credenciais reais ou arquivos gravados no provedor.

## Navegação e status HTTP

A regressão de status encontrada na suíte de navegador foi corrigida: a fronteira global `src/app/loading.js` iniciava streaming antes de `notFound()`, devolvendo HTTP 200 para um anúncio pendente. A remoção dessa fronteira devolve HTTP 404 para anúncios pendentes/reprovados. A autorização da API não foi relaxada.

`PendingLink` mantém o feedback na navegação principal, início e catálogo de produtos: uma barra superior acompanha o estado real de transição do Next e anuncia “Carregando página…” a leitores de tela. Não bloqueia cliques nem apresenta porcentagem artificial. Com movimento reduzido, a barra fica estática. Os indicadores específicos das áreas continuam disponíveis.

## Verificações executadas

| Verificação | Resultado |
| --- | --- |
| Auditoria completa e somente produção | 0 vulnerabilidades em ambas |
| `npm run check` final | 112 testes aprovados; 1 integração ignorada na suíte rápida; build aprovado |
| Lint do check | 0 erros e 39 avisos: 23 recomendações novas sobre efeitos, 15 imagens e 1 memoização |
| Integração com PostgreSQL descartável | 33 resultados aprovados; 135 operações de API; 846 requisições HTTP |
| Produção local em desktop e celular, com Google simulado | 22 aprovados; 2 casos sem configuração Google ignorados por incompatibilidade com esse ambiente |
| Rodada complementar sem configuração Google | 2 aprovados em desktop/celular; cobre os casos incompatíveis com o ambiente anterior |
| SDKs de e-mail e armazenamento, rodada isolada | 5 aprovados |
| Instalação limpa com `npm ci` | Aprovada; 505 pacotes instalados e 0 vulnerabilidades |
| `setup` executado duas vezes nessa instalação | Ambiente gerado com chave exclusiva; segunda execução preservou o arquivo existente |
| Instalação limpa: bootstrap, e-mail e armazenamento | 7 testes aprovados; Next 16.4.3 e binding bcrypt carregados |
| Manifesto/lockfile preparado para publicação | `npm ci --dry-run --ignore-scripts --audit=false` aprovado, 504 pacotes previstos |

O preset atualizado passou a detectar recomendações de efeitos em telas existentes. Essas 23 recomendações ficam visíveis como avisos apenas nos arquivos React de `src/`; as demais regras permanecem ativas. A declaração de estado da administração foi movida antes do efeito que usa seu setter, mantendo o comportamento. Refatorar todos os efeitos fica fora desta correção de dependências.

O CI recebeu `npm audit --audit-level=low`, que reprova a execução quando o registro reportar vulnerabilidades em produção ou desenvolvimento. A presença da etapa no arquivo não comprova que ela já executou no GitHub.

## Falhas encontradas e resolvidas

- O primeiro check revelou incompatibilidade de configuração do novo preset. O override foi limitado aos arquivos React para evitar aplicar uma regra de plugin a arquivos CommonJS.
- O teste novo de e-mail inicialmente procurava texto literal no MIME codificado. A verificação passou a decodificar quoted-printable antes de verificar o conteúdo; não era uma falha de envio da biblioteca.
- A primeira suíte completa de navegador teve 20 aprovações, 2 falhas de status 404 e 2 casos incompatíveis ignorados. Um ajuste experimental de metadados não resolveu e foi removido. Após corrigir a fronteira de carregamento, 6 verificações direcionadas e a rodada completa final passaram.

Os logs das rodadas e auditorias ficam localmente em `scratch/dependencies/`, fora do Git. Rodadas posteriores substituem o relatório e as capturas automáticas do Playwright; os logs identificam cada execução. A instalação limpa não copiou `.env`, uploads ou node_modules do projeto. A adição local preexistente de Analytics foi preservada e ficou fora desta entrega; o manifesto sem ela foi validado separadamente.

## Compatibilidade verificada após publicação

O commit `e46be41` foi publicado com status Ready/Production na Vercel, implantação `12sgNis7xpKffLKqaFuaWx7U42X5`, em 29/10/2026 às 13:25:16 BRT (build de 39 segundos). A primeira verificação pública aprovou início, produtos, serviços, catálogos e saúde da API, mas encontrou HTTP 500 para um anúncio inexistente. A API pública devolvia corretamente 404 JSON; a mesma URL na origem imutável do deploy devolvia 302 para autenticação Vercel. Ao seguir esse redirecionamento, o SSR recebia HTML com status 200 e recusava a resposta como inválida.

O helper central `src/lib/api.js` passou a selecionar `VERCEL_PROJECT_PRODUCTION_URL` somente quando `VERCEL_ENV=production`, com fallback para `VERCEL_URL`. Previews conservam sua própria origem, e API externa/BACKEND_URL mantêm prioridade. Nenhuma proteção da Vercel foi desativada, nenhum segredo de bypass foi criado e nenhuma variável privada foi lida ou alterada. O teste de compatibilidade cobre produção, preview, variável ausente, backend externo e navegador. As duas jornadas afetadas de detalhe/SEO/navegação foram repetidas em desktop/celular e passaram.

A repetição do check em ambiente restrito encontrou EPERM ao iniciar subprocessos; trata-se de limitação da execução, não regressão do site. A execução autorizada foi aprovada: 114 testes, 113 aprovações e uma integração ignorada na suíte rápida, lint sem erros (39 avisos) e build concluído. O registro está em `check-ssr-final.log`. A primeira leitura pública permanece em `production-first.json`; a verificação final é registrada separadamente para não esconder a falha encontrada.

Referências da hospedagem: [variáveis de sistema](https://vercel.com/docs/environment-variables/system-environment-variables) e [proteção de deploys](https://vercel.com/docs/deployment-protection).

## Limites

MySQL real, entrega real de SMTP, armazenamento real Blob e autenticação na conta real do Google não foram exercitados nesta revisão. A integração usa PostgreSQL temporário; Google, e-mail e armazenamento usam provedores locais ou interceptação. Não foram criados pedidos/contas no banco de produção para testar. Não há novo serviço pago, gateway, mudança de schema, segredo ou configuração exigida do usuário.

Referências: [aviso de segurança do Next](https://nextjs.org/blog/nextjs-security-update-october-14-2026), [correção do React](https://github.com/react/react/security/advisories/GHSA-xqc2-xf4c-x3h3), [Nodemailer](https://github.com/nodemailer/nodemailer/blob/master/CHANGELOG.md), [status de not-found com streaming](https://nextjs.org/docs/app/api-reference/file-conventions/not-found), [useLinkStatus](https://nextjs.org/docs/app/api-reference/functions/use-link-status).
