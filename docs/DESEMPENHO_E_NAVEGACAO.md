# Desempenho e navegação — 29/10/2026

## Diagnóstico de produção

Medições HTTP sequenciais de https://ehtech-gc18.vercel.app, sem autenticação,
três amostras por rota, antes desta entrega (base `9c5c5f4`). O tempo até o primeiro
byte (TTFB) inclui rede e infraestrutura; não mede renderização nem Core Web Vitals.
Primeira amostra não significa necessariamente um cold start controlado.

| Consulta | TTFB das três amostras (ms) | Observação |
| --- | --- | --- |
| Início | 187 / 94 / 21 | HTML estático |
| Produtos | 316 / 22 / 26 | HTML estático; dados consultados depois |
| Serviços | 483 / 23 / 23 | HTML estático; dados consultados depois |
| Como funciona | 334 / 32 / 20 | HTML estático |
| `/api/produtos/catalogo?limit=8&page=1` | 3867 / 334 / 595 | Sem anúncios na amostra; não representa catálogo grande |
| `/api/servicos?limit=9&page=1` | 1340 / 183 / 239 | Redirecionamento adicional |
| `/api/_backend/servicos?limit=9&page=1` | 405 / 41 / 57 | Mesmos dados, sem redirecionamento |
| `/api/componentes/catalogo/status` | 158 / 27 / 19 | Independente de banco |

Os arquivos brutos e o roteiro da amostragem ficam em `scratch/performance/`
(ignorados pelo Git). As medidas após publicação são registradas diretamente no
documento de testes, versão 2.1. Não extrapolar percentuais dessas amostras para
todo o site, celulares reais, concorrência ou banco após longos períodos ociosos.

## Mudanças implementadas

- Serviços no mesmo domínio usam o destino Express diretamente, sem a ida ao
  handler Next que retorna 307. Backend externo e fluxo Google preservados.
- Catálogos de produtos e serviços anônimos: navegador revalida; CDN Vercel guarda
  por 15 segundos e pode servir a resposta anterior durante mais 30 segundos
  enquanto revalida. Authorization e Cookie recebem `no-store`. Apenas vitrines
  de anúncios aprovados usam essa política; detalhes e dados privados não receberam
  cache. Compra/contratação conferem o estado atual no servidor. Alterações podem
  demorar essa janela para aparecer na vitrine pública.
- Serviços executam contagem e leitura da página em paralelo, preservando o
  retorno da última página válida quando a página solicitada excede o total.
- Cabeçalho consulta perfil na montagem/troca de sessão, em vez de toda navegação.
  Leituras simultâneas equivalentes podem compartilhar a conexão; a resposta
  não é guardada após a conclusão. Contas, escritas e requisições canceláveis
  permanecem separadas. Foto atualizada é refletida por evento local.
- Na página do perfil, voltar a Produtos/Histórico em até 30 segundos reutiliza
  o estado da página. Atualizar força consulta; ao sair da página o estado é
  descartado. Falhas temporárias permitem tentar novamente, sem remover o token;
  expiração e autorização continuam tratadas pelo fluxo existente.
- Catálogo de peças não espera disponibilidade de IA. A checagem básica pode
  ser utilizada enquanto essa consulta está pendente.
- Vitrine permite repetir apenas a consulta e preserva o texto da busca.
  Consultas de páginas abandonadas são canceladas.
- Menu principal concentra Início, Produtos, Serviços e Como funciona.
  Ferramentas agrupa os caminhos avançados com descrições, teclado e Escape.
  Meus serviços e moderação de serviços passam a aparecer na navegação contextual.
- Início apresenta três caminhos com linguagem simples e serviços anunciados
  por usuários em diversas categorias. Informa que o pagamento é externo.
- Indicador CSS leve e textual durante navegação, catálogos, perfil/listas,
  pedidos, conversas e gestão de serviços. Respeita movimento reduzido e
  leitores de tela, sem porcentagem falsa ou atraso artificial. Temas preservados.

## Verificação executada

- `npm run check`: lint sem erros, 110 testes aprovados, um teste de integração
  pulado nessa execução, build de produção concluído. Permanecem 15 avisos
  existentes sobre imagens. Repetido após ajuste final do cabeçalho.
- Testes direcionados do cliente, URL, cache e Swagger: 14 aprovados.
- `node tests/run-postgres-local.cjs`: 33 resultados aprovados, 846 requisições
  HTTP e todas as 135 operações documentadas exercitadas. Banco descartável,
  sem alteração da base real. Inclui cache público/privado e página fora do limite.
- E2E com build de produção e PostgreSQL descartável: 16 aprovações em desktop
  e celular para navegação, carregamento/redução de movimento, IA lenta, perfil
  indisponível, login Google simulado, jornada de compra e gestão de serviços.
  Complemento final: quatro aprovações para perfil/abas/atualização manual e
  nova tentativa da vitrine preservando a busca (duas revisitam o cenário do perfil).
- Teclado, foco e axe-core em quatro temas fazem parte da jornada existente
  executada. Não representam certificação integral de acessibilidade ou segurança.
- `npm audit --omit=dev --audit-level=high`: 17 alertas na árvore instalada
  (3 moderados, 12 altos e 2 críticos). Esta entrega não altera dependências.
  Há correções que exigem rever versões fixadas do framework; não aplicar
  `npm audit fix --force` sem avaliar compatibilidade e repetir a validação.
  Os alertas permanecem pendentes, inclusive os críticos.

Integração MySQL não executada nesta entrega. Não foram realizados teste de carga,
Core Web Vitals de usuários reais, cobrança ou chamadas reais a provedores de IA.
E-mails e Google são interceptados nas fixtures dos testes de navegador.

## Documentação vinculada

- [Documento de testes, versão 2.1](https://sesisenaispedu-my.sharepoint.com/:w:/g/personal/emanuel_silva4_portalsesisp_org_br/IQBkk7VCCxB6S6uGZ2P-DF3FAXd_EBs-4wCFvS91PJ68WG0?rtime=XeTr17o130g).
- [ERS, revisão 1.1](https://sesisenaispedu-my.sharepoint.com/:w:/g/personal/emanuel_silva4_portalsesisp_org_br/IQDY-Z3bcue6TpogbqxR0i0CAb6n5HYvtQrNDpcu7PP5ZV4?e=kHKttO): RF005, RF008, RF017 e RNF004–006.
