# Checkup para apresentação do TCC — 10/11/2026

Versão acadêmica revisada localmente, sobre o commit `99e928d`, incluindo as alterações preexistentes de checkout/pedidos e de manifesto/lockfile. Corrigido um deadlock real do contador de tentativas de login no MySQL; limites de segurança preservados. Roteiro da banca em [APRESENTACAO_TCC.md](APRESENTACAO_TCC.md). Este resultado não declara operação comercial pronta nem implantação desta árvore na hospedagem.

## Resultado da revisão atual

| Verificação | Resultado em 10/11/2026 |
| --- | --- |
| `npm run check` após correção | Aprovado: 121 testes rápidos, uma integração intencionalmente ignorada e build de produção concluído |
| Lint do check | Sem erros; 39 avisos existentes, principalmente efeitos React e imagens |
| `npm run test:integration` final | 33 resultados aprovados em MySQL/MariaDB real descartável |
| `npm run test:integration:postgres:local -- scratch/postgresql-core/pgsql/bin` final | 33 resultados aprovados em PostgreSQL real descartável |
| Cada integração final | 135 operações documentadas e 883 requisições HTTP verificadas |
| Navegador, rodada geral com Google simulado | 22 aprovados, dois ignorados por exigirem Google desativado e duas falhas de seletor do teste corrigidas na rodada complementar |
| Navegador, rodada complementar final sem Google | Quatro aprovados: compra completa e Google desativado, em desktop/celular |
| Cenários distintos de navegador aprovados | 26, somando resultados válidos das duas rodadas; não foi uma única rodada integral sem falhas |
| Contrato OpenAPI e regressões de reserva, após sincronizar documentação | Sete testes aprovados |
| Lint direcionado dos arquivos de autenticação e testes alterados | Aprovado, sem erros ou avisos |
| `npm audit --json` | Zero vulnerabilidades conhecidas na árvore completa de produção e desenvolvimento |
| Links locais e manifesto/lockfile | 57 links em 25 documentos sem destino ausente; dependências e engines sincronizados |
| `git diff --check` | Sem erros de whitespace |

Os runners usaram bases, clusters e uploads temporários e portas livres; não iniciaram outras instâncias em 3000/3001. As verificações não aplicaram seed/migração ao banco real. SMTP, Google e IA externos não foram acionados. O Google dos testes é um provedor simulado com chaves efêmeras; a API, o banco e o frontend das jornadas permanecem reais.

## Correções e cobertura de regressão

- **Login simultâneo:** a primeira integração MySQL falhou com `ER_LOCK_DEADLOCK` no contador persistente. A transação desfeita agora tem repetição limitada a cinco transações, com espera crescente, somente para deadlock/conflito de serialização. Falha persistente retorna 503 sem autenticar. Recusa por limite e erro de conexão não são repetidos. Testes isolados e integrações nos dois bancos passaram após a correção. Sem alteração de schema, dependência ou política de senha.
- **Confirmação perdida de compra:** a jornada faz o servidor registrar um pedido real na base temporária e devolve 503 ao navegador. A interface consulta a mesma sessão, recupera o pedido, mantém confirmação após recarregar e a lista contém um único pedido. Sem repetir a escrita automaticamente.
- **Pedido desatualizado:** a jornada simula falha de leitura após uma proposta. A tela informa o erro, preserva o conteúdo anterior e bloqueia novas ações até uma atualização válida. Depois conclui aceite, retirada, código, avaliação e moderação.
- **Teste de navegador:** a primeira asserção de alerta também encontrava o anunciador vazio do Next. O seletor passou a exigir a mensagem esperada. As duas jornadas foram repetidas e aprovadas; não se alterou o comportamento da aplicação para contornar o teste.
- **Documentação:** README corrigido quanto à ausência de seed automático de serviços; guias de entrega, checkout, segurança, diferenciais, mensagens, desempenho e rede revisados. Resultados históricos abaixo foram preservados.

As primeiras execuções restritas de `check` e PostgreSQL foram bloqueadas com `spawn EPERM`. Foram repetidas com permissão de subprocessos e passaram. Essa ocorrência é de infraestrutura; o deadlock MySQL foi uma falha da aplicação efetivamente corrigida.

A ERS oficial recebeu a revisão **1.8** e o documento oficial de testes recebeu a versão **2.8**, diretamente no Word online, com os históricos anteriores preservados. A revisão consolida requisitos existentes, acrescenta RF031–038 para comportamentos já implementados e registra os resultados, falhas iniciais e cenários não executados. Links nos [materiais da apresentação](APRESENTACAO_TCC.md).

## Evidências locais

Logs ignorados pelo Git, em `scratch/`: `tcc-check.log`, `tcc-check-authorized.log`, `tcc-check-final.log`, `tcc-mysql.log`, `tcc-mysql-final.log`, `tcc-postgres.log`, `tcc-postgres-authorized.log`, `tcc-postgres-final.log`, `tcc-e2e.log`, `tcc-e2e-final.log`, `tcc-contract-final.log`, `tcc-lint-final.log` e `tcc-audit.json`. A rodada complementar substitui o relatório Playwright e as capturas automáticas; o log geral preserva o resultado dos outros cenários. O script `tcc-doc-links.cjs` confere referências locais e manifesto/lockfile. As capturas `tcc-ers-revisao-1-8.jpg` e `tcc-testes-versao-2-8.jpg` registram as atualizações oficiais.

## Limites e preparação da banca

Windows, Node 24.21.0 e npm 11.19.0. A suíte aprova o escopo exercitado; não equivale a pentest, certificação de acessibilidade, capacidade de produção ou homologação em aparelhos físicos/Safari/Firefox. Permanecem 39 avisos de lint. Não foram repetidos instalação limpa, Compose, carga ou restauração de backup nesta revisão; instalação/bootstrap têm testes rápidos existentes. A alteração local de Analytics foi preservada sem ativar telemetria ou mudar dependências nesta revisão.

Google real, entrega SMTP, armazenamento Blob e IA reais dependem da configuração/rede do ambiente da banca e não foram homologados nesta sessão. O núcleo pode ser demonstrado com login comum e regras básicas sem IA. Não há gateway, reserva/baixa de estoque, rastreamento integrado, cofre de digitais, disputa bilateral ou reembolso automático.

Na revisão local inicial descrita acima, não houve commit, push ou deploy. A continuação autorizada para a Vercel está registrada a seguir. Antes de apresentar, ensaie o roteiro com contas fictícias e confira a saúde da API no ambiente escolhido. A cópia local `EHtech_ERS_v2_2026-10-20.docx` é histórica; a referência vigente é a ERS oficial vinculada no roteiro.

## Continuação para entrega na Vercel — 10/11/2026

Destino conferido no painel autenticado: projeto `ehtech`, domínio `ehtech-gc18.vercel.app`, repositório `M4nuPr4yx/ehtech` e branch de produção `master`. Antes do envio, GitHub e Vercel estavam em `99e928d`. Node 24.x, preset Next.js, raiz do repositório e comandos automáticos de instalação/build conferidos. Plano Hobby e recursos existentes preservados; nenhum upgrade ou integração paga adicionado.

As funcionalidades marcadas como implementadas em `docs/` receberam conferência adicional. Os itens de backlog continuam futuros. Passaporte, consulta pública e revogação após transferência, exportação JSON, combos e missões passaram em desktop/celular. A jornada de serviço foi ampliada para orçamento, aceite, início, conclusão, garantia, avaliação e inspeção pelo prestador com laudo no anúncio. A API e os bancos são reais nas fixtures descartáveis; não foram criadas negociações no banco público.

Correções desta continuação: retirada de regiões `main` aninhadas em contratações e passaporte público; mensagens de sucesso de passaportes/contratações usam cores de sucesso e contraste adequado. A conferência visual encontrou texto quase invisível sobre o fundo de alerta do passaporte. O teste adicional verifica contraste dessas mensagens nos quatro temas com movimento reduzido. Roadmap e guias de origem/IA foram ajustados para distinguir referências históricas, recursos atuais e teto de 25 segundos da IA dentro dos 60 segundos da função.

Verificações adicionais:

- Instalação limpa: `npm ci --no-audit --no-fund` instalou 505 pacotes em cópia isolada sem ambientes privados, uploads ou dependências do autor. `setup` criou ambiente exclusivo e a segunda execução o preservou. Testes rápidos dessa instalação: 121 aprovados e uma integração ignorada; `npm run check` nessa cópia também aprovou lint/testes/build. A dependência de Analytics já presente no workspace foi mantida sem ativar telemetria.
- Leituras públicas anteriores ao envio: 27 aprovadas, incluindo páginas, detalhes, sitemap, saúde, catálogos, configuração e bloqueio anônimo de cinco áreas privadas. Relatório `scratch/tcc-production-before.json`. Essas leituras não comprovam compra ou autenticação real na produção.
- Jornadas adicionais: `tests/e2e/documented-features.spec.cjs`, executadas em PostgreSQL descartável com build de produção, desktop e celular. As primeiras quatro falharam por seletores de teste e expectativa indevida de 404 no HTML de uma página cliente; a API já retornava 404 para o link revogado. O teste passou a verificar a API e a ausência da ficha na interface. A rodada seguinte aprovou as quatro jornadas; o contraste e a jornada completa de contratação foram acrescentados em seguida e têm registro próprio.
- Resultado final após contraste e contratação pela interface: quatro jornadas aprovadas em 26,8 segundos, incluindo quatro temas em cada tamanho de tela, além do build do runner. O `npm run check` final na origem aprovou 121 testes rápidos, uma integração ignorada, lint sem erros (39 avisos) e build de produção. Somando as jornadas distintas da primeira revisão e estas quatro, são 30 cenários de navegador exercitados; esse total reúne rodadas diferentes.
- Integrações MySQL/PostgreSQL e auditoria npm da revisão anterior foram reutilizadas: a continuação não altera SQL, schema, autorização, bibliotecas instaladas ou limites. O único ajuste no módulo de IA é um comentário que documenta o tempo já configurado.

Evidências locais: `scratch/tcc-clean-install.log`, `tcc-clean-setup.log`, `tcc-clean-setup-preserve.log`, `tcc-clean-tests.log`, `tcc-clean-check.log`, `tcc-docs-e2e.log`, `tcc-docs-e2e-final.log`, `tcc-docs-e2e-contrast.log` e `tcc-release-check.log`. A nova rodada substitui as capturas e o relatório Playwright; os logs anteriores preservam os resultados históricos. O registro oficial complementar de requisitos/testes e da implantação utiliza as revisões 1.9/2.9 dos documentos vinculados no roteiro. O hash publicado e o estado Ready devem ser conferidos nesse registro e no painel Vercel.

Nos logs públicos examinados, não apareceram exceções da aplicação ou respostas 500 nas consultas realizadas. Permanecem avisos de depreciação de dependências sobre `url.parse()` e a interpretação futura de modos SSL pelo driver PostgreSQL; não foram ocultados nem contornados desativando TLS. Isso é diferente de uma falha de execução. Não houve alteração de credenciais, proteção de deploy, banco, plano ou retenção para remover recomendações cosméticas do painel.

---

## Histórico da revisão de 22/10/2026

Preparação do código atual concluída. As alterações de funcionalidades já presentes no workspace foram preservadas. Esta revisão atualizou o README, este relatório e o guia de envio ao GitHub; não criou commits, alterou remotos, fez push ou publicou a aplicação.

## Verificações executadas

| Verificação | Resultado |
| --- | --- |
| Lint (`npm run check`) | Nenhum erro; 15 avisos preexistentes de uso de `<img>` |
| Testes rápidos (`npm run check`) | 90 aprovados; integração intencionalmente pulada nesse comando |
| Build (`npm run build`) | Compilação de produção concluída |
| `npm run test:integration` | 29 testes aprovados em MySQL/MariaDB temporário |
| `npm run test:integration:postgres:local` | 29 testes aprovados em PostgreSQL real e descartável |
| `npm run test:e2e` | Execução final completa: 8 cenários aprovados em Chromium, desktop e celular |
| `npm audit --omit=dev --json` | Nenhuma vulnerabilidade de produção reportada nesta data |
| `git diff --check` | Sem erros de whitespace |

Cada integração de banco verificou 117 operações documentadas da API e 698 requisições HTTP. Os runners criaram bases e uploads temporários e os removeram ao terminar. Não foram aplicados seed ou migrações ao banco real para validar a entrega, nem abertas outras instâncias nas portas 3000/3001. E-mail e IA externos não foram acionados pelos testes.

A primeira execução de `check` aprovou lint e testes, mas os workers do build foram bloqueados com `spawn EPERM`. O build foi repetido com permissão para criar processos e passou. A mesma restrição exigiu repetir a instalação limpa e a inicialização do PostgreSQL.

Duas tentativas preliminares de navegador falharam em carregamento/navegação no servidor de desenvolvimento. Os rastros registraram recargas de Fast Refresh. Após terminar instalações e builds simultâneos, uma nova execução completa passou nos oito cenários em 2,3 minutos. Essas falhas preliminares não foram tratadas como aprovação; o resultado final é de uma nova execução integral, sem alteração dos testes ou do código da aplicação.

## Instalação sem arquivos do autor

Foi preparada uma cópia dos arquivos publicáveis em `scratch/release-clean-20261022`, sem `.git`, ambientes privados, uploads, builds ou dependências locais. Nessa cópia foram executados:

- `npm ci --no-audit --no-fund`: instalação pelo lockfile concluída.
- `npm run setup`: ambiente novo criado com segredo exclusivo.
- `npm test`: 90 testes aprovados, incluindo geração de segredo exclusivo e preservação de ambiente existente; integração pulada.
- `npm run build`: build de produção concluído com as dependências recém-instaladas.

O código e os assets dessa cópia foram comparados com a origem; somente a documentação de entrega mudou depois da cópia. Os testes também validam a documentação OpenAPI das rotas.

## Arquivos para envio

- `.gitignore` e `.vercelignore` conferidos: ambientes privados, uploads, dependências, dumps e artefatos locais ficam fora do envio atual. Os exemplos de ambiente e `package-lock.json` acompanham o código.
- Busca por padrões comuns de chaves e tokens nos textos publicáveis sem ocorrências. Nenhum arquivo publicável ultrapassa 50 MiB. Essas verificações não equivalem a uma auditoria completa de segurança ou de todos os objetos do Git.
- O histórico ainda contém **39 uploads antigos**. Não foram reescritos commits nem apagados arquivos locais. A exclusão atual pelo `.gitignore` não elimina esse histórico.
- O pacote local `scratch/ehtech-github-2026-10-22.zip` reúne o código atual, incluindo arquivos novos, sem `.git`, ambientes privados, uploads, dependências ou builds. Ele permite iniciar um repositório novo sem levar os commits antigos e é ignorado pelo Git.

Veja [PUBLICAR_GITHUB.md](PUBLICAR_GITHUB.md) para usar o pacote ou atualizar o repositório existente preservando seu histórico.

## Limites

Validação realizada no Windows com Node 24.21.0 e npm 11.19.0. O CI está configurado para instalação limpa, lint, testes, build, MySQL, PostgreSQL e Chromium; sua execução no GitHub/Linux ainda depende do envio. O Compose não foi executado nesta revisão. Não houve teste dos serviços externos de hospedagem, SMTP, armazenamento ou IA.
