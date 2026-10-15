# Checkup para GitHub — 15/10/2026

Preparação local concluída, sem commit, push ou deploy. As alterações de funcionalidades já existentes no workspace foram preservadas.

## Instalação e execução verificadas

Foi montada uma cópia dos arquivos publicáveis, sem `.env` do autor, uploads, `.next` ou dependências locais. Nessa cópia:

- `npm ci --no-audit --no-fund`: instalação concluída a partir do lockfile.
- `npm run setup`: ambiente criado com chave exclusiva; teste adicional confirmou que uma configuração existente é preservada.
- `npm run check`: lint sem erros, 41 testes rápidos aprovados e build de produção concluído. A integração é intencionalmente pulada no comando de testes rápidos e foi executada separadamente.
- `db:init`: executado sobre banco MariaDB vazio e repetido para conferir idempotência.
- Aplicação compilada: API e Next iniciados em portas temporárias; saúde e documentação acessíveis pelo proxy.
- Cadastro, promoção de conta existente e login administrativo aprovados. Conta inexistente recusada pelo comando de promoção.
- Catálogo técnico, catálogo de produtos e serviços acessíveis; 19 páginas responderam com HTML em produção.
- `npm run test:integration`: 19 testes aprovados, 74 operações de API e 298 requisições HTTP verificadas, usando as dependências da cópia limpa.

Os bancos e servidores usados na revisão foram descartados/encerrados. O banco real do projeto não recebeu seed nem migrações para essa validação.

## Organização e instruções

- README com instalação, opções de banco, primeiro administrador, exemplos e diagnóstico.
- Scripts de setup, inicialização, promoção administrativa, execução conjunta e checkup.
- Compose de MySQL local com volume, porta 3307 limitada a loopback e healthcheck.
- GitHub Actions com instalação limpa, banco temporário, lint, testes, build e integração.
- Node declarado no manifesto e `.nvmrc`; lockfile sincronizado e validado por instalação limpa.
- Seed não depende mais de imagens externas ao clone; cópia das imagens faltantes e preservação de imagem existente verificadas com banco simulado. O seed completo não foi executado em banco real durante esta revisão.
- `AGENTS.md` reduzido de 12.355 para 2.448 bytes (aproximadamente 80%); detalhes sob demanda em `DESENVOLVIMENTO.md` e na skill `ehtech-release`. Skill aprovada pelo validador. Isso reduz o contexto inicial de instruções; não representa uma medição do consumo total de tokens.

## Git e dependências

- 39 uploads anteriormente versionados foram retirados do índice, mantendo os arquivos originais no computador. Essa retirada está preparada para o próximo commit; versões anteriores continuam no histórico.
- `scratch/` inteiro ignorado; ambientes privados, dumps e dependências fora do conjunto de publicação.
- Busca por padrões comuns de chaves e tokens nos arquivos publicáveis sem ocorrências. Essa busca não equivale a auditoria completa do histórico.
- `npm audit --omit=dev`: nenhuma vulnerabilidade reportada nas dependências de produção na data da revisão.
- `git diff --check`: sem erros de whitespace.

## Limites desta validação

O lint mantém 15 avisos preexistentes de uso de `<img>`, sem erros. A instalação limpa foi feita em Windows com Node 24; o workflow Linux será executado quando enviado ao GitHub. Docker não está instalado nesta máquina: o YAML do Compose e do workflow foi validado, mas o contêiner MySQL 8.4 não foi executado aqui. A execução real de banco foi validada com MariaDB local; PostgreSQL teve apenas os testes do adaptador.

E-mail requer SMTP configurado. A IA permanece opcional e desativada por padrão. Em hospedagem serverless, arquivos enviados precisam de armazenamento persistente próprio antes de uso com dados reais; o diretório temporário da função não oferece essa persistência.
