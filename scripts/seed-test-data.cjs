const fs = require('node:fs');
const path = require('node:path');
const bcrypt = require('bcrypt');
const pool = require('../backend/db');

const EXPECTED_DATABASE = 'ehtech';
const PASSWORD = 'aA123456';
const CONFIRMATION_FLAG = '--confirm-local';

const imageFiles = {
  notebooks: 'seed-product-notebook.png',
  smartphones: 'seed-product-smartphone.png',
  gpu: 'seed-product-gpu.png',
  accessories: 'seed-product-accessories.png',
};

const products = [
  {
    seller: 1,
    nome: 'Notebook Pro 14 para Trabalho e Estudos',
    descricao: 'Notebook de 14 polegadas com processador de oito núcleos, 16 GB de memória e SSD de 512 GB. Equipamento fictício para testes de catálogo, indicado para escritório, estudos e programação.',
    preco: 3899.90,
    estoque: 8,
    categoria: 'notebooks',
    image: 'notebooks',
  },
  {
    seller: 2,
    nome: 'Notebook Gamer 15 com 16 GB e SSD',
    descricao: 'Modelo gamer fictício com tela de 15,6 polegadas e alta taxa de atualização, 16 GB de RAM, SSD de 1 TB e refrigeração reforçada. Acompanha carregador compatível.',
    preco: 5799.00,
    estoque: 5,
    categoria: 'notebooks',
    image: 'notebooks',
  },
  {
    seller: 3,
    nome: 'Notebook Ultrafino 13 para Mobilidade',
    descricao: 'Notebook compacto e leve, com tela de 13 polegadas, 8 GB de memória e SSD de 256 GB. Produto fictício para simular anúncios voltados a mobilidade e uso acadêmico.',
    preco: 2999.90,
    estoque: 11,
    categoria: 'notebooks',
    image: 'notebooks',
  },
  {
    seller: 4,
    nome: 'Notebook Creator 16 Tela de Alta Resolução',
    descricao: 'Equipamento fictício para edição de imagens e vídeos, com tela ampla de alta resolução, 32 GB de RAM e SSD de 1 TB. Estrutura em alumínio e teclado retroiluminado.',
    preco: 7499.90,
    estoque: 3,
    categoria: 'notebooks',
    image: 'notebooks',
  },
  {
    seller: 5,
    nome: 'Notebook Essencial 15 com SSD 256 GB',
    descricao: 'Modelo de entrada para navegação, documentos e aulas on-line. Possui tela de 15,6 polegadas, 8 GB de memória e armazenamento SSD de 256 GB.',
    preco: 2299.00,
    estoque: 14,
    categoria: 'notebooks',
    image: 'notebooks',
  },
  {
    seller: 6,
    nome: 'Smartphone Vision 128 GB Tela OLED',
    descricao: 'Smartphone fictício com 128 GB de armazenamento, tela OLED de 6,5 polegadas, câmera dupla e bateria de longa duração. Compatível com redes móveis de alta velocidade.',
    preco: 1899.90,
    estoque: 17,
    categoria: 'smartphones',
    image: 'smartphones',
  },
  {
    seller: 7,
    nome: 'Smartphone Compact 256 GB',
    descricao: 'Aparelho compacto com 256 GB de armazenamento, 8 GB de memória, leitor biométrico e carregamento rápido. Produto fictício criado para testes de busca e filtros.',
    preco: 2399.00,
    estoque: 9,
    categoria: 'smartphones',
    image: 'smartphones',
  },
  {
    seller: 8,
    nome: 'Smartphone Max 5G com Câmera Tripla',
    descricao: 'Modelo fictício com conectividade 5G, conjunto de três câmeras, tela de 6,7 polegadas e bateria de 5.000 mAh. Inclui cabo USB-C e ferramenta para o chip.',
    preco: 2799.90,
    estoque: 7,
    categoria: 'smartphones',
    image: 'smartphones',
  },
  {
    seller: 9,
    nome: 'Smartphone Lite 64 GB Dual SIM',
    descricao: 'Celular fictício de entrada com 64 GB, suporte a dois chips, câmera principal de alta resolução e desbloqueio facial. Adequado para testes de produtos econômicos.',
    preco: 899.90,
    estoque: 25,
    categoria: 'smartphones',
    image: 'smartphones',
  },
  {
    seller: 10,
    nome: 'Smartphone Performance 512 GB',
    descricao: 'Aparelho fictício de alto desempenho com 512 GB de armazenamento, 12 GB de memória e tela de alta frequência. Inclui carregamento rápido e proteção contra respingos.',
    preco: 3599.00,
    estoque: 4,
    categoria: 'smartphones',
    image: 'smartphones',
  },
  {
    seller: 1,
    nome: 'Placa de Vídeo Pulse 8 GB',
    descricao: 'Placa de vídeo fictícia com 8 GB de memória, sistema de refrigeração com duas ventoinhas e suporte a monitores de alta resolução. Indicada para jogos e criação de conteúdo.',
    preco: 2199.90,
    estoque: 6,
    categoria: 'computadores',
    image: 'gpu',
  },
  {
    seller: 2,
    nome: 'Placa de Vídeo Vector 12 GB',
    descricao: 'Componente gráfico fictício com 12 GB de memória, dissipador reforçado e três saídas de vídeo. Produto de teste para configurações de desempenho intermediário.',
    preco: 3199.00,
    estoque: 4,
    categoria: 'computadores',
    image: 'gpu',
  },
  {
    seller: 3,
    nome: 'Placa de Vídeo Creator 16 GB',
    descricao: 'GPU fictícia com 16 GB de memória dedicada e arquitetura voltada a renderização, edição e aplicações gráficas. Requer fonte compatível e espaço para dois slots.',
    preco: 4899.90,
    estoque: 2,
    categoria: 'computadores',
    image: 'gpu',
  },
  {
    seller: 4,
    nome: 'Placa de Vídeo Compact 6 GB',
    descricao: 'Placa gráfica fictícia de formato compacto, com 6 GB de memória e baixo consumo. Recomendada para gabinetes menores e computadores de uso geral.',
    preco: 1499.90,
    estoque: 10,
    categoria: 'computadores',
    image: 'gpu',
  },
  {
    seller: 5,
    nome: 'Placa de Vídeo Gamer Dual Fan 10 GB',
    descricao: 'Modelo fictício com 10 GB, duas ventoinhas silenciosas e backplate metálico. Adequado para testar anúncios de peças gamer e filtros por categoria.',
    preco: 2699.00,
    estoque: 7,
    categoria: 'computadores',
    image: 'gpu',
  },
  {
    seller: 6,
    nome: 'Kit Gamer Teclado Mouse e Headset',
    descricao: 'Conjunto fictício com teclado mecânico, mouse ergonômico e headset circum-aural. Iluminação verde ajustável, conexão USB e construção resistente.',
    preco: 499.90,
    estoque: 18,
    categoria: 'acessorios',
    image: 'accessories',
  },
  {
    seller: 7,
    nome: 'Teclado Mecânico Compacto ABNT2',
    descricao: 'Teclado fictício de formato compacto com padrão ABNT2, switches táteis e iluminação ajustável. Cabo removível e estrutura metálica.',
    preco: 289.90,
    estoque: 22,
    categoria: 'acessorios',
    image: 'accessories',
  },
  {
    seller: 8,
    nome: 'Mouse Ergonômico 12000 DPI',
    descricao: 'Mouse fictício com sensor de até 12.000 DPI, seis botões configuráveis e pegada ergonômica. Conexão USB e iluminação discreta.',
    preco: 179.90,
    estoque: 30,
    categoria: 'acessorios',
    image: 'accessories',
  },
  {
    seller: 9,
    nome: 'Headset Estéreo com Microfone Removível',
    descricao: 'Headset fictício com almofadas macias, arco ajustável, microfone removível e controle de volume no cabo. Compatível com computadores e consoles.',
    preco: 249.90,
    estoque: 16,
    categoria: 'audio',
    image: 'accessories',
  },
  {
    seller: 10,
    nome: 'Combo Home Office Teclado Mouse e Headset',
    descricao: 'Kit fictício para trabalho e estudo composto por teclado, mouse e headset. Componentes confortáveis, visual discreto e instalação plug and play.',
    preco: 349.90,
    estoque: 13,
    categoria: 'acessorios',
    image: 'accessories',
  },
];

function assertSafeEnvironment(databaseName) {
  if (!process.argv.includes(CONFIRMATION_FLAG)) {
    throw new Error(`Confirme a base local com ${CONFIRMATION_FLAG}.`);
  }

  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    throw new Error('O seed de teste não pode ser executado em ambiente de produção.');
  }

  if (databaseName !== EXPECTED_DATABASE) {
    throw new Error(`Base recusada: esperado "${EXPECTED_DATABASE}", recebido "${databaseName || 'desconhecida'}".`);
  }
}

function assertImagesExist() {
  const { uploadsDir: uploadDirectory } = require('../backend/uploads');
  const fallback = path.join(__dirname, '..', 'public', 'ehtech-logo.png');
  for (const filename of Object.values(imageFiles)) {
    const imagePath = path.join(uploadDirectory, filename);
    if (!fs.existsSync(imagePath)) {
      fs.copyFileSync(fallback, imagePath, fs.constants.COPYFILE_EXCL);
    }
  }
}

async function buildUsers() {
  return Promise.all(Array.from({ length: 50 }, async (_, index) => {
    const number = index + 1;
    return {
      username: `usuario${number}`,
      email: `usuario${number}@gmail.com`,
      nome: `Usuário ${String(number).padStart(2, '0')}`,
      senha: await bcrypt.hash(PASSWORD, 10),
    };
  }));
}

async function seed() {
  assertSafeEnvironment(process.env.DB_DATABASE || process.env.DB_NAME || 'ehtech');
  const connectionStatus = await pool.testConnection();
  if (!connectionStatus.ok || connectionStatus.type !== 'mysql') {
    throw new Error(`Este seed requer a base MySQL local (${connectionStatus.error || connectionStatus.type}).`);
  }

  const connection = await pool.getConnection();
  let transactionStarted = false;

  try {
    const [databaseRows] = await connection.execute('SELECT DATABASE() AS database_name');
    assertSafeEnvironment(databaseRows[0]?.database_name);
    assertImagesExist();

    const users = await buildUsers();
    const savedUsers = new Map();
    let usersInserted = 0;
    let usersUpdated = 0;
    let productsInserted = 0;
    let productsUpdated = 0;

    await connection.beginTransaction();
    transactionStarted = true;

    for (const user of users) {
      const [matches] = await connection.execute(
        'SELECT id_usuario, username, email FROM usuarios WHERE username = ? OR email = ?',
        [user.username, user.email],
      );

      if (matches.length > 1) {
        throw new Error(`Conflito entre username e e-mail para ${user.username}.`);
      }

      let userId;
      if (matches.length === 1) {
        userId = matches[0].id_usuario;
        await connection.execute(
          "UPDATE usuarios SET username = ?, email = ?, senha = ?, nome = ?, role = 'user' WHERE id_usuario = ?",
          [user.username, user.email, user.senha, user.nome, userId],
        );
        usersUpdated += 1;
      } else {
        const [result] = await connection.execute(
          "INSERT INTO usuarios (username, email, senha, nome, role) VALUES (?, ?, ?, ?, 'user')",
          [user.username, user.email, user.senha, user.nome],
        );
        userId = result.insertId;
        usersInserted += 1;
      }

      savedUsers.set(user.username, { id: userId, username: user.username });
    }

    for (const product of products) {
      const seller = savedUsers.get(`usuario${product.seller}`);
      const image = JSON.stringify([`/uploads/${imageFiles[product.image]}`]);
      const [matches] = await connection.execute(
        'SELECT id_produto FROM produtos WHERE nome = ? AND vendedor_id = ? LIMIT 1',
        [product.nome, seller.id],
      );

      if (matches.length === 1) {
        await connection.execute(
          "UPDATE produtos SET descricao = ?, preco = ?, estoque = ?, categoria = ?, imagem = ?, vendedor = ?, status_aprovacao = 'aprovado' WHERE id_produto = ?",
          [product.descricao, product.preco, product.estoque, product.categoria, image, seller.username, matches[0].id_produto],
        );
        productsUpdated += 1;
      } else {
        await connection.execute(
          "INSERT INTO produtos (nome, descricao, preco, estoque, categoria, imagem, vendedor, vendedor_id, status_aprovacao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'aprovado')",
          [product.nome, product.descricao, product.preco, product.estoque, product.categoria, image, seller.username, seller.id],
        );
        productsInserted += 1;
      }
    }

    await connection.commit();
    transactionStarted = false;

    console.log(JSON.stringify({
      database: EXPECTED_DATABASE,
      users: { inserted: usersInserted, updated: usersUpdated, total: users.length },
      products: { inserted: productsInserted, updated: productsUpdated, total: products.length },
      images: Object.values(imageFiles).length,
    }, null, 2));
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

seed()
  .catch((error) => {
    console.error(`[seed-test-data] ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
