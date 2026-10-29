# Recursos visuais da interface

A página inicial usa uma composição com texto e anúncio real lado a lado, categorias em linhas e serviços com uma hierarquia própria. A referência de composição é a coleção pública de [hero sections do Flowbite](https://flowbite.com/blocks/marketing/hero/). O layout e os componentes foram escritos para o EHtech; não há dependência de Flowbite nem uso de blocos Pro.

As animações `fadeIn` e `fadeInUp` foram obtidas do [Animate.css 3.7.2](https://github.com/animate-css/animate.css/tree/3.7.2), versão distribuída sob MIT. A licença está em `public/licenses/animate-css-3.7.2.txt`. Os dois arquivos locais ficam em `src/styles/vendor`; o deslocamento de `fadeInUp` foi reduzido para 18px. Essa licença se refere especificamente à versão usada, não às versões atuais do projeto.

`MotionEnhancements.js` ativa as entradas quando a seção fica visível, inclusive para anúncios carregados depois da página. Cada elemento anima uma vez, com duração de 520ms e atraso máximo de 240ms. O conteúdo permanece visível sem JavaScript ou suporte a IntersectionObserver. A preferência `prefers-reduced-motion` desativa as entradas e os movimentos das fotografias. Navegação por teclado e conteúdo não dependem das animações.

A fonte variável [Manrope](https://github.com/google/fonts/tree/main/ofl/manrope) foi obtida do repositório Google Fonts e é servida localmente com `next/font/local` e `font-display: swap`. A licença OFL está em `public/licenses/manrope-ofl.txt`. Não há requisições a CDN para fontes ou animações, nem bibliotecas adicionais no JavaScript.

Os recursos foram obtidos em 6 de outubro de 2026. Claro, Escuro, Oceano e Aurora continuam usando as cores semânticas compartilhadas. A imagem e o preço do destaque vêm do catálogo existente; não há anúncios ou métricas fictícios adicionados pela interface.

Em 29 de outubro de 2026, o fundo passou a usar a imagem de circuitos verdes fornecida pelo usuário, preservada em `public/backgrounds/green-circuit.webp` (25.168 bytes). As camadas de deslocamento, brilho e pontos animam somente transformações/opacidade via CSS, sem vídeo ou temporizadores de JavaScript. Movimento reduzido desativa a animação; a intensidade acompanha o tema. A origem da imagem fornecida está registrada em `public/backgrounds/CREDITS.txt`, sem atribuir licença aberta a ela.

As fotos padrão de perfil incluem seis paisagens: lago original, céu/lago, pôr do sol, bosque, outono e cachoeira. São fotos CC0 obtidas do Wikimedia Commons e servidas localmente em WebP de 384 × 384, com atribuição e fontes em `public/profile/CREDITS.txt`. A escolha é estável por ID da conta e preserva fotos personalizadas. O conjunto não representa a identidade ou a localização dos usuários.
