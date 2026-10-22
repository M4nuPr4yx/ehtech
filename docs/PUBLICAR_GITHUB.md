# Enviar o projeto ao GitHub

O código atual usa `.gitignore` para excluir ambientes privados, uploads, dumps, dependências, builds e `scratch/`. Os exemplos `.env.example` e o lockfile devem acompanhar o código. `npm run setup` gera um segredo exclusivo após o clone e preserva uma configuração existente.

## Novo repositório sem o histórico antigo

Na revisão de 22/10/2026, o histórico local ainda continha 39 arquivos de upload antigos. Nenhum está no conjunto atual de arquivos versionados. Criar outra branch ou adicionar regras ao `.gitignore` não elimina esses objetos do histórico enviado.

Foi preparado localmente o pacote `scratch/ehtech-github-2026-10-22.zip`, com o código atual e sem `.git`, ambientes privados, uploads ou arquivos gerados. Ele é ignorado pelo Git. Extraia-o em uma pasta vazia fora deste projeto e execute, nessa pasta:

```sh
git init -b main
git add .
git diff --cached --stat
git commit -m "Prepara EHtech para GitHub"
```

Crie um repositório vazio no GitHub, sem README, licença ou `.gitignore` gerados pelo site. Substitua os campos abaixo pela URL desse repositório:

```sh
git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
git push -u origin main
```

O pacote é uma fotografia da revisão. Alterações posteriores no projeto precisam ser copiadas para a pasta nova antes de outro commit. Não copie a pasta `.git` antiga, `.env`, uploads ou dependências. O fluxo de instalação após clone continua no [README](../README.md#rodar-depois-do-clone).

## Atualizar o repositório existente

Esse fluxo preserva o histórico, incluindo os uploads antigos. Use-o apenas quando esse histórico puder continuar no repositório de destino. Na pasta original:

```sh
git status --short
git diff --check
git add .
git diff --cached --stat
git commit -m "Prepara EHtech para GitHub"
git push
```

O `push` exige remoto e branch de acompanhamento já configurados. Não use `--force` para essa preparação. A revisão não criou commits, alterou remotos nem enviou arquivos ao GitHub.

Resultados e limites dos testes: [CHECKUP.md](CHECKUP.md).
