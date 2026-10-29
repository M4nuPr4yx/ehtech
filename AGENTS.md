# EHtech — instruções do projeto

Marketplace acadêmico em pt-BR. Next/React em `src/`, Express CommonJS em `backend/`, MySQL local e adaptador PostgreSQL. Preserve execução gratuita e regras explicáveis; serviços pagos exigem solicitação.

## Contexto mínimo

- Consulte `git status --short` antes de editar, uma vez por tarefa. Preserve mudanças existentes e examine o diff da região antes de alterá-la.
- Use `rg -n "termo" caminho` ou `rg --files caminho`. Ignore `.next`, `node_modules`, `backend/node_modules`, `backend/uploads`, `scratch`, `coverage`, `out` e `build`, salvo necessidade da tarefa.
- Em `backend/index.js` e `backend/docs/openapi.json`, pesquise a rota e leia só o trecho relevante.
- Instalação/comandos: `README.md`. Mapa por área e convenções: `docs/DESENVOLVIMENTO.md`, apenas a seção necessária. Leia roadmap, temas e IA somente para tarefas desses assuntos.
- Não reinstale dependências sem mudança que justifique isso. Reutilize resultados suficientes; resuma logs.

## Invariantes

- Frontend: URLs via `src/lib/api.js`, interface pt-BR, política de imagens em `src/app/complements/` e temas existentes.
- Banco: placeholders `?`, interface `[rows, fields]` de `backend/db.js`; considerar MySQL/PostgreSQL e migrações idempotentes em `backend/database/`. O SQL histórico não contém sozinho o schema atual.
- Rotas alteradas exigem sincronizar chamadas, testes e OpenAPI. Preserve aprovação de anúncios, propriedade e papéis, transições de serviços, validação, JWT, rate limits e limites de upload.
- Nunca exponha segredos nem dados pessoais. Não leia `.env` sem necessidade explícita; use exemplos. Não versione ambientes privados, dumps, uploads ou artefatos gerados. Não altere banco real, firewall ou serviços externos como efeito colateral de validação.
- Não descarte alterações nem sobrescreva assets/dados do usuário.

## Documentação de requisitos

A partir de 29/10/2026, toda funcionalidade nova ou modificação do projeto deve ser refletida diretamente na [ERS do projeto](https://sesisenaispedu-my.sharepoint.com/:w:/g/personal/emanuel_silva4_portalsesisp_org_br/IQDY-Z3bcue6TpogbqxR0i0CAb6n5HYvtQrNDpcu7PP5ZV4?e=kHKttO). Consulte a organização existente antes de editar e preserve estrutura, formatação, identificadores dos requisitos, numeração e histórico por versão. Atualize os requisitos afetados e acrescente os novos na seção correspondente, descrevendo o comportamento efetivamente implementado, as regras e os critérios de aceitação aplicáveis. Não apresente funcionalidades planejadas como concluídas nem sobrescreva conteúdo não relacionado. Se o acesso estiver indisponível, informe a pendência e não afirme que a ERS foi atualizada.

## Verificação

Teste isolado para mudança pequena; `npm run check` para mudança transversal. Integração de banco: `npm run test:integration`, com base temporária e parâmetros em `docs/DESENVOLVIMENTO.md`. Não inicie segunda instância nas portas 3000/3001. Diferencie falha de infraestrutura de regressão.

A partir de 29/10/2026, registre todos os testes executados diretamente no [documento de testes do projeto](https://sesisenaispedu-my.sharepoint.com/:w:/g/personal/emanuel_silva4_portalsesisp_org_br/IQBkk7VCCxB6S6uGZ2P-DF3FAXd_EBs-4wCFvS91PJ68WG0?rtime=XeTr17o130g). Preserve a estrutura, a formatação e o histórico existentes; siga a organização por versão já utilizada. Inclua data, versão/commit, cenário, resultado esperado, resultado observado e situação real (aprovado, falhou ou não executado), sem segredos ou dados pessoais. Se o acesso ao documento estiver indisponível, informe a pendência e não afirme que ele foi atualizado.

Em preparo para GitHub, clone ou publicação, use a skill `.agents/skills/ehtech-release/SKILL.md`. Finalize com resultado, verificações executadas e limitações; não afirme publicação ou teste sem executá-lo.
