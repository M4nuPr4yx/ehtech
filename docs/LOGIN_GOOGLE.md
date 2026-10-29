# Login com Google

O botão **Logar com Google** aparece no login e no cadastro. Ao clicar, o navegador abre a página do Google para escolher uma conta e, depois da autorização, volta à EHtech com a sessão iniciada. O login por e-mail e senha continua disponível.

O botão permanece visível sem configuração: nesse caso, mostra uma mensagem de que o acesso ainda não foi ativado. Não cria contas fictícias nem tenta simular um login real.

## Configurar e ativar

1. Acesse o [Google Auth Platform](https://console.cloud.google.com/auth/overview) na sua conta, crie ou selecione um projeto e configure a marca/tela de consentimento, público e contatos solicitados pelo console. Para testes, siga as configurações de usuários de teste exibidas pelo Google.
2. Em **Clientes**, crie um cliente OAuth do tipo **Aplicativo da Web**.
3. Cadastre a origem JavaScript do site, sem caminho. No desenvolvimento padrão: `http://localhost:3001`. Na publicação: a origem HTTPS real da EHtech.
4. Em **URIs de redirecionamento autorizados**, cadastre o retorno exato:

   ```text
   http://localhost:3001/api/auth/google/callback
   ```

   Na publicação, substitua por `https://seu-dominio/api/auth/google/callback`. Porta, protocolo, domínio e caminho precisam corresponder à configuração. Prefira localhost a um IP da rede durante o desenvolvimento.

5. Configure estas variáveis **na API**:

   ```dotenv
   GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=seu-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback
   ```

   Localmente, use `backend/.env`; na hospedagem, o painel de variáveis da API. Reinicie a API após configurar. O Client ID é público. **Client Secret e API_SEGREDO ficam somente no servidor**; não use `NEXT_PUBLIC_*`, não versione esses valores nem os envie pelo chat.

6. Configure a página inicial real e `/politicas` nas informações públicas do aplicativo. Siga as exigências de domínio, marca e eventual verificação apresentadas pelo Google antes de publicar.
7. Faça um teste real: clique em **Logar com Google**, escolha a conta e confira o retorno. Teste saída/retorno, cancelamento e vínculo de uma conta já existente.

O fluxo anterior usava popup do SDK e somente Client ID. O redirecionamento agora utiliza **authorization code**, **Client Secret**, **PKCE S256**, `state`, `nonce` e retorno fixo. Não depende de um script Google carregado na tela de login. O Google decide quando pedir consentimento e senha da própria conta. `prompt=select_account` solicita a escolha da conta a cada início.

O código está pronto para configuração; não criamos um projeto externo nem alteramos seu `.env` privado. Não houve contratação de serviço pago, integração com gateway ou dependência nova instalada.

## Mesmo domínio e publicação

As chamadas `/auth/google/*` usam `src/lib/api.js` e o proxy `/api` do próprio site, inclusive quando `NEXT_PUBLIC_API_URL` aponta para outro endereço. Se o Express estiver separado, configure `BACKEND_URL` no servidor Next. Na Vercel, usa o encaminhamento já existente de `/api`.

O `GOOGLE_REDIRECT_URI` deve pertencer à mesma origem do site que iniciou o acesso, para o navegador devolver o cookie da tentativa. Produção exige HTTPS; HTTP é aceito apenas em loopback fora de produção. Não use a configuração de um domínio em outro domínio de preview sem ajustá-la.

A API precisa acessar `https://oauth2.googleapis.com/token` e os certificados públicos em `https://www.googleapis.com/oauth2/v3/certs`. Só são solicitados os escopos `openid email`; não há acesso ao Gmail, Drive ou contatos nem armazenamento de access/refresh tokens Google.

## Comportamento das contas

- **Conta Google nova na EHtech:** criação automática de conta normal, com username único no formato `usuario_...`. O usuário pode completar seu nome de exibição no perfil. Não há papel administrativo atribuído pelo Google. A regra atual de novos cadastros mantém Gmail, Hotmail e Outlook; outros domínios não foram liberados.
- **Conta já vinculada:** entra automaticamente e preserva anúncios, pedidos e avaliações. O identificador é o `sub` assinado pelo Google; mudança posterior do e-mail no Google não troca a conta local nem sobrescreve seu endereço.
- **E-mail já cadastrado, ainda sem vínculo:** a EHtech solicita a senha atual uma vez para confirmar o vínculo. Não une contas automaticamente por coincidência de e-mail. Nas próximas entradas, basta escolher a conta Google.
- **Perfil → Segurança → Acesso com Google:** permite iniciar o vínculo de uma conta Google com o mesmo e-mail e confirmar a senha da EHtech. O retorno abre novamente a aba Segurança.
- **Cadastro somente Google:** não há senha conhecida da EHtech. O banco guarda hash de valor aleatório e `senha_definida=false`. Use a recuperação por e-mail para definir uma senha; o SMTP precisa estar funcional. Redefinições e alterações de senha atualizam o indicador.
- **Desvincular:** exige senha definida e confirmação da senha atual, encerra as sessões da EHtech e remove só o vínculo local. Não apaga a conta ou os dados da EHtech nem revoga o consentimento na conta Google.
- Foto e nome do Google não são copiados automaticamente. A EHtech não recebe a senha Google.

Depois da autenticação, o destino é uma rota interna segura; o padrão é `/perfil`. Endereços externos e caminhos inválidos são substituídos pelo padrão. Cancelamento ou falha retornam a `/login/google` com mensagem e opção de tentar novamente.

## Proteções e migração

O cookie da tentativa é aleatório, HttpOnly, SameSite=Lax, Secure em produção e tem validade de dez minutos. O retorno exige esse cookie e o `state` correto; o state é consumido em transação antes da troca do código, impedindo repetição. PKCE liga a troca do código à tentativa original.

A API valida assinatura RS256 com chave pública Google, emissor, Client ID, expiração, emissão, `sub`, e-mail verificado e nonce. URLs de autorização e troca de código são fixas. Há prazo de oito segundos para a troca e cinco segundos para certificados, com cache limitado. O limitador existente de autenticação se aplica.

O verificador PKCE e o ID token pendente ficam criptografados com AES-256-GCM, chave derivada de `API_SEGREDO` e contexto da tentativa. Hashes de cookie/nonce/state, validade e destino ficam no banco. O ID token nunca é devolvido ao frontend nesse fluxo. Sucesso remove os dados temporários; tentativas expiradas são limpas ao iniciar outra tentativa. Cinco senhas incorretas encerram o desafio. Falhas persistem após a transação.

O código OAuth de curta duração passa pela URL do callback, como exige o protocolo. **Não registre a query string desse endpoint nos logs do proxy/hospedagem.** O callback devolve imediatamente um redirecionamento para a página fixa, sem código, JWT ou ID token na URL final e com Referrer-Policy=no-referrer. O Client Secret nunca aparece na URL. Somente o JWT normal da EHtech é armazenado no navegador, conforme a autenticação existente.

Migração aditiva/idempotente: `usuarios.senha_definida`, `usuario_identidades`, `google_auth_desafios` e `google_oauth_fluxos`. As duas últimas tabelas se vinculam por chave estrangeira com exclusão em cascata. Contas anteriores conservam dados, senha e papel. Nenhuma base real foi inicializada para validar a mudança.

## API e verificação

Fluxo atual:

- `POST /auth/google/redirecionar`: inicia, retorna a URL Google e define cookie; a ação `vincular` exige Bearer.
- `GET /auth/google/callback`: recebe o retorno, valida e troca código; responde 303 para `/login/google`.
- `GET /auth/google/retorno`: consulta ação e destino da tentativa pelo cookie, sem devolver credenciais.
- `POST /auth/google/concluir`: inicia a sessão automaticamente ou solicita senha para vínculo; vínculo de perfil exige o Bearer da mesma conta.
- `GET /auth/google/conta` e `DELETE /auth/google/vinculo`: consulta e gestão no perfil.

As rotas anteriores `/config`, `/desafio`, `/entrar` e `/vincular` continuam disponíveis e documentadas para compatibilidade. O frontend agora utiliza o redirecionamento.

```powershell
npm run check
node tests/run-postgres-local.cjs
node tests/run-postgres-local.cjs --e2e --production --google --grep "Google:"
node tests/run-postgres-local.cjs --e2e --production --grep "Google sem configuração|jornada real|teclado, foco"
```

Nos testes, a página Google e a troca de códigos são simuladas com chaves RSA efêmeras. Navegação para outra origem, retorno por callback, cookie, PKCE, state, assinatura, nonce, frontend, API e banco são exercitados. Não há bypass ou chave de teste no código de produção. Artefatos ficam em `scratch/`, ignorado pelo Git. A validação do consentimento Google real continua pendente até configurar as credenciais e o domínio.

Resultados locais de 22/10/2026 para a versão com redirecionamento:

- `npm run check`: aprovado; lint sem erros (15 avisos preexistentes de imagens), 98 testes aprovados, uma integração ignorada na suíte rápida e build de produção concluído.
- PostgreSQL descartável: 31 resultados aprovados, 135 operações da API e 830 requisições HTTP. Inclui state incorreto, uso único, cancelamento, PKCE, callback, criação automática, bloqueio de destino externo e vínculo restrito à conta autenticada.
- Duas jornadas Google aprovadas em desktop/celular, com provedor simulado e retorno entre origens reais no navegador.
- Seis jornadas de regressão aprovadas em desktop/celular: botão visível sem configuração, login comum/jornada de compra e teclado/foco com axe nos contextos exercitados.
- MySQL foi tentado com os parâmetros públicos de desenvolvimento, mas `127.0.0.1:3307` retornou `ECONNREFUSED`; não pôde ser validado. Nenhum serviço ou base real foi alterado.

A suíte Playwright completa e o consentimento Google real não foram executados. A ativação externa segue pendente das credenciais do projeto do usuário.

Referências: [OpenID Connect do Google](https://developers.google.com/identity/openid-connect/openid-connect), [fluxo de servidor](https://developers.google.com/identity/protocols/oauth2/web-server) e [validação de ID tokens](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).
