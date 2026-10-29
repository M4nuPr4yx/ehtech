// Dados inventados para demonstração. Especificações dos modelos: fontes dos fabricantes.
const images = require('./demo-images.json')
const batch = 'ehdemo-20261029'
const notice = 'DEMONSTRAÇÃO EHtech: anúncio fictício para testar o marketplace. Não é uma oferta comercial; não efetue pagamento, contato telefônico ou envio para estes dados.'
const locations = [
  ['Ana Martins', 'São Paulo', 'SP', 'Sé', '01001000', '11'],
  ['Bruno Costa', 'Rio de Janeiro', 'RJ', 'Centro', '20040002', '21'],
  ['Carla Ribeiro', 'Belo Horizonte', 'MG', 'Centro', '30111000', '31'],
  ['Diego Almeida', 'Curitiba', 'PR', 'Centro', '80020000', '41'],
  ['Elisa Santos', 'Porto Alegre', 'RS', 'Centro Histórico', '90010000', '51'],
  ['Felipe Nunes', 'Brasília', 'DF', 'Asa Norte', '70040900', '61'],
  ['Gabriela Lima', 'Salvador', 'BA', 'Centro', '40020000', '71'],
  ['Henrique Souza', 'Recife', 'PE', 'Boa Vista', '50050000', '81'],
  ['Isabela Rocha', 'Fortaleza', 'CE', 'Centro', '60010000', '85'],
  ['João Ferreira', 'Manaus', 'AM', 'Centro', '69005000', '92'],
]
const users = locations.map(([name, cidade, uf, bairro, cep, ddd], index) => ({
  username: `demo_20261029_${String(index + 1).padStart(2, '0')}`,
  email: `ehtech.demo.20261029.${index + 1}@example.test`,
  nome: `Demonstração — ${name}`,
  address: { destinatario: `${name} Demonstração`, telefone: `${ddd}900000000`, identificacao: 'Demonstração: não realizar entregas', cep, uf, cidade, bairro,
    logradouro: 'Rua Fictícia de Demonstração EHtech', numero: '', sem_numero: true, complemento: 'Endereço inventado para testes',
    referencia: 'Somente a cidade e a UF são referências geográficas reais.', instrucoes: 'NÃO entregar ou telefonar: massa de demonstração acadêmica.', principal: true, salvar: true },
}))
const models = [
  { key: 'iphone13', name: 'Apple iPhone 13 128 GB', category: 'smartphones', price: 2190,
    specs: 'Modelo de referência de 2021, com chip A15 Bionic, armazenamento de 128 GB e tela OLED Super Retina XDR de 6,1 polegadas. O espaço disponível depende do sistema e dos aplicativos.',
    use: 'Uso sugerido: comunicação, fotografia cotidiana e aplicativos de estudo. No cenário simulado, acompanham cabo Lightning e capa simples; carregador de tomada não incluído. Bateria, desbloqueio e funcionamento são apenas condições fictícias, não laudos de uma unidade real.',
    source: 'https://support.apple.com/en-la/111872' },
  { key: 'galaxy-a54', name: 'Samsung Galaxy A54 5G 128 GB', category: 'smartphones', price: 1450,
    specs: 'Referência brasileira com Exynos 1380, 8 GB de RAM, 128 GB de armazenamento e tela Super AMOLED de 6,4 polegadas/120 Hz. A câmera principal de 50 MP possui estabilização óptica.',
    use: 'Indicado no exemplo para redes sociais, aulas e registro de fotos. Acessórios simulados: cabo USB-C e capa transparente. Não há conta Google vinculada ou dados pessoais no cenário. A imagem ilustra o modelo e não comprova o estado de uma unidade à venda.',
    source: 'https://news.samsung.com/br/samsung-galaxy-a54-5g-e-galaxy-a34-5g-experiencias-incriveis-para-todos' },
  { key: 'macbook-air-m1', name: 'Apple MacBook Air M1 8 GB SSD 256 GB', category: 'notebooks', price: 3890,
    specs: 'Modelo M1 de 2020, com tela Retina IPS de 13,3 polegadas e resolução nativa 2560 x 1600. Configuração simulada: 8 GB de memória unificada e SSD de 256 GB.',
    use: 'Cenário voltado a estudos, documentos e programação. Inclui, no exemplo, fonte USB-C e cabo de alimentação. O teclado mostrado na foto é ilustrativo; layout, ciclos da bateria e conservação não representam equipamento inspecionado. Não acompanha licenças de terceiros.',
    source: 'https://support.apple.com/en-ae/111883' },
  { key: 'thinkpad-t480', name: 'Lenovo ThinkPad T480 i5 8 GB SSD 256 GB', category: 'notebooks', price: 1690,
    specs: 'Referência ThinkPad T480 com Intel Core i5-8250U de quatro núcleos e oito threads. A família possui memória DDR4 e tela de 14 polegadas; este cenário utiliza 8 GB de RAM, SSD de 256 GB e painel Full HD.',
    use: 'Exemplo de notebook corporativo usado para navegador, escritório e desenvolvimento leve. Fonte compatível incluída apenas na simulação. Portas USB-C, HDMI e Ethernet fazem parte da referência técnica. Aparência, bateria e histórico de manutenção são fictícios.',
    source: 'https://psref.lenovo.com/syspool/Sys/PDF/ThinkPad/ThinkPad_T480/ThinkPad_T480_Spec.PDF' },
  { key: 'nintendo-switch', name: 'Nintendo Switch 32 GB com dock', category: 'games', price: 1490,
    specs: 'Nintendo Switch do modelo tradicional: tela LCD de 6,2 polegadas, resolução 1280 x 720 no modo portátil e armazenamento interno de 32 GB, parcialmente reservado ao sistema.',
    use: 'Conjunto simulado com console, dois Joy-Con, dock e cabos de referência. Permite representar os modos portátil e conectado à TV. Jogos, assinatura, contas de terceiros e saldo digital não estão incluídos. Não existe envio ou equipamento real anunciado.',
    source: 'https://www.nintendo.com/en-gb/games/oms/Nintendo-Switch-Digital-Brochure/62/' },
  { key: 'ps4-slim', name: 'Sony PlayStation 4 Slim 500 GB', category: 'games', price: 1190,
    specs: 'Referência PS4 da série CUH-2000, com armazenamento de 500 GB, memória GDDR5 de 8 GB, saída HDMI e conexão de rede Ethernet/Wi-Fi. Parte da capacidade é utilizada pelo sistema.',
    use: 'Pacote fictício com um controle DUALSHOCK 4, cabo de energia e HDMI. Disco de jogo, conta PSN, assinatura e biblioteca digital não acompanham o anúncio. Leitura de discos, ruído e conservação são condições de exemplo, não resultado de avaliação física.',
    source: 'https://www.playstation.com/en-gb/ps4/tech-specs/' },
  { key: 'xbox-series-s', name: 'Microsoft Xbox Series S 512 GB', category: 'games', price: 1790,
    specs: 'Referência do Xbox Series S de 2020 com SSD NVMe de 512 GB. Console exclusivamente digital, sem leitor de discos; o espaço útil é menor que a capacidade nominal.',
    use: 'Conjunto simulado com console branco, controle sem fio e cabos. Jogos, conta Microsoft e Game Pass não estão incluídos. O cenário testa um item de valor intermediário no carrinho; não há licença, assinatura ou produto real disponível para transferência.',
    source: 'https://news.xbox.com/en-us/wp-content/uploads/sites/2/2020/09/FACT-SHEET_Gen9-Hardware.pdf' },
  { key: 'raspberry-pi4', name: 'Raspberry Pi 4 Model B 2 GB', category: 'computadores', price: 349.9,
    specs: 'Placa Raspberry Pi 4 Model B na variante de 2 GB. A família oferece processador Broadcom BCM2711, rede Gigabit Ethernet, Wi-Fi de duas bandas, duas portas USB 3.0 e duas micro-HDMI.',
    use: 'Exemplo para laboratório de Linux, automação e aprendizado. A placa é o único item do pacote simulado: fonte USB-C adequada, cartão microSD, gabinete e cabos são separados. Nenhum serviço de instalação ou sistema com licença paga é incluído automaticamente.',
    source: 'https://www.raspberrypi.com/products/raspberry-pi-4-model-b/specifications/' },
  { key: 'logitech-m185', name: 'Mouse sem fio Logitech M185', category: 'acessorios', price: 59.9,
    specs: 'Mouse compacto sem fio com receptor USB e rolagem por linhas. A referência do fabricante contempla Windows, macOS, ChromeOS e Linux, com conexão pelo receptor compatível.',
    use: 'Cenário de acessório de baixo valor para testes de quantidade e total do carrinho. Inclui receptor e uma pilha apenas como composição fictícia do anúncio. Não é um mouse Bluetooth. Cliques, alcance e autonomia não foram medidos em uma unidade real.',
    source: 'https://www.logitech.com/en-us/shop/p/m185-wireless-mouse' },
  { key: 'gtx1080ti', name: 'NVIDIA GeForce GTX 1080 Ti Founders Edition 11 GB', category: 'computadores', price: 1290,
    specs: 'Referência GeForce GTX 1080 Ti Founders Edition com 11 GB de memória GDDR5X e arquitetura Pascal. A instalação exige placa-mãe, gabinete, alimentação e conexões compatíveis.',
    use: 'Exemplo de placa de vídeo usada para consulta técnica e comparação de anúncios. Não acompanha fonte ou adaptadores no pacote fictício. Histórico de mineração, temperaturas, revisão e vida útil não são conhecidos: não existe unidade comercial sendo certificada por este teste.',
    source: 'https://www.nvidia.com/en-us/geforce/news/nvidia-geforce-gtx-1080-ti/' },
]
const products = Array.from({ length: 20 }, (_, index) => {
  const model = models[index % models.length], seller = users[(index + Math.floor(index / models.length) * 3) % users.length]
  const image = images.find(item => item.key === model.key)
  const variant = index < 10 ? 'uso leve' : 'com marcas de uso'
  return { key: `${batch}-p${String(index + 1).padStart(2, '0')}`, seller: seller.username,
    nome: `[DEMO] ${model.name} — ${seller.address.cidade} (${index + 1})`,
    descricao: `${notice}\n\n${model.specs}\n\n${model.use}\n\nCondição fictícia: ${variant}; consulte os detalhes antes de qualquer teste. Localização aproximada: ${seller.address.bairro}, ${seller.address.cidade}/${seller.address.uf}, Brasil. Endereço de origem e telefone são inventados e não servem para entrega ou contato. Preço e estoque são exclusivamente simulados, sem cotação de mercado atual.\n\nFoto ilustrativa do modelo: ${image.author}. Licença ${image.license}. Fonte e licença: ${image.source} ${image.licenseUrl}. Miniatura fornecida pelo Wikimedia Commons. Referência técnica: ${model.source}`,
    preco: Math.round(model.price * (index < 10 ? 1 : 0.9) * 100) / 100, estoque: index % 4 + 2,
    categoria: model.category, imagem: [`https://ehtech-gc18.vercel.app${image.image}`], exige_entrega: true, source: model.source }
})
const serviceDefinitions = [
  ['Site institucional responsivo de até cinco páginas', 'programacao', 'remoto', 1200, 'Até 15 dias úteis', 'Planejamento das páginas, protótipo, implementação responsiva e revisão dos textos fornecidos pelo cliente. Inclui formulário de contato sem integração paga e orientação de publicação; domínio, hospedagem e redação extensa ficam fora do pacote.', 'Código-fonte, páginas Início/Sobre/Serviços/Contato e manual curto de edição.', 'Páginas navegáveis em celular e desktop, links funcionais e conteúdo revisado conforme briefing.', 2],
  ['Identidade visual básica para pequeno negócio', 'design', 'remoto', 650, 'Até 10 dias úteis', 'Criação de conceito visual a partir de briefing, com proposta de logotipo, paleta e tipografia. O exemplo prevê duas direções iniciais e ajustes na opção escolhida. Registro de marca e impressão gráfica não estão incluídos.', 'Logotipo em SVG/PNG, paleta de cores e guia de aplicação em PDF.', 'Arquivos abrem corretamente, versões clara/escura entregues e ajustes dentro do briefing.', 2],
  ['Aulas particulares de matemática para ensino médio', 'aulas', 'hibrido', 70, 'Sessão de 60 minutos', 'Aula individual para revisar álgebra, funções e exercícios escolhidos pelo aluno. A sessão começa com diagnóstico breve e termina com exercícios de prática. Não inclui realização de provas, trabalhos avaliativos ou promessa de nota.', 'Uma sessão de 60 minutos, resumo dos tópicos e lista curta de exercícios.', 'Sessão realizada no horário combinado e material de apoio entregue.', 1],
  ['Edição de vídeo curto para redes sociais', 'audiovisual', 'remoto', 180, 'Até 4 dias úteis', 'Edição de um vídeo vertical de até 60 segundos com até dez minutos de material enviado pelo cliente. Inclui cortes, legendas e ajustes básicos de áudio. Filmagem, animação complexa e música sem licença ficam fora do escopo.', 'Vídeo vertical em MP4, legendado, com uma versão final para publicação.', 'Duração e formato acordados, áudio inteligível e legendas conferidas.', 2],
  ['Fotografia de produtos para catálogo', 'fotografia', 'presencial', 350, 'Até 5 dias úteis após a sessão', 'Sessão de até duas horas para fotografar até cinco objetos pequenos. Inclui preparação de fundo simples e correção básica de cor. Transporte, modelos, locação e recortes complexos são negociados separadamente.', 'Quinze fotografias finais em JPEG, organizadas por produto.', 'Quantidade contratada, foco adequado e arquivos entregues no prazo.', 1],
  ['Revisão de currículo e perfil profissional', 'redacao', 'remoto', 120, 'Até 3 dias úteis', 'Revisão de clareza, organização e ortografia de currículo de até duas páginas, com sugestões para resumo profissional. As experiências precisam ser verdadeiras e fornecidas pelo cliente. Não inclui candidatura automática ou promessa de emprego.', 'Currículo revisado em arquivo editável/PDF e lista de recomendações.', 'Informações preservadas e texto revisado sem inventar qualificação ou experiência.', 1],
  ['Planejamento de conteúdo para redes sociais', 'marketing', 'remoto', 420, 'Até 7 dias úteis', 'Organização de calendário com oito ideias de publicação para pequeno negócio, considerando público e objetivo informados. Inclui temas, rascunhos de legendas e sugestões de formatos. Gestão diária, anúncios pagos e promessas de alcance não fazem parte do pacote.', 'Calendário de oito posts, rascunhos de legendas e orientação de frequência.', 'Oito propostas coerentes com o briefing e arquivos de planejamento entregues.', 2],
  ['Montagem de computador com peças do cliente', 'montagem', 'presencial', 250, 'Até 2 dias úteis após receber as peças', 'Conferência de compatibilidade, montagem, organização de cabos e teste inicial com componentes fornecidos pelo cliente. Peças com defeito ou incompatíveis interrompem o serviço até nova combinação. Sistema pago, peças e transporte não estão incluídos.', 'Computador montado, registro de testes básicos e checklist dos componentes.', 'Inicialização correta, conexões conferidas e entrega do checklist combinado.', 1],
  ['Configuração de Wi-Fi residencial', 'redes', 'hibrido', 180, 'Sessão de até 2 horas', 'Diagnóstico da disposição do roteador, revisão de configuração de segurança e separação de rede de visitantes quando suportada. Não inclui aquisição de roteador, garantia de velocidade da operadora ou instalação elétrica.', 'Configuração documentada, teste de conexão e orientações de uso.', 'Dispositivos de teste conectam e cliente recebe as orientações combinadas.', 1],
  ['Aulas de iniciação em planilhas', 'aulas', 'remoto', 90, 'Sessão de 90 minutos', 'Aula guiada para organizar uma tabela, aplicar filtros, fórmulas básicas e criar um gráfico simples com dados fictícios. Adaptada ao conhecimento inicial do aluno. Licença de software e consultoria financeira não estão incluídas.', 'Sessão de 90 minutos, planilha de exercícios e roteiro de revisão.', 'Exercícios acompanhados e material editável entregue ao aluno.', 1],
]
const services = serviceDefinitions.map(([title, categoria, modalidade, preco_base, prazo, scope, entregaveis, criterios_aceite, revisoes], index) => ({
  key: `${batch}-s${String(index + 1).padStart(2, '0')}`, seller: users[index].username,
  titulo: `[DEMO] ${title}`, descricao: `${notice}\n\n${scope}\n\nPrestador fictício da comunidade em ${users[index].address.cidade}/${users[index].address.uf}. A região é aproximada e não indica um estabelecimento real. Agenda, experiência, valores e prazos são apenas condições simuladas para testes; não há atendimento comercial neste anúncio.`,
  categoria, modalidade, preco_base, tipo_preco: 'fixo', prazo,
  regiao: modalidade === 'remoto' ? `Remoto — Brasil; referência ${users[index].address.cidade}/${users[index].address.uf}` : `${users[index].address.bairro}, ${users[index].address.cidade}/${users[index].address.uf} (demonstração)`,
  destaques: ['Anúncio de demonstração', 'Escopo e entregáveis definidos', 'Sem cobrança ou atendimento real'], entregaveis, criterios_aceite, revisoes,
}))
module.exports = { batch, notice, users, models, products, services }
