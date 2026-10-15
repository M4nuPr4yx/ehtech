# Interface e temas

No cabeçalho, abra **Tema** e escolha **Claro**, **Escuro**, **Oceano** ou **Aurora**. A opção **Automático** acompanha o modo claro/escuro do dispositivo. A escolha fica salva neste navegador e vale para todas as telas; não depende da conta nem de uma API.

A navegação principal destaca a página atual. Nas telas da conta, uma segunda linha oferece acesso ao perfil, equipamentos, contratações, mensagens, carrinho e anúncios. Em telas pequenas, essas linhas permitem rolagem horizontal.

A página inicial reúne busca, destaque de um anúncio real, categorias, novos anúncios, serviços e acesso ao verificador de peças. Os anúncios têm seções de informações e fotos. Formulários de entrada e segurança usam rótulos visíveis; a janela de autenticação também aceita Escape e mantém o foco no diálogo. As referências, animações e licenças estão em [RECURSOS_VISUAIS.md](RECURSOS_VISUAIS.md).

As cores compartilhadas ficam em `src/app/globals.css`: fundo, superfícies, texto, bordas, destaque e estados de sucesso, atenção e erro. Novos componentes devem usar essas variáveis ou as classes Tailwind correspondentes (`bg-surface`, `text-foreground`, `text-muted`, `border-line`, `bg-accent-fill` e `text-accent-contrast`). Fotografias e seus controles podem manter cores próprias para preservar o contraste sobre a imagem.

A aplicação inicial do tema fica em `src/lib/theme.js`; o seletor, em `src/app/complements/ThemeSwitcher.js`. Somente os identificadores previstos são aceitos. Se o navegador bloquear o armazenamento, a escolha continua funcionando durante a sessão.
