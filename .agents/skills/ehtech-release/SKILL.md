---
name: ehtech-release
description: Preparar ou revisar a EHtech para GitHub, instalação após clone ou publicação. Use para checkup de entrega e configuração, não para edições isoladas de interface.
---

Confirme o estado com `git status --short` se ainda não foi consultado. Preserve alterações existentes; leia o diff das regiões que editar.

Confira o fluxo do README: Node em `.nvmrc`, `npm ci`, `npm run setup`, banco, `db:init` e `dev`. O setup deve preservar `.env` existente e gerar segredo exclusivo em instalações novas. Teste instalação limpa quando dependências, ambiente ou bootstrap mudarem; não copie `.env`, uploads ou node_modules do autor.

Execute `npm run check` para entrega transversal. Se banco/API/instalação mudar, execute também `npm run test:integration`; os parâmetros e permissões estão em `docs/DESENVOLVIMENTO.md`, seção Testes de integração. Use banco temporário, nunca seed ou migrações no banco real apenas para validar uma entrega. Reutilize resultados já válidos; repita só o afetado por mudanças posteriores.

Confira lockfile, assets referenciados, `git diff --check` e arquivos novos. Exclua segredos, dados reais, uploads e artefatos locais do conjunto para publicação; não os apague. `npm audit --omit=dev` verifica dependências de produção quando há acesso ao registro.

Informe resultados e limitações reais. Não confunda configuração de CI com execução no GitHub, nem testes do adaptador com integração PostgreSQL. Commit, push e deploy seguem o escopo autorizado pelo usuário.
