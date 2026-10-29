# Catálogo de demonstração — 29/10/2026

Lote autorizado para o site público: **10 perfis fictícios, 20 produtos e 10 serviços**. Todos os títulos têm `[DEMO]`, e as descrições avisam que não há oferta comercial, pagamento, contato telefônico ou envio real. O objetivo é apresentar conteúdo plausível e verificar catálogo, paginação e compra em ambiente de teste.

## Conteúdo

São dez modelos de referência, anunciados duas vezes por vendedores/localidades diferentes: iPhone 13, Galaxy A54 5G, MacBook Air M1, ThinkPad T480, Nintendo Switch, PS4 Slim, Xbox Series S, Raspberry Pi 4 Model B, Logitech M185 e GeForce GTX 1080 Ti. As especificações básicas têm referência do fabricante em cada descrição. Preço, estoque, conservação, acessórios e disponibilidade são **simulados**; não são cotações atuais nem laudos de equipamentos existentes.

Os serviços abrangem programação, design, aulas, audiovisual, fotografia, redação, marketing, montagem de computadores e redes. Cada anúncio inclui modalidade, região, preço ilustrativo, prazo, entregáveis, critérios de aceite e revisões. Os prestadores são os usuários fictícios, preservando a natureza de marketplace. A interface atual de serviços usa os ícones das categorias; não foi criado um campo novo de fotografia para serviços.

As localidades de referência são São Paulo/SP, Rio de Janeiro/RJ, Belo Horizonte/MG, Curitiba/PR, Porto Alegre/RS, Brasília/DF, Salvador/BA, Recife/PE, Fortaleza/CE e Manaus/AM. Cidade, UF e bairro servem como contexto geográfico aproximado. Rua, destinatário e telefone são dados inventados, marcados como impróprios para entrega ou contato. As contas usam `example.test`; o script não envia e-mail e não utiliza caixas de pessoas reais.

As dez fotos correspondem aos modelos citados e foram conferidas visualmente. Miniaturas com largura de até 800 px foram obtidas do Wikimedia Commons sob as licenças indicadas. Créditos, licença e fonte estão nas descrições, em `scripts/fixtures/demo-images.json` e no arquivo público [CREDITS.txt](../public/demo/products/CREDITS.txt). Os arquivos são assets versionados do site; não dependem do diretório temporário de uploads da Vercel. Os anúncios usam URLs HTTPS do próprio domínio, compatíveis com a política atual de imagens.

## Inserção controlada em PostgreSQL

O seed antigo `seed:test-data` é exclusivo de MySQL local, utiliza ilustrações genéricas e redefine contas de demonstração. Ele não é executado nesta operação pública e permanece inalterado.

O novo gerador somente produz um bloco SQL para revisão administrativa; não abre conexão, lê ambientes privados, executa SQL ou inicializa o schema:

```powershell
node scripts/demo-catalog-postgres.cjs --public-demo-neondb --output scratch/demo-catalog/production.sql
```

O arquivo é privado/local, ignorado pelo Git, e não pode sobrescrever uma saída existente. A execução requer acesso administrativo já autorizado à integração Neon da EHtech na Vercel. Conferir primeiro o projeto, a base `neondb`, o schema e as contagens existentes. O gerador permite somente esse lote público de 20/10 ou bases temporárias com o prefixo de teste. Escalas maiores são recusadas para produção.

O SQL é um único `DO`, porque o editor da integração não aceita vários comandos preparados na mesma execução. O bloco é atômico, confere a base, usa lock transacional e interrompe o lote em conflito de identidade/proprietário ou contagens inesperadas. Não possui UPDATE, DELETE, criação de tabelas permanentes, migração ou promoção de papéis. Os perfis são somente `user`; senhas aleatórias são armazenadas como hashes scrypt e os valores originais são descartados, sem senha pública compartilhada. A reexecução não redefine contas, anúncios ou senhas existentes.

Os anúncios desse lote são aprovados como parte da operação administrativa explicitamente autorizada. O fluxo normal de publicação e moderação dos usuários permanece inalterado. Não são criadas avaliações, reputação, compras ou mensagens artificiais no banco público. A confirmação dos inserts e da publicação consta na versão correspondente do documento de testes online.

## Compra e carga em base isolada

```powershell
node tests/run-postgres-local.cjs --demo
```

O runner reutiliza os binários locais oficiais de PostgreSQL, inicia cluster em loopback/porta livre, cria base descartável e remove somente os recursos temporários criados por ele. Não ocupa 3000/3001. Não envia e-mail, chama Google, grava no Blob, solicita IA ou acessa o banco público.

Na rodada final, 11 cenários foram aprovados: integridade e imagens da massa, escapes SQL, limite público, origem dos produtos, idempotência, conflito de identidade, login, consulta, restrições de compra, checkout/recebimento e solicitação de serviço. Um pedido entre contas distintas foi registrado, teve proposta de retirada aceita e foi concluído por código. O servidor conservou o preço de R$ 2.190,00 mesmo com total/pagamento adulterados no pedido. O pagamento permaneceu `nao_iniciado`. Foram rejeitadas auto-compra, quantidade acima do estoque, pedido sem endereço e auto-contratação; a repetição do registro não duplicou o pedido.

Antes do acordo de entrega, o total final é nulo e o subtotal é conhecido: frete pendente não significa frete grátis. Após retirada com frete zero ser combinada, o total foi definido. Isso demonstra o funcionamento do fluxo, sem comprovar entrega física ou pagamento externo.

A massa ampliada contém **1.000 produtos e 500 serviços**, ainda com os dez perfis fictícios. Foram feitas 180 leituras paginadas: 20 na referência pequena e 40 para cada concorrência 1, 5, 10 e 20 na massa maior. Cada grupo divide as chamadas entre produtos e serviços. Os limites da API permaneceram ativos. A rodada final registrou, com concorrência 20, p95 de 25,75 ms para produtos e 26,26 ms para serviços. Foram 204 respostas HTTP no roteiro completo (197 retornos 200, 3 retornos 201 e 4 recusas esperadas 400/409); nenhuma 500 ou 429. Todos os percentis estão em `scratch/demo-catalog/isolated-results.json`.

São amostras curtas de API local, com banco e cliente na mesma máquina, sem frontend, CDN, rede móvel ou ociosidade da hospedagem. Não demonstram capacidade máxima, Core Web Vitals nem p95 de usuários reais da Vercel. Medições públicas usam somente poucas leituras, com TTFB, tamanho e cache registrados antes/depois, sem carga intensa.

## Verificações e limites

`npm run check` foi aprovado: lint sem erros, 39 avisos conhecidos, 113 testes rápidos aprovados e uma integração ignorada na suíte rápida, além do build. A integração específica acima executa o SQL real e a API em PostgreSQL descartável. MySQL real não foi exercitado para o novo gerador, que é explicitamente PostgreSQL.

Dois primeiros roteiros isolados falharam por expectativas do teste: quantidade 999 é inválida pelo limite do contrato (400), e total final sem acordo de frete é nulo. O roteiro foi corrigido para quantidade 99 acima do estoque (409), campo `modalidades` e distinção entre subtotal/total. Não foi alterada a aplicação para adaptar seu comportamento ao teste. Os logs anteriores foram preservados em `scratch/demo-catalog/`.

O resultado do lote público deve ser conferido pelos IDs/nomes de demonstração e comparado às contagens anteriores. Os registros de usuários, anúncios e serviços anteriores são preservados. Nenhum serviço pago ou gateway foi adicionado. A alteração local preexistente de Analytics fica fora desta entrega.
