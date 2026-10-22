# Interface e temas

No cabeçalho, abra **Tema** e escolha **Claro**, **Escuro**, **Oceano** ou **Aurora**. A opção **Automático** acompanha o modo claro/escuro do dispositivo. A escolha fica salva neste navegador e vale para todas as telas; não depende da conta nem de uma API.

A navegação principal destaca a página atual. Nas telas da conta, uma segunda linha oferece acesso ao perfil, equipamentos, contratações, mensagens, carrinho e anúncios. Em telas pequenas, essas linhas permitem rolagem horizontal.

A página inicial reúne busca, destaque de um anúncio real, categorias, novos anúncios, serviços e acesso ao verificador de peças. Os anúncios têm seções de informações e fotos. Formulários de entrada e segurança usam rótulos visíveis; a janela de autenticação também aceita Escape e mantém o foco no diálogo. As referências, animações e licenças estão em [RECURSOS_VISUAIS.md](RECURSOS_VISUAIS.md).

As cores compartilhadas ficam em `src/app/globals.css`: fundo, superfícies, texto, bordas, destaque e estados de sucesso, atenção e erro. Novos componentes devem usar essas variáveis ou as classes Tailwind correspondentes (`bg-surface`, `text-foreground`, `text-muted`, `border-line`, `bg-accent-fill` e `text-accent-contrast`). Fotografias e seus controles podem manter cores próprias para preservar o contraste sobre a imagem.

A aplicação inicial do tema fica em `src/lib/theme.js`; o seletor, em `src/app/complements/ThemeSwitcher.js`. Somente os identificadores previstos são aceitos. Se o navegador bloquear o armazenamento, a escolha continua funcionando durante a sessão.

Elementos interativos têm contorno de foco visível. Movimento reduzido desativa
transições e reduz animações, inclusive na troca de tema. A janela de autenticação
fica em `AuthDialog.js`; entrada administrativa em `AdminLogin.js` e segurança de
perfil em `ProfileSecurity.js`, mantendo os handlers e permissões nas páginas.

Anunciar salva rascunho de texto no sessionStorage, separado por conta e restrito à
aba. Ao recarregar, restaura nome, descrição, preço, estoque e categoria. Não guarda
fotos, senhas ou endereço de origem; a origem exige nova revisão. Limpar texto do
rascunho e publicação bem-sucedida removem o rascunho. Se o navegador bloquear o
armazenamento, o formulário continua funcionando sem persistência.
