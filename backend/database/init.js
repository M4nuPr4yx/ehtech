const SERVICE_SEEDS = [
  {
    slug: 'montagem-pc-gamer-sob-medida',
    titulo: 'Montagem de PC gamer sob medida',
    descricao: 'Planejamento, montagem, organização dos cabos, atualização de BIOS e testes de estabilidade para entregar um computador pronto para uso.',
    categoria: 'montagem', precoBase: 249.90, tipoPreco: 'a_partir_de', prazo: 'Até 2 dias úteis', modalidade: 'presencial', regiao: 'Atendimento local',
    destaques: ['Compatibilidade das peças', 'Montagem e cable management', 'Testes de temperatura e estabilidade']
  },
  {
    slug: 'upgrade-otimizacao-computadores',
    titulo: 'Upgrade e otimização de computadores',
    descricao: 'Diagnóstico do equipamento e instalação de memória, SSD, placa de vídeo ou outros componentes com configuração e testes.',
    categoria: 'manutencao', precoBase: 149.90, tipoPreco: 'a_partir_de', prazo: '1 dia útil', modalidade: 'presencial', regiao: 'Atendimento local',
    destaques: ['Diagnóstico de gargalos', 'Instalação de componentes', 'Otimização do sistema']
  },
  {
    slug: 'formatacao-instalacao-segura',
    titulo: 'Formatação e instalação segura',
    descricao: 'Reinstalação limpa do sistema, drivers oficiais, atualizações e configuração inicial com foco em segurança e desempenho.',
    categoria: 'suporte', precoBase: 179.90, tipoPreco: 'fixo', prazo: 'No mesmo dia', modalidade: 'presencial', regiao: 'Atendimento local',
    destaques: ['Backup orientado', 'Drivers oficiais', 'Sistema atualizado e protegido']
  },
  {
    slug: 'suporte-tecnico-remoto',
    titulo: 'Suporte técnico remoto',
    descricao: 'Ajuda online para corrigir lentidão, erros de programas, configurações, impressoras e dúvidas do dia a dia sem deslocamento.',
    categoria: 'suporte', precoBase: 79.90, tipoPreco: 'a_partir_de', prazo: 'Atendimento em até 2 horas', modalidade: 'remoto', regiao: 'Todo o Brasil',
    destaques: ['Acesso somente com autorização', 'Solução acompanhada pelo cliente', 'Orientações após o atendimento']
  },
  {
    slug: 'configuracao-rede-wifi',
    titulo: 'Configuração de rede e Wi-Fi',
    descricao: 'Instalação e ajuste de roteadores, repetidores e redes mesh para melhorar cobertura, estabilidade e segurança da conexão.',
    categoria: 'redes', precoBase: 199.90, tipoPreco: 'a_partir_de', prazo: '1 dia útil', modalidade: 'hibrido', regiao: 'Remoto ou atendimento local',
    destaques: ['Mapeamento de cobertura', 'Rede de convidados', 'Configuração segura do roteador']
  },
  {
    slug: 'backup-recuperacao-dados',
    titulo: 'Backup e recuperação de dados',
    descricao: 'Avaliação de discos e organização de cópias de segurança. Tentativa de recuperação lógica conforme o estado do dispositivo.',
    categoria: 'dados', precoBase: null, tipoPreco: 'sob_consulta', prazo: 'Avaliação em até 5 dias', modalidade: 'hibrido', regiao: 'Atendimento sob consulta',
    destaques: ['Avaliação antes do orçamento', 'Privacidade no tratamento dos arquivos', 'Plano de backup preventivo']
  },
  {
    slug: 'limpeza-preventiva-pc-notebook',
    titulo: 'Limpeza preventiva de PC ou notebook',
    descricao: 'Limpeza interna, revisão da refrigeração e troca de pasta térmica para reduzir temperatura, ruído e desgaste dos componentes.',
    categoria: 'manutencao', precoBase: 129.90, tipoPreco: 'fixo', prazo: '1 dia útil', modalidade: 'presencial', regiao: 'Atendimento local',
    destaques: ['Limpeza interna cuidadosa', 'Troca de pasta térmica', 'Teste de temperatura']
  },
  {
    slug: 'consultoria-setup-gamer-home-office',
    titulo: 'Consultoria para setup gamer ou home office',
    descricao: 'Orientação para escolher equipamentos compatíveis com seu orçamento, espaço e objetivo, evitando compras desnecessárias.',
    categoria: 'consultoria', precoBase: 99.90, tipoPreco: 'fixo', prazo: 'Sessão de até 1 hora', modalidade: 'remoto', regiao: 'Todo o Brasil',
    destaques: ['Lista de peças personalizada', 'Prioridades por orçamento', 'Recomendações sem vínculo com lojas']
  }
]

const TABLES = [
  `CREATE TABLE IF NOT EXISTS password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY, email VARCHAR(255) NOT NULL,
    token_hash VARCHAR(255) NOT NULL, expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX idx_email (email), INDEX idx_token (token_hash)
  )`,
  `CREATE TABLE IF NOT EXISTS notificacoes (
    id INT AUTO_INCREMENT PRIMARY KEY, usuario_id INT NOT NULL, produto_id INT NULL,
    tipo VARCHAR(50) NOT NULL, mensagem TEXT NOT NULL, lida BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX idx_notificacoes_usuario (usuario_id),
    INDEX idx_notificacoes_lida (usuario_id, lida)
  )`,
  `CREATE TABLE IF NOT EXISTS avaliacoes (
    id INT AUTO_INCREMENT PRIMARY KEY, produto_id INT NOT NULL, avaliador_id INT NOT NULL,
    nota INT NOT NULL, comentario TEXT, data_avaliacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_avaliacao (produto_id, avaliador_id), INDEX idx_produto (produto_id),
    INDEX idx_avaliador (avaliador_id)
  )`,
  `CREATE TABLE IF NOT EXISTS mensagens (
    id INT AUTO_INCREMENT PRIMARY KEY, remetente_id INT NOT NULL, destinatario_id INT NOT NULL,
    produto_id INT NULL, conteudo TEXT NOT NULL, lida BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX idx_remetente (remetente_id),
    INDEX idx_destinatario (destinatario_id), INDEX idx_conversa (remetente_id, destinatario_id),
    INDEX idx_created (created_at)
  )`,
  `CREATE TABLE IF NOT EXISTS servicos (
    id_servico INT AUTO_INCREMENT PRIMARY KEY, slug VARCHAR(160) NOT NULL UNIQUE,
    titulo VARCHAR(180) NOT NULL, descricao TEXT NOT NULL, categoria VARCHAR(60) NOT NULL,
    preco_base DECIMAL(10,2) NULL, tipo_preco VARCHAR(20) NOT NULL DEFAULT 'a_partir_de',
    prazo VARCHAR(80) NOT NULL, modalidade VARCHAR(20) NOT NULL DEFAULT 'hibrido',
    regiao VARCHAR(120) NULL, destaques TEXT NULL, prestador_id INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ativo', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_servicos_status (status), INDEX idx_servicos_categoria (categoria),
    INDEX idx_servicos_modalidade (modalidade), INDEX idx_servicos_prestador (prestador_id)
  )`
]

async function seedServices(pool) {
  const [providers] = await pool.execute(
    `SELECT id_usuario FROM usuarios
     WHERE role IN ('vendedor', 'admin')
     ORDER BY CASE WHEN role = 'vendedor' THEN 0 ELSE 1 END, id_usuario
     LIMIT 8`
  )

  if (!providers.length) {
    console.warn('[EHtech DB] Serviços não foram cadastrados: nenhum prestador disponível')
    return
  }

  for (let index = 0; index < SERVICE_SEEDS.length; index += 1) {
    const service = SERVICE_SEEDS[index]
    const providerId = providers[index % providers.length].id_usuario
    await pool.execute(
      `INSERT IGNORE INTO servicos
        (slug, titulo, descricao, categoria, preco_base, tipo_preco, prazo, modalidade, regiao, destaques, prestador_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [service.slug, service.titulo, service.descricao, service.categoria, service.precoBase,
        service.tipoPreco, service.prazo, service.modalidade, service.regiao,
        JSON.stringify(service.destaques), providerId]
    )
  }
}

async function initializeDatabase(pool) {
  for (const statement of TABLES) await pool.execute(statement)
  await seedServices(pool)
}

module.exports = { initializeDatabase }
