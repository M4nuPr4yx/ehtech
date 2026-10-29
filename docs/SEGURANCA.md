# Segurança sem alterar a navegação

Reforço de 29/10/2026. As telas, o login Google e os fluxos de compra continuam iguais. Não há novo serviço pago, dependência instalada, CAPTCHA ou obrigação de autenticação em duas etapas.

## Contas e tentativas de acesso

Novas senhas, trocas e redefinições usam scrypt do Node, com sal aleatório de 16 bytes e parâmetros N=32768, r=8, p=3 (cerca de 32 MiB por derivação). A comparação usa tempo constante. A senha inteira é considerada, inclusive depois dos 72 bytes que o bcrypt considera. Senhas existentes em bcrypt continuam válidas; o formato muda quando o usuário escolhe uma senha nova. O mínimo continua em oito caracteres e há limite de 1024 bytes UTF-8 para evitar entradas excessivas. Não há exigência nova de símbolos ou trocas periódicas.

Além dos limites em memória existentes, `/login` e `/admin/login` compartilham contadores no banco: dez falhas por conta/rede e cem por rede em janela fixa de 15 minutos. IPv6 é agrupado por sub-rede. Reservas transacionais impedem que requisições simultâneas ultrapassem o limite. Acesso correto devolve sua própria reserva, sem apagar falhas anteriores. O contador não guarda e-mail ou IP legível: usa HMAC com o segredo do servidor. Registros sem uso há mais de um dia são removidos durante a manutenção das janelas. A resposta 429 informa `Retry-After`; um erro no banco impede a autenticação em vez de liberar tentativas sem controle. O Google continua disponível.

JWTs continuam com algoritmo HS256 explícito, validade e versão de sessão verificadas no banco. Cabeçalhos de token excessivos são recusados. Troca/redefinição de senha e desvínculo Google continuam revogando sessões anteriores.

## Recuperação, dados privados e navegador

Links de recuperação não são registrados em logs, inclusive em desenvolvimento sem SMTP. Configure SMTP para receber o e-mail; em produção o envio exige TLS. O link é aleatório, expira em uma hora e é consumido atomicamente. A verificação aceita somente o formato esperado, não devolve o e-mail da conta e compartilha o limitador da recuperação.

Respostas autenticadas e de autenticação/recuperação usam `Cache-Control: no-store` e `Referrer-Policy: no-referrer`. As páginas de retorno Google e recuperação têm política de referência e de indexação restrita. O frontend oculta a identificação do framework, publica HSTS em produção e bloqueia objetos incorporados, bases externas, enquadramento por outros sites e envio de formulários para outra origem. Essas diretivas não mudam scripts, imagens, temas, acessibilidade ou a navegação Google existente.

A conexão com MySQL/PostgreSQL verifica certificados TLS por padrão. `DB_SSL=false` continua disponível explicitamente para bases locais de desenvolvimento/teste. URLs de conexão com parâmetros SSL próprios podem substituir opções do driver; não use `sslmode=no-verify` ou outros modos que desativem a verificação na hospedagem. Certificados privados precisam de uma cadeia confiável configurada no ambiente; não resolva erros desativando a validação.

## Operação e limites da revisão

A migração é aditiva, cria somente `auth_tentativas` e seu índice e incrementa `SCHEMA_VERSION`. Não remove contas, anúncios ou pedidos. Use testes em base descartável, nunca dados de produção. Preserve os segredos no painel da hospedagem, permissões de colaboradores e backups do banco. Logs da infraestrutura não devem registrar cabeçalhos Authorization, corpos de senha nem queries com código OAuth/token de recuperação.

Esta é uma revisão com correções e testes, não uma garantia de ausência de vulnerabilidades ou um pentest externo. A política CSP é parcial: não bloqueia todos os scripts inline do Next. Os JWTs continuam no armazenamento atual do navegador; uma futura migração para cookies HttpOnly exige revisão de CSRF e de todas as chamadas autenticadas. Os limites em memória de outras rotas continuam locais a cada instância. Imagens externas e a proteção contra conteúdo malicioso também dependem da política de imagens e das validações já existentes.

Validação executada em 29/10/2026: `npm run check` aprovado, com 107 testes rápidos aprovados, uma integração ignorada na suíte rápida, 15 avisos preexistentes de imagens e build concluído. PostgreSQL descartável: 33 resultados aprovados, 135 operações e 841 requisições HTTP. Seis jornadas de produção local em desktop/celular aprovaram login Google simulado, cadastro/login comum, compra, moderação e acessibilidade. Auditoria de dependências de produção: zero vulnerabilidades. O MySQL real e os limites contra ataques na infraestrutura pública não foram exercitados nesta entrega; o adaptador MySQL foi coberto por testes isolados. Nenhuma conta ou pedido de produção foi criado para testar.

Referências: [autenticação OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html), [armazenamento de senhas OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [Express em produção](https://expressjs.com/en/advanced/best-practice-security/), [TLS do PostgreSQL](https://node-postgres.com/features/ssl).

## Revisão complementar de dependências

Na revisão posterior de 29/10/2026, a auditoria encontrou 17 alertas de produção (incluindo 2 críticos) e 25 na árvore completa. As versões corrigidas reduziram ambas as contagens a zero. O CI passa a verificar também dependências de desenvolvimento. Versões, overrides, testes de instalação limpa, regressões encontradas e limites estão em [DEPENDENCIAS_SEGURAS.md](DEPENDENCIAS_SEGURAS.md). Os resultados anteriores acima pertencem à respectiva rodada; não substituem uma auditoria atualizada.
