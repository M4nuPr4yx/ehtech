'use strict'

// Somente documentação: não importa o servidor, não registra rotas e não acessa o banco.
const str = (description, extra = {}) => ({ type: 'string', description, ...extra })
const int = (description, extra = {}) => ({ type: 'integer', description, ...extra })
const num = (description, extra = {}) => ({ type: 'number', description, ...extra })
const bool = { type: 'boolean' }
const obj = (properties, required = []) => ({ type: 'object', properties, ...(required.length ? { required } : {}) })
const arr = (items) => ({ type: 'array', items })
const ref = (name) => ({ $ref: '#/components/schemas/' + name })
const text = str('Texto')
const id = int('Identificador', { example: 1 })
const password = str('Senha de no mínimo 8 caracteres e até 1024 bytes em UTF-8; não é truncada', { format: 'password', minLength: 8, maxLength: 1024, writeOnly: true })
const email = str('E-mail válido', { format: 'email', example: 'conta.teste@gmail.com' })
const message = obj({ mensagem: text })
const error = obj({ mensagem: text, error: text, erro: text, code: text })
const status = str('Etapa da contratação', { enum: ['solicitado', 'orcamento_enviado', 'aceito', 'em_execucao', 'concluido', 'cancelado'] })
const modality = str('Modalidade', { enum: ['presencial', 'remoto', 'hibrido'] })
const money = num('Valor em reais', { minimum: 0, maximum: 10000000 })
const approval = str('Aprovação do anúncio', { enum: ['aprovado', 'reprovado', 'pendente'] })
const binary = { type: 'string', format: 'binary' }
const json = (schema) => ({ 'application/json': { schema } })
const body = (properties, required, example) => ({
  required: true,
  content: { 'application/json': { schema: obj(properties, required), ...(example ? { example } : {}) } }
})
const query = (name, schema) => ({ name, in: 'query', required: false, schema })
const paths = {}
const schemas = {
  DocPerfilPublico: obj({ id_usuario: id, username: text, nome: { ...text, nullable: true }, foto: { ...text, nullable: true }, data_criacao: text }),
  DocPerfil: obj({ id_usuario: id, username: text, email, role: text, nome: { ...text, nullable: true }, foto: { ...text, nullable: true }, data_criacao: text }),
  DocNotificacao: obj({ id, produto_id: { ...id, nullable: true }, tipo: text, mensagem: text, lida: { oneOf: [bool, { type: 'integer' }] }, created_at: text }),
  DocServico: obj({
    id_servico: id, slug: text, titulo: text, descricao: text, categoria: text,
    preco_base: { type: 'number', nullable: true }, tipo_preco: text, prazo: text,
    modalidade: modality, regiao: text, destaques: arr(text), prestador_id: id,
    prestador: text, prestador_foto: { ...text, nullable: true },
    prestador_nota: num('Média das avaliações'), prestador_avaliacoes: int('Total de avaliações'), created_at: text
  }),
  DocContratacao: obj({
    id_contratacao: id, servico_id: id, cliente_id: id, prestador_id: id,
    descricao_problema: text, modalidade: modality, urgencia: text, combo_snapshot: { type: 'object', nullable: true, description: 'Referência imutável do combo no momento da solicitação; não é compra nem preço final.' },
    orcamento_max: { ...money, nullable: true }, disponibilidade: text, status,
    valor_proposto: { ...money, nullable: true }, escopo_proposto: { ...text, nullable: true },
    prazo_proposto: { ...text, nullable: true }, garantia_dias: { ...id, nullable: true },
    observacoes_prestador: { ...text, nullable: true }, garantia_codigo: { ...text, nullable: true },
    garantia_inicio_em: { ...text, nullable: true }, garantia_fim_em: { ...text, nullable: true },
    orcamento_enviado_em: { ...text, nullable: true }, aceito_em: { ...text, nullable: true },
    iniciado_em: { ...text, nullable: true }, concluido_em: { ...text, nullable: true },
    cancelado_em: { ...text, nullable: true }, created_at: text, updated_at: text,
    slug: text, servico_titulo: text, categoria: text, cliente_nome: text, prestador_nome: text,
    avaliacao_nota: { type: 'integer', nullable: true }, avaliacao_comentario: { ...text, nullable: true },
    avaliacao_em: { ...text, nullable: true }, papel: str('Papel do usuário', { enum: ['cliente', 'prestador'] })
  }),
  DocItemPedido: obj({ id_item: id, pedido_id: id, produto_id: id, vendedor_id: id, vendedor_nome: text, nome_produto: text, preco_unitario: num('Preço unitário'), quantidade: int('Quantidade'), imagem: { ...text, nullable: true } }),
  DocPedido: obj({ id_pedido: id, status: text, total: num('Total em reais'), created_at: text, updated_at: text, itens: arr(ref('DocItemPedido')) }),
  DocArquivo: obj({ url: text, filename: text, tamanho: int('Tamanho em bytes'), tipo: text }),
  DocMensagem: obj({ id, remetente_id: id, destinatario_id: id, produto_id: { ...id, nullable: true }, conteudo: text, lida: { oneOf: [bool, { type: 'integer' }] }, created_at: text, produto_nome: { ...text, nullable: true }, produto_preco: { oneOf: [text, { type: 'number' }], nullable: true }, produto_imagem: { ...text, nullable: true } })
}
const errorDescriptions = {
  400: 'Dados inválidos. Consulte a mensagem retornada.',
  401: 'Token ausente, formato inválido ou credenciais administrativas inválidas.',
  403: 'Token inválido/expirado ou usuário sem permissão para esta operação.',
  404: 'Recurso não encontrado.',
  409: 'Conflito: dado duplicado, indisponibilidade ou etapa incompatível.',
  413: 'Corpo JSON excede o limite de 6 MB.',
  429: 'Cota por IP esgotada. Aguarde o tempo indicado por Retry-After.',
  500: 'Falha interna no processamento.',
  502: 'Resposta da IA inválida, incompleta ou divergente das regras.',
  503: 'IA não configurada, modelo ausente ou provedor indisponível.',
  504: 'Prazo da explicação por IA excedido.'
}
function add(method, path, tag, summary, options = {}) {
  const { auth = true, admin = false, input, output = message, code = 200, errors = [], description = '', parameters = [], limit } = options
  const codes = new Set([429, 500, ...errors, ...(auth ? [401, 403] : []), ...(input?.content?.['application/json'] ? [413] : [])])
  const responses = { [code]: { description: code === 201 ? 'Recurso criado.' : 'Operação concluída.', content: json(output) } }
  for (const statusCode of codes) responses[statusCode] = { description: errorDescriptions[statusCode], content: json(error) }
  responses[429].headers = {
    'Retry-After': { description: 'Segundos até poder tentar novamente', schema: { type: 'integer' } },
    'RateLimit-Limit': { description: 'Cota do limitador', schema: { type: 'integer' } },
    'RateLimit-Remaining': { description: 'Requisições restantes', schema: { type: 'integer' } },
    'RateLimit-Reset': { description: 'Segundos até o fim da janela', schema: { type: 'integer' } }
  }
  const routeParams = Array.from(path.matchAll(/\{([^}]+)\}/g), ([, name]) => ({
    name, in: 'path', required: true,
    schema: path.startsWith('/checkout/') ? str('UUID do checkout autenticado', { format: 'uuid' }) : name === 'grupo' ? str('Grupo estável da entrega', { pattern: '^[1-9][0-9]*:[1-9][0-9]*$' }) : name === 'cep' ? str('CEP com oito dígitos', { pattern: '^[0-9]{8}$' }) : name === 'codigo' ? str('Código aleatório do link de consulta', { pattern: '^[a-f0-9]{64}$' }) : ['slug', 'token', 'filename'].includes(name) ? str('Valor real do recurso') : id
  }))
  paths[path] ||= {}
  paths[path][method] = {
    tags: [tag],
    operationId: 'doc_' + method + '_' + path.replace(/[^a-zA-Z0-9]+/g, '_'),
    summary,
    description: [
      description,
      admin ? 'Requer administrador: faça POST /admin/login e informe o token em Authorize. O backend verifica o papel no banco.' : '',
      method !== 'get' ? 'Execute altera dados reais ou processa a ação descrita. Use uma conta e registros de teste; não há simulação automática.' : '',
      limit || 'Sujeita à cota global compartilhada de 300 requisições/IP em 15 minutos.'
    ].filter(Boolean).join('\n\n'),
    security: auth ? [{ bearerAuth: [] }] : [],
    ...(input ? { requestBody: input } : {}),
    ...((routeParams.length || parameters.length) ? { parameters: [...routeParams, ...parameters] } : {}),
    responses
  }
}
const authLimit = '20 requisições/IP em 15 minutos, compartilhadas entre cadastro, login e login administrativo; também sujeita ao limite global. Login por senha compartilha contadores persistentes entre instâncias e entre /login e /admin/login: 10 falhas por conta/rede e 100 por rede em janela fixa de 15 minutos. Sucesso devolve a reserva, sem apagar falhas anteriores. Retorna Retry-After quando limitado.'
const resetLimit = '10 requisições/IP por hora, compartilhadas entre solicitação, verificação de link e redefinição de senha; também sujeita ao limite global.'
const uploadLimit = '50 requisições/IP em 15 minutos, compartilhadas pelas rotas /upload; também sujeita ao limite global.'

add('post', '/cadastro', 'Autenticação', 'Cadastrar uma conta de usuário', {
  auth: false, code: 201, errors: [400, 409], limit: authLimit,
  description: 'Rota pública: não precisa estar logado. Username único com 3–30 caracteres (letras, números, ponto, hífen ou underline). E-mail único nos domínios gmail.com, hotmail.com ou outlook.com. Senha e confirmarSenha devem coincidir. Cria uma conta user, mas não retorna token: use POST /login depois. Para teste de inserts, varie username e email; duplicatas retornam 409, não novos registros.',
  input: body({
    username: str('Nome único, após remover espaços nas extremidades', { minLength: 3, maxLength: 30, pattern: '^[a-zA-Z0-9_.-]+$' }),
    email: { ...email, description: 'Somente gmail.com, hotmail.com ou outlook.com; normalizado para minúsculas.' },
    senha: password, confirmarSenha: { ...password, description: 'Repita exatamente a senha' }
  }, ['username', 'email', 'senha', 'confirmarSenha'], { username: 'teste_carga_001', email: 'teste.carga.001@gmail.com', senha: 'TroqueEstaSenha123!', confirmarSenha: 'TroqueEstaSenha123!' })
})
add('post', '/admin/login', 'Administração', 'Autenticar administrador', {
  auth: false, errors: [400, 401, 503], limit: authLimit,
  description: 'Somente contas com role admin. Retorna JWT com validade de 4 horas. Não cria um administrador.',
  input: body({ email, senha: str('Senha atual', { format: 'password', writeOnly: true }) }, ['email', 'senha']),
  output: obj({ mensagem: text, token: text })
})
add('get', '/admin/sessao', 'Administração', 'Verificar sessão administrativa', { admin: true, output: obj({ id, email, role: str('Papel', { enum: ['admin'] }) }) })
add('get', '/admin/users', 'Administração', 'Listar usuários', { admin: true, output: arr(obj({ id_usuario: id, username: text, email, role: text, data_criacao: text })) })
add('put', '/admin/users/{id}', 'Administração', 'Atualizar e-mail e papel de usuário', {
  admin: true, errors: [400], description: 'Não permite ao único administrador remover seu próprio acesso administrativo.',
  input: body({ email, role: str('Papel', { enum: ['user', 'admin'] }) }, ['email', 'role'])
})
add('delete', '/admin/users/{id}', 'Administração', 'Excluir usuário', { admin: true, errors: [400], description: 'Ação destrutiva. Não permite excluir a própria conta autenticada. Use somente um ID de teste.' })
add('put', '/admin/users/{id}/senha', 'Administração', 'Redefinir senha de usuário', { admin: true, errors: [400], description: 'Revoga todas as sessões anteriores da conta afetada, inclusive administrativas.', input: body({ novaSenha: password }, ['novaSenha']) })
add('get', '/admin/produtos', 'Administração', 'Listar anúncios para moderação', { admin: true, output: arr(ref('ProdutoCompleto')), description: 'Inclui anúncios aprovados, pendentes e reprovados.' })
add('put', '/admin/produtos/{id}/aprovacao', 'Administração', 'Alterar aprovação de anúncio', { admin: true, errors: [400, 404], input: body({ status: approval }, ['status']), description: 'Atualiza o anúncio e envia uma notificação ao vendedor.' })

add('post', '/esqueci-senha', 'Recuperação de senha', 'Solicitar link de recuperação', {
  auth: false, errors: [400], limit: resetLimit, input: body({ email }, ['email']),
  description: 'Envia e-mail se SMTP estiver configurado, com TLS obrigatório em produção. Retorna mensagem genérica mesmo se a conta não existir. O link expira em 1 hora e nunca é registrado nos logs, inclusive sem SMTP. Resposta sem cache.'
})
add('get', '/verificar-token/{token}', 'Recuperação de senha', 'Verificar token de recuperação', {
  auth: false, errors: [400], limit: resetLimit, output: obj({ valido: bool, mensagem: text }),
  description: 'Use os 64 caracteres hexadecimais do link de recuperação, não o JWT de login. Link bem formado, inválido ou expirado retorna HTTP 200 com valido=false; formato incorreto retorna 400. Não revela e-mail. Resposta sem cache e sem referência.'
})
add('post', '/redefinir-senha', 'Recuperação de senha', 'Salvar nova senha usando link de recuperação', {
  auth: false, errors: [400], limit: resetLimit, input: body({ token: str('Token do link de recuperação'), novaSenha: password }, ['token', 'novaSenha']),
  description: 'Altera a senha e incrementa a versão de sessão, revogando todos os JWTs anteriores. Consome o link e remove os demais tokens de recuperação da conta na mesma transação. Não use o JWT de login aqui.'
})

add('get', '/perfil', 'Perfil', 'Consultar meu perfil', { errors: [404], output: ref('DocPerfil') })
add('put', '/perfil', 'Perfil', 'Atualizar meu nome', { errors: [400], input: body({ nome: str('Nome público, normalizado em NFC; espaços externos removidos e espaços internos agrupados. Rejeita marcação e caracteres de controle.', { minLength: 2, maxLength: 80 }) }, ['nome']), output: obj({ mensagem: text, nome: text }), description: 'Qualquer papel autenticado pode alterar somente o próprio nome. Não altera username, e-mail, permissões ou sessão. Fotos ausentes em perfis usam /profile/default-environment.webp, asset local CC0; fotos personalizadas são preservadas.' })
add('get', '/usuarios/{id}/publico', 'Perfil', 'Consultar perfil público do vendedor', { auth: false, errors: [400, 404], output: ref('DocPerfilPublico') })
add('get', '/usuarios/busca', 'Mensagens', 'Procurar pessoas para iniciar conversa direta', { errors: [400], parameters: [{ name: 'q', in: 'query', required: true, schema: str('Nome público ou username; @ inicial é opcional. Após remover @ e espaços: 2 a 80 caracteres.', { minLength: 2, maxLength: 81 }) }, query('page', int('Página', { minimum: 1, maximum: 100, default: 1 }))], output: obj({ items: arr(obj({ id_usuario: id, username: text, nome: { ...text, nullable: true }, foto: { ...text, nullable: true } })), total: int('Correspondências'), page: id, limit: int('12 resultados por página'), totalPages: id }), description: 'Autenticado, sem cache e com o rate limit global existente. Busca literal sem distinguir maiúsculas em username/nome; não pesquisa e-mail. Exclui a própria conta. Retorna somente ID, username, nome e foto públicos, sem e-mail, senha, papel, endereços ou mensagens. Prioriza username exato/prefixo e nome exato; desempate por username/ID. Inclui contas sem anúncios. Até 12 resultados por página e 100 páginas; refine a busca para mais precisão.' })
add('put', '/perfil/senha', 'Perfil', 'Alterar minha senha', { description: 'Revoga todas as sessões anteriores da conta, inclusive a sessão usada nesta requisição. Exige novo login.', errors: [400, 404], input: body({ senhaAtual: str('Senha atual', { format: 'password', writeOnly: true }), novaSenha: password }, ['senhaAtual', 'novaSenha']) })
add('put', '/perfil/email', 'Perfil', 'Alterar meu e-mail', {
  errors: [400, 404, 409], input: body({ novoEmail: email, senha: str('Senha atual', { format: 'password', writeOnly: true }) }, ['novoEmail', 'senha']),
  output: obj({ mensagem: text, novoEmail: email }), description: 'Aceita gmail.com, hotmail.com ou outlook.com. Valida a senha atual e a disponibilidade do novo endereço.'
})
add('put', '/perfil/foto', 'Perfil', 'Atualizar ou remover minha foto', {
  errors: [400], output: obj({ mensagem: text, foto: { ...text, nullable: true } }),
  description: 'Arquivo JPG/JPEG, PNG ou WEBP de até 5 MiB, campo foto. Alternativamente envie JSON com foto (URL http, caminho /uploads/ ou data:image/). JSON com foto=null remove a referência do perfil.',
  input: { required: true, content: { 'multipart/form-data': { schema: obj({ foto: binary }, ['foto']) }, 'application/json': { schema: obj({ foto: { ...text, nullable: true } }), example: { foto: null } } } }
})

add('get', '/produtos/meus', 'Produtos', 'Listar meus anúncios, incluindo pendentes', { output: arr({ allOf: [ref('ProdutoCompleto'), obj({ origem_endereco_id: { ...id, nullable: true }, origem_snapshot: { ...text, nullable: true } })] }), description: 'Somente anúncios próprios. A cópia privada da origem aparece aqui, nunca na vitrine ou detalhe público.' })
add('get', '/produtos/{id}', 'Produtos', 'Consultar anúncio por ID', { auth: false, errors: [400, 401, 403, 404], output: ref('ProdutoCompleto'), description: 'Consulta pública retorna apenas anúncios aprovados. JWT opcional permite consultar pendente/reprovado somente como proprietário ou administrador. Sem cache e sem origem privada.' })
add('put', '/produtos/{id}', 'Produtos', 'Editar anúncio', {
  errors: [400, 404, 409], description: 'Requer proprietário ou administrador. Aceita edição parcial. Origem anterior é mantida se omitida; para trocar envie endereço salvo da conta do anunciante e versão confirmada. Anúncios físicos antigos sem origem precisam selecioná-la ao editar. Alterar origem ou tipo de entrega como vendedor volta à moderação. status_aprovacao só vale para administrador.',
  input: body({
    nome: str('Nome', { maxLength: 255 }), descricao: str('Descrição', { maxLength: 5000 }),
    preco: num('Preço'), estoque: int('Estoque'), categoria: str('Categoria', { maxLength: 60 }),
    imagem: { oneOf: [text, arr(text)], nullable: true }, status_aprovacao: approval,
    exige_entrega: bool, origem_endereco_id: id, origem_versao: id,
    componente_id: { ...id, nullable: true, description: 'Modelo técnico ativo e verificado; null remove a associação. Alterar a associação como vendedor retorna o anúncio à moderação.' }
  }, [], { nome: 'Produto de teste', descricao: 'Descrição atualizada do produto de teste', preco: 99.9, estoque: 10, categoria: 'Acessórios', imagem: [] })
})
add('delete', '/produtos/{id}', 'Produtos', 'Excluir anúncio', { errors: [400, 404], description: 'Ação destrutiva: requer proprietário ou administrador. Exclui o anúncio real indicado pelo ID.' })

add('get', '/notificacoes', 'Notificações', 'Listar minhas últimas 50 notificações', { output: arr(ref('DocNotificacao')) })
add('put', '/notificacoes/{id}/lida', 'Notificações', 'Marcar minha notificação como lida', { errors: [400], description: 'Atualiza somente notificações pertencentes ao usuário autenticado.' })
add('put', '/notificacoes/lidas', 'Notificações', 'Marcar todas as minhas notificações como lidas')

add('post', '/avaliacoes', 'Avaliações', 'Criar ou atualizar avaliação de produto', {
  errors: [400, 404], input: body({ produtoId: id, nota: int('Nota', { minimum: 1, maximum: 5 }), comentario: str('Comentário opcional; truncado em 1000 caracteres', { maxLength: 1000 }) }, ['produtoId', 'nota']),
  description: 'Exige pedido concluído da própria conta contendo o produto e com todas as entregas recebidas. Não permite avaliar o próprio anúncio. Vincula a avaliação ao pedido e atualiza a avaliação anterior da conta, se houver. Retorna 403 sem compra elegível e 200 na criação/edição.'
})
add('get', '/avaliacoes/produto/{id}', 'Avaliações', 'Listar avaliações de um produto', {
  auth: false, errors: [400], description: 'Preserva avaliações históricas sem selo. Média e total consideram somente compras verificadas.', output: obj({ avaliacoes: arr(obj({ id, produto_id: id, nota: int('Nota'), comentario: { ...text, nullable: true }, data_avaliacao: text, compra_verificada: { oneOf: [bool, { type: 'integer' }] }, avaliador_username: text })), media: str('Média de compras verificadas em texto, com uma casa decimal', { example: '4.5' }), total: int('Total de avaliações verificadas') })
})
add('get', '/avaliacoes/usuario/{id}', 'Avaliações', 'Consultar reputação do vendedor de produtos', { auth: false, errors: [400], output: obj({ media: str('Média em texto', { example: '4.5' }), total: int('Total') }) })

add('get', '/servicos', 'Serviços', 'Listar catálogo paginado de serviços ativos', {
  auth: false,
  parameters: [query('page', int('Página, limitada ao total disponível', { default: 1, minimum: 1, maximum: 100000 })), query('limit', int('Itens por página', { default: 9, minimum: 1, maximum: 24 })), query('search', str('Busca por título, descrição ou categoria', { maxLength: 100 })), query('categoria', str('Categoria exata', { maxLength: 60 })), query('modalidade', modality), query('ordenacao', str('Ordenação', { enum: ['recentes', 'menor-preco', 'maior-preco'], default: 'recentes' }))],
  output: obj({ items: arr(ref('DocServico')), total: int('Total'), page: int('Página efetiva'), limit: int('Tamanho da página'), totalPages: int('Total de páginas') }),
  description: 'Somente anúncios ativos e aprovados. Consultas anônimas: Cache-Control: public, max-age=0, must-revalidate e Vercel-CDN-Cache-Control: public, s-maxage=15, stale-while-revalidate=30. Authorization ou Cookie recebem no-store. A compra/contratação confere as regras atuais no servidor.'
})
add('get', '/servicos/{slug}', 'Serviços', 'Consultar serviço ativo pelo slug', { auth: false, errors: [400, 404], output: ref('DocServico'), description: 'Use o slug real retornado pelo catálogo; somente letras minúsculas, números e hífens.' })
add('get', '/servicos/reputacao/prestador/{id}', 'Serviços', 'Consultar reputação técnica do prestador', { auth: false, errors: [400], output: obj({ media: num('Média numérica'), total: int('Total'), avaliacoes: arr(obj({ nota: int('Nota'), comentario: { ...text, nullable: true }, created_at: text, avaliador: text, servico: text })) }), description: 'Retorna resumo e até 20 avaliações recentes.' })

add('post', '/contratacoes', 'Contratações', 'Solicitar orçamento de serviço', {
  code: 201, errors: [400, 404, 409],
  input: body({ servico_id: { ...id, minimum: 1 }, combo_id: id, descricao_problema: str('Necessidade', { minLength: 20, maxLength: 2000 }), modalidade: modality, urgencia: str('Urgência', { enum: ['flexivel', 'normal', 'urgente'] }), orcamento_max: { ...money, nullable: true }, disponibilidade: str('Disponibilidade', { minLength: 5, maxLength: 300 }) }, ['servico_id', 'descricao_problema', 'modalidade', 'urgencia', 'disponibilidade'], { servico_id: 1, descricao_problema: 'Preciso de montagem e configuração de um computador.', modalidade: 'presencial', urgencia: 'normal', orcamento_max: 300, disponibilidade: 'Sábado pela manhã' }),
  output: obj({ id, status, mensagem: text }), description: 'Cliente identificado pelo token. Serviço deve estar ativo e pertencer a outro usuário. Apenas uma solicitação não concluída/não cancelada por cliente e serviço. combo_id opcional é revalidado no servidor (produto aprovado/com estoque, serviço ativo e mesmo anunciante), precisa corresponder ao serviço e gera snapshot. Proposta e garantia cobrem apenas o serviço; produto é comprado separadamente.'
})
add('get', '/contratacoes', 'Contratações', 'Consultar meu histórico de serviços', { output: arr(ref('DocContratacao')), description: 'Até 100 contratações como cliente ou prestador, incluindo concluídas e canceladas, com orçamento, garantia e avaliação.' })
add('patch', '/contratacoes/{id}/orcamento', 'Contratações', 'Enviar ou revisar orçamento como prestador', {
  errors: [400, 404, 409],
  input: body({ valor_proposto: { ...money, exclusiveMinimum: true }, escopo_proposto: str('Escopo', { minLength: 20, maxLength: 3000 }), prazo_proposto: str('Prazo', { minLength: 2, maxLength: 120 }), garantia_dias: int('Dias de garantia', { minimum: 0, maximum: 3650 }), observacoes_prestador: str('Observações opcionais', { maxLength: 2000 }) }, ['valor_proposto', 'escopo_proposto', 'prazo_proposto', 'garantia_dias']),
  output: obj({ status, mensagem: text }), description: 'Somente prestador da contratação, nas etapas solicitado ou orcamento_enviado. Avança para orcamento_enviado.'
})
add('patch', '/contratacoes/{id}/status', 'Contratações', 'Avançar ou cancelar contratação', {
  errors: [400, 404, 409], input: body({ status: str('Próxima etapa', { enum: ['aceito', 'em_execucao', 'concluido', 'cancelado'] }) }, ['status']),
  output: obj({ status, garantia_codigo: { ...text, nullable: true }, mensagem: text }),
  description: 'Cliente: solicitado → cancelado; orcamento_enviado → aceito ou cancelado; aceito → cancelado. Prestador: solicitado/orcamento_enviado → cancelado; aceito → em_execucao ou cancelado; em_execucao → concluido. Outras transições retornam 409. Ao concluir com garantia_dias > 0, gera código e datas da garantia.'
})
add('post', '/contratacoes/{id}/avaliacao', 'Contratações', 'Avaliar serviço concluído', {
  code: 201, errors: [400, 404, 409], input: body({ nota: int('Nota', { minimum: 1, maximum: 5 }), comentario: str('Opcional; se não vazio, precisa de ao menos 10 caracteres; truncado em 1000', { maxLength: 1000 }) }, ['nota']),
  description: 'Somente o cliente, após a conclusão. Uma avaliação por contratação; duplicatas retornam 409.'
})
add('post', '/pedidos', 'Pedidos', 'Registrar pedido de produtos', {
  code: 201, errors: [400, 404, 409], input: body({ checkout_id: str('Checkout com endereço e entregas confirmados', { format: 'uuid' }) }, ['checkout_id']),
  output: obj({ id_pedido: id, total: { ...num('Total; null se houver frete a combinar. Confira acordo_pendente no acompanhamento.'), nullable: true }, total_parcial: money, frete: { ...money, nullable: true }, frete_conhecido: money, frete_pendente: bool, status: str('Estado atual; repetição do checkout preserva o acompanhamento', { enum: ['registrado', 'em_negociacao', 'acordo_confirmado', 'em_entrega', 'concluido'] }), status_pagamento: text, mensagem: text }),
  description: 'Exige checkout privado válido. Valida preços/itens, origem dos anúncios, endereço próprio completo e sua confirmação/versão, além de modalidade selecionada para cada grupo. Sem tarifa, permite solicitação de entrega e frete a combinar, sem confirmar atendimento, preço ou prazo. total e frete são null enquanto houver pendência; total_parcial soma produtos e fretes conhecidos, não é preço final. Registra snapshots imutáveis e notifica o vendedor. Repetir checkout retorna o mesmo pedido e a mesma pendência. Sem cobrança, reserva de estoque ou marcação automática como pago.'
})
add('get', '/pedidos', 'Pedidos', 'Consultar meu histórico de compras', { output: arr(ref('DocPedidoDetalhe')), description: 'Retorna até 50 pedidos do comprador autenticado com itens, grupos, propostas e acordos atuais. Não inclui eventos detalhados (consulte /pedidos/{id}). Frete proposto não aceito não se torna valor confirmado. acordo_pendente informa se ainda faltam aceites, mesmo quando havia uma tarifa inicial conhecida.' })

const addressFields = {
  destinatario: str('Nome completo', { minLength: 3, maxLength: 150 }), telefone: str('Telefone com DDD', { maxLength: 20 }),
  identificacao: str('Casa, Trabalho ou nome personalizado', { maxLength: 60 }), cep: str('CEP', { pattern: '^[0-9]{5}-?[0-9]{3}$' }),
  uf: str('UF brasileira', { minLength: 2, maxLength: 2 }), cidade: str('Cidade', { maxLength: 100 }), bairro: str('Bairro', { maxLength: 100 }),
  logradouro: str('Rua ou avenida', { maxLength: 180 }), numero: str('Obrigatório se sem_numero=false', { maxLength: 20 }), sem_numero: bool,
  complemento: str('Complemento', { maxLength: 150 }), referencia: str('Referência', { maxLength: 200 }), instrucoes: str('Instruções', { maxLength: 500 }), principal: bool, salvar: bool
}
const addressRequired = ['destinatario', 'telefone', 'identificacao', 'cep', 'uf', 'cidade', 'bairro', 'logradouro']
schemas.DocEndereco = obj({ id, ...addressFields, versao: id, confirmado_em: { ...text, nullable: true }, created_at: text, updated_at: text })
schemas.DocEntrega = obj({ grupo_id: text, vendedor_id: id, vendedor: text, origem: { type: 'object', nullable: true, properties: { cidade: text, uf: text } }, produtos: arr(obj({ produto_id: id, nome: text })), motivo: { ...text, nullable: true }, opcoes: arr(obj({ id: text, nome: text, valor: { ...money, nullable: true, description: 'null para frete a combinar; zero somente para gratuidade explícita.' }, tipo: str('Presente na solicitação sem tarifa', { enum: ['a_combinar'] }), prazo: text, fonte: text })) })
schemas.DocCheckout = obj({ id: str('UUID', { format: 'uuid' }), pedido_id: { ...id, nullable: true }, exige_entrega: bool, itens: arr(obj({ produto_id: id, quantidade: id, nome: text, preco: money, vendedor: text })), subtotal: money, frete: { ...money, nullable: true }, total: money, endereco: { ...ref('DocEndereco'), nullable: true }, endereco_confirmado: bool, modalidades: arr(ref('DocEntrega')), entrega: arr(obj({ grupo_id: text, vendedor_id: id, origem: obj({ cidade: text, uf: text }), id: text, nome: text, valor: money, prazo: text })), pronto: bool, pagamento_online: bool, expires_at: text })
schemas.DocPedido.properties.endereco_entrega = { ...ref('DocEndereco'), nullable: true }
schemas.DocPedido.properties.entrega = schemas.DocCheckout.properties.entrega
schemas.DocPedido.properties.frete = money
schemas.DocPedido.properties.status_pagamento = text
const pendingFreightFields = { frete_pendente: bool, frete_conhecido: num('Soma dos fretes já definidos; não inclui os pendentes'), total_parcial: num('Produtos mais fretes conhecidos, sem fretes pendentes') }
Object.assign(schemas.DocCheckout.properties, pendingFreightFields)
Object.assign(schemas.DocPedido.properties, pendingFreightFields)
schemas.DocCheckout.properties.total = { ...schemas.DocCheckout.properties.total, nullable: true }
schemas.DocPedido.properties.total = { ...schemas.DocPedido.properties.total, nullable: true }
schemas.DocPedido.properties.frete = { ...schemas.DocPedido.properties.frete, nullable: true }
schemas.DocCheckout.properties.entrega.items.properties.valor = { ...schemas.DocCheckout.properties.entrega.items.properties.valor, nullable: true }
schemas.DocCheckout.properties.entrega.items.properties.tipo = str('Modalidade negociada; acordada somente no acompanhamento do pedido', { enum: ['a_combinar', 'acordada'] })
schemas.DocPedido.properties.acordo_pendente = bool
schemas.DocPedido.properties.papel = str('Participação', { enum: ['comprador', 'vendedor'] })
schemas.DocPedido.properties.subtotal = money
const deliveryStages = ['aguardando_proposta', 'proposta_enviada', 'acordo_confirmado', 'enviado', 'pronto_retirada', 'recebido']
const deliveryActions = ['propor', 'aceitar', 'recusar', 'despachar', 'receber']
schemas.DocPropostaEntrega = obj({ modalidade: str('Forma de entrega', { enum: ['entrega', 'retirada'] }), valor_frete: num('Frete proposto, não cobrado', { minimum: 0, maximum: 100000 }), prazo: str('Prazo declarado pelo vendedor', { minLength: 5, maxLength: 300 }), observacoes: str('Mensagem para a outra parte', { maxLength: 500 }), versao_proposta: int('Versão aceita') })
schemas.DocProgressoEntrega = obj({ id: { ...id, nullable: true }, grupo_id: text, vendedor_id: id, vendedor: text, origem: { type: 'object', nullable: true }, estado: str('Etapa', { enum: deliveryStages }), rotulo: text, versao: int('Versão obrigatória em toda ação', { minimum: 0 }), proposta: { allOf: [ref('DocPropostaEntrega')], nullable: true }, acordo: { allOf: [ref('DocPropostaEntrega')], nullable: true }, despacho: { type: 'object', nullable: true, properties: { transportadora: text, codigo_rastreio: text, observacoes: text, informado_em: text } }, proposta_em: { ...text, nullable: true }, aceito_em: { ...text, nullable: true }, recebido_em: { ...text, nullable: true } })
schemas.DocPedidoDetalhe = obj({ ...schemas.DocPedido.properties, comprador_id: id, comprador_nome: text, entregas: arr(ref('DocProgressoEntrega')), historico: { ...arr(obj({ id, entrega_id: id, acao: str('Ação registrada', { enum: deliveryActions }), versao: id, papel: str('Autor', { enum: ['comprador', 'vendedor'] }), dados: { type: 'object', description: 'Condições e etapa desta versão, sem endereços.' }, created_at: text })), maxItems: 100 } })
add('get', '/pedidos/vendas', 'Pedidos', 'Listar pedidos recebidos como vendedor', { output: arr(ref('DocPedidoDetalhe')), description: 'Até 50 pedidos. Cada vendedor recebe apenas seus itens, valores e grupos, nunca o total ou as propostas de outro vendedor. Endereço do comprador somente após aceite de uma proposta de entrega física do próprio vendedor. Sem cobrança. Resposta sem cache.' })
add('get', '/pedidos/{id}', 'Pedidos', 'Consultar pedido e histórico de entrega como participante', { errors: [400, 404], output: ref('DocPedidoDetalhe'), description: 'Somente comprador ou vendedor com itens no pedido; administrador sem participação também recebe 404. Comprador vê seus grupos; vendedor somente os próprios, com valores calculados sobre sua venda. Até 100 eventos recentes dos grupos visíveis. Endereço do comprador só é revelado ao vendedor após aceite de entrega física. Retirada exige combinar o local pelo chat; endereço do vendedor não é publicado. Origem/endereço e modalidade inicial continuam como snapshots; propostas/aceites ficam em registros separados.' })
add('patch', '/pedidos/{id}/entregas/{grupo}', 'Pedidos', 'Propor, aceitar, recusar, informar envio ou confirmar recebimento', { errors: [400, 404, 409], input: body({ acao: str('Ação do participante', { enum: deliveryActions }), versao: int('Versão atual do grupo', { minimum: 0 }), modalidade: str('Somente propor', { enum: ['entrega', 'retirada'] }), valor_frete: num('Somente propor; retirada exige zero', { minimum: 0, maximum: 100000, multipleOf: 0.01 }), prazo: str('Somente propor', { minLength: 5, maxLength: 300 }), observacoes: str('Somente propor/despachar', { maxLength: 500 }), transportadora: str('Somente despacho de entrega', { maxLength: 80 }), codigo_rastreio: str('Somente despacho de entrega', { maxLength: 80 }) }, ['acao', 'versao']), output: ref('DocPedidoDetalhe'), description: 'Até 4 KB e campos específicos de cada ação. Vendedor propõe/revisa antes do aceite e informa envio/retirada apenas com acordo confirmado. Comprador aceita/recusa exatamente a versão atual e confirma recebimento somente após enviado/pronto_retirada. Toda ação exige versão; conflito/duplicata retorna 409, sem repetir evento ou notificação. Transação bloqueia pedido, preserva snapshot inicial e registra auditoria/notificação. Frete e total só são confirmados com proposta aceita; proposta não aceita não vira cobrança. Conclusão de todos os grupos marca concluido. Não altera status_pagamento, não cobra, não consulta rastreamento, não reserva estoque. Pedidos antigos com grupo válido ganham acompanhamento na primeira ação; sem grupo permanecem consultáveis.', limit: '60 atualizações/IP em 10 minutos, além do limite global. Somente participantes e papéis autorizados; nenhum override administrativo.' })
add('get', '/enderecos', 'Endereços', 'Listar meus endereços reutilizáveis', { output: arr(ref('DocEndereco')), description: 'Agenda única para origem de anúncios e destino de compras. Somente proprietário, principal primeiro. Não retorna excluídos ou endereços salvos apenas para uma compra.' })
add('post', '/enderecos', 'Endereços', 'Cadastrar endereço privado', { code: 201, errors: [400, 409], input: body(addressFields, addressRequired), output: ref('DocEndereco'), description: 'Validação de campos no servidor; erros específicos em erros. Retentativa com os mesmos dados recupera o registro existente. Até 30 endereços ativos por conta.' })
add('put', '/enderecos/{id}', 'Endereços', 'Editar endereço e invalidar confirmação', { errors: [400, 404, 409], input: body({ ...addressFields, versao: id }, [...addressRequired, 'versao']), output: ref('DocEndereco'), description: 'Somente proprietário. Aumenta versão e invalida confirmação e frete em checkouts antigos. Pedidos anteriores permanecem intactos.' })
add('delete', '/enderecos/{id}', 'Endereços', 'Excluir endereço preservando pedidos', { errors: [400, 404], description: 'Exclusão lógica pelo proprietário, invalidando utilização em novas compras.' })
add('post', '/enderecos/{id}/confirmar', 'Endereços', 'Confirmar revisão dos dados da conta', { errors: [400, 404, 409], input: body({ versao: id }, ['versao']), output: ref('DocEndereco'), description: 'Revisão declarada pelo usuário, não comprovação de residência. Cada checkout exige sua própria confirmação.' })
add('post', '/enderecos/{id}/principal', 'Endereços', 'Definir endereço principal', { errors: [400, 404] })
add('get', '/enderecos/cep/{cep}', 'Endereços', 'Consultar CEP no ViaCEP', { errors: [400, 404, 503], output: obj({ cep: text, uf: text, cidade: text, bairro: text, logradouro: text }), description: 'Autenticado. Consulta HTTPS com timeout de 5 segundos. 503 permite preenchimento manual. Envia somente CEP ao serviço.' })
add('post', '/checkout', 'Checkout', 'Iniciar checkout persistente', { errors: [400, 409], input: body({ itens: { ...arr(obj({ produto_id: id, quantidade: int('Quantidade', { minimum: 1, maximum: 99 }) }, ['produto_id', 'quantidade'])), minItems: 1, maxItems: 20 } }, ['itens']), output: ref('DocCheckout'), description: 'Preços, estoque, vendedores e exigência de entrega vêm do servidor. Expira em 24 horas.' })
add('get', '/checkout/{id}', 'Checkout', 'Restaurar meu checkout', { errors: [400, 404, 409], output: ref('DocCheckout'), description: 'Revalida endereço, versão, regras de entrega e preços. Checkout concluído retorna id, pedido_id, status e frete_pendente do acompanhamento atual, sem reaplicar a tarifa original sobre um acordo já aceito.' })
add('put', '/checkout/{id}/endereco', 'Checkout', 'Selecionar e confirmar endereço para esta compra', { errors: [400, 404, 409], input: body({ endereco_id: id, versao: id, confirmado: bool }, ['endereco_id', 'versao', 'confirmado']), output: ref('DocCheckout'), description: 'Exige confirmado=true após revisão. Valida proprietário e versão, registra confirmação e limpa frete anterior.' })
add('put', '/checkout/{id}/entrega', 'Checkout', 'Selecionar modalidades por vendedor e origem', { errors: [400, 404, 409], input: body({ modalidades: arr(obj({ grupo_id: text, vendedor_id: id, id: text }, ['vendedor_id', 'id'])) }, ['modalidades']), output: ref('DocCheckout'), description: 'Uma seleção explícita por grupo vendedor/origem. grupo_id é obrigatório se o vendedor tiver várias origens. SHIPPING_RULES_JSON restringe cobertura/tarifas. Sem tarifa aplicável e com origem válida, oferece id a-combinar, tipo a_combinar e valor null: solicitação, não entrega confirmada nem frete grátis. Permite registrar pedido com frete_pendente=true e total/frete null. Tarifas explícitas existentes são preservadas, inclusive zero. Origem ausente continua bloqueando. Não calcula distância nem consulta transportadora. Valores/tipo enviados pelo cliente são ignorados. Mudar origem invalida o carrinho; mudar tarifa após seleção exige nova revisão.' })
add('post', '/checkout/{id}/pagamento', 'Checkout', 'Verificar acesso à etapa de pagamento', { errors: [400, 404, 409], output: ref('DocCheckout'), description: 'Revalida endereço e frete no servidor. Como não há provedor integrado, retorna disponivel=false e mensagem explicativa. Não cobra nem marca pedido como pago.' })

add('post', '/mensagens', 'Mensagens', 'Enviar mensagem privada', {
  code: 201, errors: [400, 404], input: body({ destinatarioId: { ...id, minimum: 1 }, conteudo: str('Mensagem não vazia, truncada em 2000 caracteres', { minLength: 1, maxLength: 2000 }), produtoId: { ...id, nullable: true } }, ['destinatarioId', 'conteudo']),
  output: obj({ sucesso: bool, mensagem: text, id }), description: 'Destinatário deve existir e ser outro usuário. Se houver bloqueio em qualquer direção, retorna 403 sem inserir mensagem ou notificação. produtoId é opcional: conversas diretas não precisam de anúncio. Remetente vem exclusivamente do JWT. Cria mensagem e notificação para o destinatário.'
})
add('get', '/mensagens/conversas', 'Mensagens', 'Listar minhas conversas', { output: arr(obj({ partner_id: id, partner_username: text, partner_nome: { ...text, nullable: true }, partner_foto: { ...text, nullable: true }, last_message: text, last_message_date: text, last_sender_id: id, unread_count: int('Não lidas') })) })
add('get', '/mensagens/nao-lidas/total', 'Mensagens', 'Contar minhas mensagens não lidas', { output: obj({ totalNaoLidas: int('Total não lido') }) })
add('get', '/mensagens/{outroUsuarioId}', 'Mensagens', 'Consultar página do histórico com outro usuário', { errors: [400, 404], parameters: [query('limit', int('Limite padrão 40, máximo 100', { minimum: 1, maximum: 100, default: 40 })), query('antes', id), query('depois', id)], description: 'Cursor por ID, ordenação crescente na resposta. Sem cursor retorna mensagens recentes; antes carrega histórico e depois busca novidades. Cursores são mutuamente exclusivos. Somente mensagens do par autenticado. lidas_ate é o maior ID enviado pela conta cuja leitura foi confirmada pelo parceiro.', output: obj({ parceiro: obj({ id_usuario: id, username: text, nome: { ...text, nullable: true }, foto: { ...text, nullable: true } }), mensagens: arr(ref('DocMensagem')), lidas_ate: int('Última mensagem enviada e lida; zero se ausente'), paginacao: obj({ limite: id, cursor_anterior: { ...id, nullable: true }, cursor_posterior: { ...id, nullable: true }, tem_anteriores: bool, tem_mais: bool }) }) })
add('put', '/mensagens/{outroUsuarioId}/lidas', 'Mensagens', 'Marcar mensagens recebidas desse usuário como lidas', { errors: [400], description: 'JSON opcional com ate_id limita a leitura às mensagens já recebidas pelo cliente. Sem campo marca todo o histórico.', input: { ...body({ ate_id: id }, []), required: false }, output: obj({ sucesso: bool, mensagem: text }) })

add('post', '/upload/imagem', 'Uploads', 'Enviar uma imagem', {
  errors: [400], limit: uploadLimit,
  input: { required: true, content: { 'multipart/form-data': { schema: obj({ imagem: binary }, ['imagem']) } } },
  output: obj({ sucesso: bool, url: text, filename: text, tamanho: int('Bytes'), tipo: text }),
  description: 'Campo imagem. JPG/JPEG, PNG ou WEBP, até 5 MiB. Grava arquivo real no servidor.'
})
add('post', '/upload/imagens', 'Uploads', 'Enviar até oito imagens', {
  errors: [400], limit: uploadLimit,
  input: { required: true, content: { 'multipart/form-data': { schema: obj({ imagens: { ...arr(binary), minItems: 1, maxItems: 8 } }, ['imagens']) } } },
  output: obj({ sucesso: bool, urls: arr(text), arquivos: arr(ref('DocArquivo')), total: int('Total') }),
  description: 'Campo imagens repetido por arquivo. JPG/JPEG, PNG ou WEBP, até 5 MiB por arquivo. Grava arquivos reais.'
})
add('post', '/upload/imagem-base64', 'Uploads', 'Enviar imagem codificada em base64', {
  errors: [400], limit: uploadLimit, input: body({ imagem: str('Data URI completa: data:image/png;base64,...; jpeg, jpg, png ou webp') }, ['imagem']),
  output: obj({ sucesso: bool, url: text, filename: text, tamanho: int('Bytes') }),
  description: 'Imagem decodificada até 5 MiB e corpo JSON até 6 MB (a expansão base64 pode atingir o limite JSON antes). Grava arquivo real.'
})
add('post', '/upload/imagem-url', 'Uploads', 'Validar referência de imagem externa', {
  errors: [400], limit: uploadLimit, input: body({ url: str('URL HTTP/HTTPS de imagem jpg, jpeg, png ou webp; também aceita URL contendo /uploads/', { format: 'uri' }) }, ['url']),
  output: obj({ sucesso: bool, url: text, tipo: str('Tipo', { enum: ['url_externa'] }) }),
  description: 'Valida e devolve a referência; não baixa nem grava a imagem remota.'
})
add('delete', '/upload/imagem/{filename}', 'Uploads', 'Excluir arquivo enviado', {
  errors: [400, 404], limit: uploadLimit, output: obj({ sucesso: bool, mensagem: text }),
  description: 'Ação destrutiva: remove fisicamente o arquivo da pasta uploads. Requer autenticação. Envie apenas o nome do arquivo, não uma URL. Utilize exclusivamente arquivo de teste que você possa excluir.'
})
add('get', '/', 'Status', 'Consultar identificação da API', { auth: false, output: obj({ servico: text, status: text, health: text }) })
add('get', '/health', 'Status', 'Consultar saúde da API e conexão com banco', {
  auth: false, output: obj({ status: text, api: text, banco: text, tipoBanco: text, timestamp: str('Instante da consulta', { format: 'date-time' }) }),
  description: 'Verifica conexão com banco. Retorna 200 se conectado ou 503 se indisponível.'
})
paths['/health'].get.responses[503] = { description: 'API online, mas conexão com banco indisponível.', content: json(paths['/health'].get.responses[200].content['application/json'].schema) }

add('get', '/passaportes', 'Passaportes', "Listar equipamentos da conta", {"auth":true,"code":200,"errors":[400,404,409],"description":"", output: {"type":"array","items":{"$ref":"#/components/schemas/PassaporteResumo"}} })
add('post', '/passaportes', 'Passaportes', "Cadastrar equipamento privado", {"auth":true,"code":201,"errors":[400,404,409],"description":"", input: { required: true, content: json({"$ref":"#/components/schemas/PassaporteEquipamento"}) } , output: {"type":"object","properties":{"id":{"type":"integer","minimum":1},"mensagem":{"type":"string"}},"required":["id"]} })
add('post', '/passaportes/receber', 'Passaportes', "Aceitar transferência destinada à conta autenticada", {"auth":true,"code":200,"errors":[400,404,409],"description":"Código de uso único, armazenado por hash e válido por 24 horas. Somente o destinatário indicado pode aceitar. Revoga o link público e remove o acesso do antigo proprietário. A transferência não comprova uma compra nem movimenta valores.", input: { required: true, content: json({"type":"object","properties":{"codigo":{"type":"string","pattern":"^[a-f0-9]{64}$"}},"required":["codigo"]}) } , output: {"type":"object","properties":{"id":{"type":"integer","minimum":1},"mensagem":{"type":"string"}},"required":["id"]} })
add('get', '/passaportes/publico/{codigo}', 'Passaportes', "Consultar ficha compartilhada", {"auth":false,"code":200,"errors":[400,404,409],"description":"Link opcional e revogável com código aleatório. Mostra componentes e histórico sem dados da conta, contatos, IDs de contratação ou segredos de transferência. Registros manuais são declarações do dono; o vínculo de serviços ao equipamento é declarado pelo proprietário. Não equivale a laudo. Respostas não são armazenadas em cache.", output: {"$ref":"#/components/schemas/PassaportePublico"} })
add('get', '/passaportes/{id}', 'Passaportes', "Consultar ficha e histórico completos da própria conta", {"auth":true,"code":200,"errors":[400,404,409],"description":"", output: {"$ref":"#/components/schemas/PassaporteDetalhe"} })
add('put', '/passaportes/{id}', 'Passaportes', "Atualizar ficha e registrar alteração no histórico", {"auth":true,"code":200,"errors":[400,404,409],"description":"", input: { required: true, content: json({"$ref":"#/components/schemas/PassaporteEquipamento"}) } , output: {"type":"object","properties":{"mensagem":{"type":"string"}}} })
add('delete', '/passaportes/{id}', 'Passaportes', "Excluir ficha, histórico e convites do próprio equipamento", {"auth":true,"code":200,"errors":[400,404,409],"description":"Exclusão definitiva com remoção dos registros associados. Só o proprietário pode excluir.", output: {"type":"object","properties":{"mensagem":{"type":"string"}}} })
add('post', '/passaportes/{id}/registros', 'Passaportes', "Registrar manutenção ou upgrade manual", {"auth":true,"code":201,"errors":[400,404,409],"description":"Data válida de 1970 em diante, sem data futura. Registros são imutáveis e identificados como manuais. Não incluir informações pessoais.", input: { required: true, content: json({"type":"object","properties":{"tipo":{"type":"string","enum":["manutencao","upgrade","reparo","inspecao"]},"titulo":{"type":"string","minLength":5,"maxLength":180},"data":{"type":"string","format":"date"}},"required":["tipo","titulo","data"]}) } , output: {"type":"object","properties":{"mensagem":{"type":"string"}}} })
add('post', '/passaportes/{id}/servicos', 'Passaportes', "Vincular serviço concluído contratado pelo dono", {"auth":true,"code":201,"errors":[400,404,409],"description":"Confere cliente e conclusão no servidor. Cada contratação pode pertencer a apenas um passaporte. Copia título, data de conclusão e fim da garantia sem copiar escopo ou dados pessoais. A associação ao equipamento é declarada pelo dono.", input: { required: true, content: json({"type":"object","properties":{"contratacao_id":{"type":"integer","minimum":1}},"required":["contratacao_id"]}) } , output: {"type":"object","properties":{"mensagem":{"type":"string"}}} })
add('post', '/passaportes/{id}/compartilhamento', 'Passaportes', "Ativar ou renovar link de consulta", {"auth":true,"code":200,"errors":[400,404,409],"description":"A ativação permite consulta a qualquer pessoa com o código. Gerar outro link invalida o anterior.", output: {"type":"object","properties":{"codigo":{"type":"string","pattern":"^[a-f0-9]{64}$"},"mensagem":{"type":"string"}},"required":["codigo"]} })
add('delete', '/passaportes/{id}/compartilhamento', 'Passaportes', "Revogar link público", {"auth":true,"code":200,"errors":[400,404,409],"description":"", output: {"type":"object","properties":{"mensagem":{"type":"string"}}} })
add('post', '/passaportes/{id}/transferencia', 'Passaportes', "Gerar convite para um destinatário específico", {"auth":true,"code":200,"errors":[400,404,409],"description":"Destinatário deve ser outra conta existente. Convite válido por 24 horas, substitui convite anterior. Compartilhe o código apenas com a conta indicada. O dono mantém acesso até o aceite.", input: { required: true, content: json({"type":"object","properties":{"username":{"type":"string","minLength":3,"maxLength":30}},"required":["username"]}) } , output: {"type":"object","properties":{"codigo":{"type":"string","pattern":"^[a-f0-9]{64}$"},"expira_em":{"type":"string","format":"date-time"},"mensagem":{"type":"string"}},"required":["codigo","expira_em"]} })
add('delete', '/passaportes/{id}/transferencia', 'Passaportes', "Cancelar convite de transferência", {"auth":true,"code":200,"errors":[400,404,409],"description":"", output: {"type":"object","properties":{"mensagem":{"type":"string"}}} })

const componentType = str('Categoria técnica', { enum: ['processador', 'placa_mae', 'memoria'] })
const componentStatus = str('Revisão editorial', { enum: ['rascunho', 'verificado'] })
const compatibilityStatus = str('Conclusão das regras', { enum: ['compativel', 'incompativel', 'condicional', 'nao_verificado'] })
const componentFields = {
  slug: str('Identificador permanente', { pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$', maxLength: 140 }), tipo: componentType,
  marca: str('Fabricante', { maxLength: 60 }), modelo: str('Modelo exato', { maxLength: 140 }),
  especificacoes: { type: 'object', description: 'Campos variam por categoria; consulte docs/COMPATIBILIDADE.md. Campos ausentes ou null ficam não verificados.' },
  fontes: { ...arr(obj({ titulo: str('Título', { maxLength: 140 }), url: str('Fonte HTTPS do fabricante', { format: 'uri', maxLength: 600 }) }, ['titulo', 'url'])), maxItems: 8 }, status: componentStatus, ativo: bool
}
schemas.DocComponente = obj({ id, ...componentFields, revisao: id, revisado_em: str('Última revisão', { format: 'date-time' }) })
schemas.DocSelecaoComponentes = obj({ processador_id: { ...id, nullable: true }, placa_mae_id: { ...id, nullable: true }, bios: str('BIOS instalada informada pelo usuário', { nullable: true, pattern: '^\\d{4}$' }), memorias: { ...arr(obj({ componente_id: id, quantidade: int('Quantidade de kits', { minimum: 1, maximum: 4, default: 1 }) }, ['componente_id'])), maxItems: 4 } }, ['memorias'])
schemas.DocCompatibilidade = obj({ status: compatibilityStatus, metodo: str('Método', { enum: ['regras'] }), verificado_em: str('Instante da análise', { format: 'date-time' }), selecao: ref('DocSelecaoComponentes'), componentes: arr(ref('DocComponente')), verificacoes: arr(obj({ codigo: text, status: compatibilityStatus, titulo: text, mensagem: text, componentes: arr(id), fontes: componentFields.fontes })), memoria_total_gb: { ...id, nullable: true }, modulos_total: { ...id, nullable: true }, limites: arr(text), observacoes: arr(text) })
add('get', '/componentes', 'Compatibilidade', 'Consultar modelos ativos revisados', { auth: false, errors: [400], parameters: [query('tipo', componentType), query('busca', str('Marca ou modelo', { maxLength: 100 }))], output: obj({ items: arr(ref('DocComponente')), limite: int('Até 100 resultados') }) })
add('post', '/componentes/verificar', 'Compatibilidade', 'Comparar processador, placa-mãe e memória pelas regras técnicas', { auth: false, errors: [400], input: { required: true, content: json(ref('DocSelecaoComponentes')) }, output: ref('DocCompatibilidade'), description: 'Conclusão calculada por regras, independente da IA opcional. Dados ausentes, inativos ou não revisados não aprovam uma combinação. BIOS pendente pode exigir atualização. Não certifica QVL, velocidade, overclock, GPU, fonte, gabinete, cooler ou peças usadas. Resposta sem cache.' })
schemas.DocEstadoIA = obj({ disponivel: bool, provedor: str('Execução configurada', { enum: ['disabled', 'ollama', 'groq', 'gemini'] }), modelo: { ...text, nullable: true }, externo: bool, mensagem: text })
schemas.DocExplicacaoIA = obj({ provedor: str('Provedor', { enum: ['ollama', 'groq', 'gemini'] }), modelo: text, gerado_em: str('Geração da explicação', { format: 'date-time' }), em_cache: bool, resumo: str('Resumo em linguagem simples', { maxLength: 900 }), pontos: { ...arr(obj({ codigo: text, status: compatibilityStatus, titulo: text, mensagem: text, explicacao: str('Explicação', { maxLength: 700 }), acao: str('Próximo passo', { maxLength: 450 }) })), maxItems: 4 } })
add('get', '/componentes/ia/status', 'Compatibilidade', 'Consultar configuração da explicação por IA', { auth: false, output: ref('DocEstadoIA'), description: 'Ollama consulta apenas loopback e confere o modelo instalado. Groq informa configuração; a chave nunca é retornada. Não gera texto. Resposta sem cache HTTP; sondagem local reutilizada por 10 segundos.' })
add('post', '/componentes/ia/explicar', 'Compatibilidade', 'Explicar os requisitos técnicos com Gemini, Groq ou Ollama', { auth: false, errors: [400, 502, 503, 504], input: { required: true, content: json(ref('DocSelecaoComponentes')) }, output: obj({ verificacao: ref('DocCompatibilidade'), ia: ref('DocExplicacaoIA') }), description: 'Aceita somente seleção/BIOS, até 4 KB. Recalcula as regras e consulta as fichas atuais no servidor; não aceita chave, resultado, prompt, URL ou modelo enviados pelo cliente. Credenciais são lidas somente do ambiente do servidor e nunca retornadas. IA não muda a conclusão. Respostas com status/códigos divergentes são rejeitadas. Nenhum perfil, passaporte ou token é enviado ao provedor. Cache interno de até 50 explicações por 10 minutos, considerando fichas e revisões. Não há fallback para outro provedor.', limit: '8 solicitações por IP em 10 minutos, além da cota global. Uma geração local ou duas externas simultâneas por processo. Falhas de cota retornam 429; timeout retorna 504 e não afeta a análise técnica.' })
const expandedType = str('Categoria do catálogo ampliado', { enum: ['processador', 'placa_mae', 'memoria', 'placa_video', 'armazenamento', 'fonte', 'gabinete', 'cooler'] })
const expandedId = str('ID estável do snapshot, não é ID do banco', { pattern: '^[a-f0-9]{20}$' })
schemas.DocCatalogoAmplo = obj({ fonte: str('Repositório da fonte', { format: 'uri' }), revisao: text, data_fonte: str('Data de atualização informada pela fonte', { format: 'date' }), licenca: text, total: int('Total de registros distintos'), categorias: arr(obj({ tipo: expandedType, nome: text, total: int('Total da categoria') })) })
schemas.DocPecaAmpla = obj({ id: expandedId, tipo: expandedType, modelo: text, especificacoes: { type: 'object', description: 'Campos originais da fonte; ausentes/null não foram inferidos. Não inclui preços.' } })
schemas.DocSelecaoAmpla = obj({ componentes: { ...arr(obj({ id: expandedId, quantidade: int('Kits de RAM ou unidades', { minimum: 1, maximum: 4 }) }, ['id', 'quantidade'])), minItems: 2, maxItems: 16 }, bios: str('BIOS declarada, sem dados pessoais', { maxLength: 40, pattern: '^[a-zA-Z0-9. _-]{0,40}$' }) }, ['componentes'])
schemas.DocAvaliacaoIA = obj({ status: compatibilityStatus, provedor: str('Provedor', { enum: ['gemini', 'groq', 'ollama'] }), modelo: text, gerado_em: str('Instante da geração', { format: 'date-time' }), em_cache: bool, resumo: str('Resumo da IA', { maxLength: 900 }), pontos: { ...arr(obj({ titulo: str('Título', { maxLength: 120 }), status: compatibilityStatus, explicacao: str('Explicação', { maxLength: 700 }), acao: str('Próximo passo', { maxLength: 450 }), componentes: arr(expandedId) })), minItems: 1, maxItems: 8 } })
add('get', '/componentes/catalogo/status', 'Compatibilidade', 'Consultar categorias e proveniência do catálogo ampliado', { auth: false, output: ref('DocCatalogoAmplo'), description: 'Snapshot público versionado, independente de MySQL/Neon. Não promete todos os modelos existentes. Dados comunitários, não revisados individualmente. Cache público de uma hora.' })
add('get', '/componentes/catalogo', 'Compatibilidade', 'Pesquisar componentes no catálogo ampliado paginado', { auth: false, errors: [400], parameters: [{ ...query('tipo', expandedType), required: true }, query('busca', str('Termos por nome ou especificação, sem acentos', { maxLength: 100 })), query('pagina', int('Página', { minimum: 1, maximum: 99999, default: 1 }))], output: obj({ items: arr(ref('DocPecaAmpla')), pagina: id, limite: int('30 registros por página'), total: int('Total filtrado'), mais: bool, catalogo: ref('DocCatalogoAmplo') }), description: 'Busca no servidor, 30 registros por página; não descarrega o catálogo inteiro no celular. Sem banco e sem chamadas externas durante a consulta. Cache público de cinco minutos. IDs distintos do catálogo revisado usado em anúncios e passaportes.' })
add('post', '/componentes/ia/analisar', 'Compatibilidade', 'Avaliar seleção do catálogo ampliado somente com IA', { auth: false, errors: [400, 502, 503, 504], input: { required: true, content: json(ref('DocSelecaoAmpla')) }, output: obj({ ia: ref('DocAvaliacaoIA'), componentes: arr({ allOf: [ref('DocPecaAmpla'), obj({ quantidade: id })] }), catalogo: obj({ fonte: text, revisao: text, data_fonte: text }), limites: arr(text) }), description: 'Fluxo atual da tela /compatibilidade. Não executa o motor de regras nem acessa banco. Aceita somente IDs, quantidades e BIOS, até 4 KB. Rejeita IDs repetidos/desconhecidos e mais de uma CPU/placa-mãe/fonte/gabinete/cooler. RAM, vídeo e armazenamento permitem múltiplos modelos. O contexto vem do snapshot do servidor. Nenhum prompt, URL, chave, resultado pré-calculado ou perfil é aceito. Valida estrutura, cobertura das peças e coerência interna, mas não comprova a verdade técnica do texto. Lacunas devem ser indicadas pela IA; não é certificação. Resposta sem cache HTTP; cache interno por seleção/modelo/snapshot por dez minutos, até 50 entradas.', limit: 'Compartilha 8 solicitações/IP em dez minutos com /ia/explicar e limite global. Uma geração local ou duas externas simultâneas por processo; sem fallback automático. Credenciais exclusivamente no servidor.' })
add('get', '/componentes/admin', 'Compatibilidade', 'Consultar fichas e rascunhos como administrador', { admin: true, output: arr(ref('DocComponente')) })
add('post', '/componentes/admin', 'Compatibilidade', 'Cadastrar ficha técnica', { admin: true, code: 201, errors: [400, 409], input: body(componentFields, Object.keys(componentFields)), output: obj({ id, mensagem: text }), description: 'A publicação como verificado exige ao menos uma fonte HTTPS. Não consulta nem extrai páginas externas automaticamente.' })
add('put', '/componentes/admin/{id}', 'Compatibilidade', 'Revisar ou desativar ficha técnica', { admin: true, errors: [400, 404, 409], input: body({ ...componentFields, revisao: id }, [...Object.keys(componentFields), 'revisao']), description: 'slug e tipo são permanentes. A revisão evita sobrescrever alterações de outra sessão; conflito retorna 409. Desativar preserva associações históricas e impede novas aprovações.' })

const certificateChecks = obj(Object.fromEntries(['funcionamento', 'integridade', 'temperatura', 'armazenamento', 'bateria'].map(key => [key, str('Resultado do teste', { enum: ['funcionamento', 'integridade'].includes(key) ? ['aprovado', 'reprovado'] : ['aprovado', 'reprovado', 'nao_aplicavel'] })])), ['funcionamento', 'integridade', 'temperatura', 'armazenamento', 'bateria'])
schemas.DocCertificado = obj({ id, passaporte_id: id, produto_id: id, contratacao_id: id, status: str('Situação efetiva', { enum: ['pendente', 'emitido', 'reprovado', 'revogado', 'expirado', 'desatualizado'] }), papel: text, equipamento: { type: 'object' }, produto_nome: text, checklist: { ...certificateChecks, nullable: true }, laudo: { ...text, nullable: true }, emitido_em: { ...text, nullable: true }, expira_em: { ...text, nullable: true } })
schemas.DocCombo = obj({ id, produto_id: id, servico_id: id, criador_id: id, titulo: text, descricao: text, ativo: { oneOf: [bool, int('Booleano MySQL')] }, produto_nome: text, produto_preco: money, servico_titulo: text, servico_slug: text, preco_base: { ...money, nullable: true }, tipo_preco: text, modalidade: modality, regiao: { ...text, nullable: true }, total_estimado: { ...money, nullable: true } })
const missionSchema = obj({ id: text, titulo: text, descricao: text, categorias: arr(text), servico: text })
add('get', '/certificados/produto/{id}', 'Certificados', 'Consultar selo válido do anúncio', { auth: false, errors: [400], output: obj({ certificado: { type: 'object', nullable: true, properties: { id, checklist: certificateChecks, laudo: text, emitido_em: text, expira_em: text, equipamento: obj({ nome: text, tipo: text, modelo: text }), aviso: text } } }), description: 'Somente laudo emitido, não expirado, com anúncio aprovado e ficha/dono inalterados. Não expõe IDs de contas, tokens de compartilhamento, histórico privado ou dados da contratação. null quando não há selo válido; sem cache.' })
add('get', '/certificados', 'Certificados', 'Listar inspeções próprias ou como prestador', { output: obj({ itens: arr(ref('DocCertificado')), criterios: { type: 'object', additionalProperties: text } }), description: 'Até 100 registros; ficha da solicitação é snapshot, não revela alterações privadas posteriores. Não expõe ficha_hash.' })
add('post', '/certificados', 'Certificados', 'Solicitar inspeção de usado', { code: 201, errors: [400, 404, 409], input: body({ passaporte_id: id, produto_id: id, contratacao_id: id, produto_usado: { ...bool, enum: [true] } }, ['passaporte_id', 'produto_id', 'contratacao_id', 'produto_usado']), output: obj({ id, mensagem: text }), description: 'Exige propriedade do passaporte e anúncio aprovado, atendimento concluído como cliente, já vinculado ao passaporte e prestador diferente do dono. Um pedido pendente por produto. Revoga emissão anterior do anúncio e notifica o prestador.' })
add('post', '/certificados/{id}/laudo', 'Certificados', 'Responder inspeção como prestador responsável', { errors: [400, 404, 409], input: body({ checklist: certificateChecks, laudo: str('Laudo público com método, medições e justificativas; sem dados pessoais', { minLength: 20, maxLength: 2000 }), confirmo_inspecao: { ...bool, enum: [true] } }, ['checklist', 'laudo', 'confirmo_inspecao']), description: 'Somente prestador da solicitação pendente. Revalida dono, ficha e aprovação sob transação. Critério reprovado impede selo; caso contrário emite por 90 dias. Grava histórico e notificação. Não é certificação oficial ou garantia financeira.' })
add('delete', '/certificados/{id}', 'Certificados', 'Revogar solicitação ou selo', { errors: [400, 404], description: 'Somente solicitante ou prestador responsável. Revogação retira selo e notifica a outra parte.' })
add('get', '/combos', 'Combos', 'Listar combos disponíveis', { auth: false, errors: [400], parameters: [query('produto_id', id)], output: arr(ref('DocCombo')), description: 'Até 60; anúncios aprovados com estoque, serviço ativo e propriedade comum. Total estimado não inclui frete e pode ser null. Sem cache.' })
add('get', '/combos/opcoes', 'Combos', 'Listar meus anúncios e serviços elegíveis', { output: obj({ produtos: arr(obj({ id_produto: id, nome: text })), servicos: arr(obj({ id_servico: id, titulo: text })) }), description: 'Até 100 anúncios aprovados e 100 serviços ativos da conta.' })
add('get', '/combos/meus', 'Combos', 'Gerenciar meus combos, inclusive desativados', { output: arr(ref('DocCombo')), description: 'Até 100 registros do criador; indisponibilidade pública não remove histórico.' })
add('post', '/combos', 'Combos', 'Associar produto e instalação/configuração', { code: 201, errors: [400, 403, 409], input: body({ produto_id: id, servico_id: id, titulo: str('Título', { minLength: 5, maxLength: 120 }), descricao: str('Escopo e requisitos', { minLength: 20, maxLength: 2000 }) }, ['produto_id', 'servico_id', 'titulo', 'descricao']), output: obj({ id, mensagem: text }), description: 'Ambos precisam pertencer à conta. Anúncio aprovado e serviço ativo; duplicata ativa retorna 409. Não cria cobrança ou reserva.' })
add('delete', '/combos/{id}', 'Combos', 'Desativar combo próprio', { errors: [400, 404], description: 'Mantém snapshots nas contratações anteriores.' })
add('get', '/missoes', 'Missões', 'Consultar objetivos predefinidos', { auth: false, output: arr(missionSchema) })
add('post', '/missoes/recomendar', 'Missões', 'Montar três alternativas por orçamento', { auth: false, errors: [400], input: body({ missao: str('Objetivo', { enum: ['estudar', 'home-office', 'wifi'] }), orcamento: num('Orçamento de referência em reais', { minimum: 1, maximum: 1000000 }) }, ['missao', 'orcamento']), output: obj({ missao: missionSchema, orcamento: money, regras: arr(text), faixas: arr(obj({ faixa: text, teto_produtos: money, produtos: arr({ type: 'object' }), servico: { type: 'object', nullable: true }, faltantes: arr(text), total_estimado: money, completo: bool, consumo_estimado: { type: 'number', nullable: true } })) }), description: 'Regras por categoria e preço: 50/75/100% do saldo após serviço de menor preço-base. Até 100 anúncios aprovados/com estoque por categoria, até 100 serviços ativos. Não infere desempenho/compatibilidade/cobertura/consumo pelo preço. Retorna lacunas sem inventar produtos; sem frete, reserva ou contratação automática. Sem API paga e sem cache.' })

add('get', '/avaliacoes/elegibilidade/{id}', 'Avaliações', 'Verificar compra concluída para avaliação', { errors: [400], output: obj({ permitido: bool, mensagem: text }), description: 'Apenas a própria conta. Consulta pedido concluído com produto e recebimentos confirmados. Não divulga identificadores dos pedidos.' })
add('get', '/favoritos', 'Favoritos', 'Listar meus anúncios favoritos', { output: obj({ itens: arr(ref('Produto')), limite: int('Máximo de 200 anúncios') }), description: 'Somente favoritos da conta autenticada, até 200 mais recentes e aprovados. Sem endereço de origem privado.' })
add('put', '/favoritos/{id}', 'Favoritos', 'Salvar anúncio favorito', { errors: [400, 404], description: 'Idempotente. Exige anúncio aprovado. Não aceita usuario_id do cliente.' })
add('delete', '/favoritos/{id}', 'Favoritos', 'Remover meu favorito', { errors: [400], description: 'Idempotente; remove somente o favorito da conta autenticada.' })
add('get', '/bloqueios', 'Moderação', 'Listar usuários bloqueados por mim', { output: obj({ itens: arr(obj({ bloqueado_id: id, username: text })) }) })
add('put', '/bloqueios/{id}', 'Moderação', 'Bloquear novas mensagens com usuário', { errors: [400, 404], description: 'Idempotente; proíbe bloquear a própria conta. Impede envio nas duas direções e preserva histórico/pedidos. Limite de 30 ações a cada 15 minutos.' })
add('delete', '/bloqueios/{id}', 'Moderação', 'Remover meu bloqueio', { errors: [400], description: 'Idempotente. Não remove bloqueios feitos pela outra conta.' })
add('post', '/denuncias', 'Moderação', 'Denunciar anúncio, usuário ou mensagem recebida', { code: 201, errors: [400, 404, 409], input: body({ tipo: str('Alvo', { enum: ['produto', 'usuario', 'mensagem'] }), alvo_id: id, motivo: str('Motivo', { enum: ['fraude', 'conteudo_inadequado', 'assedio', 'spam', 'outro'] }), detalhes: str('Descrição sem dados pessoais desnecessários', { minLength: 10, maxLength: 2000 }) }, ['tipo', 'alvo_id', 'motivo', 'detalhes']), output: obj({ id, mensagem: text }), description: 'Mensagens somente se recebidas pela conta. Anúncios precisam estar aprovados e pertencer a outra conta. Evidência privada para administração; duplicata aberta retorna 409. Limite de 30 ações a cada 15 minutos. Não remove conteúdo automaticamente.' })
add('get', '/admin/denuncias', 'Moderação', 'Consultar fila e histórico privado de denúncias', { admin: true, errors: [400], parameters: [query('status', str('Filtro', { enum: ['aberta', 'em_analise', 'resolvida', 'arquivada'], default: 'aberta' }))], output: obj({ itens: arr(obj({ id, denunciante_id: id, tipo: text, alvo_id: id, motivo: text, detalhes: text, evidencia: text, status: text, decisao: { ...text, nullable: true }, moderador_id: { ...id, nullable: true }, created_at: text, updated_at: text, historico: arr(obj({ id, denuncia_id: id, moderador_id: id, status: text, justificativa: text, created_at: text })) })), limite: int('Até 100 denúncias mais recentes') }), description: 'Somente administrador validado no banco. Evidência nunca é retornada em endpoint público.' })
add('patch', '/admin/denuncias/{id}', 'Moderação', 'Registrar decisão de moderação', { admin: true, errors: [400, 404], input: body({ status: str('Decisão', { enum: ['em_analise', 'resolvida', 'arquivada'] }), justificativa: str('Justificativa', { minLength: 10, maxLength: 2000 }) }, ['status', 'justificativa']), description: 'Atualiza status e acrescenta evento com administrador, justificativa e data na mesma transação. Histórico anterior preservado; não remove anúncios automaticamente.' })

add('get', '/produtos/mapa', 'Produtos', 'Listar IDs de anúncios aprovados para sitemap', { auth: false, errors: [400, 503], parameters: [query('pagina', int('Página de até 1000 IDs', { minimum: 1, maximum: 100000, default: 1 }))], output: obj({ pagina: id, paginas: int('Total de páginas'), total: int('Anúncios aprovados'), itens: arr(obj({ id_produto: id })) }), description: 'Apenas identificadores públicos aprovados, sem descrições nem endereços privados. Cache público de cinco minutos.' })
add('post', '/componentes/verificar-basico', 'Compatibilidade', 'Verificar requisitos com regras sem IA e sem banco', { auth: false, errors: [400], input: body({ componentes: arr(obj({ id: text, quantidade: int('Quantidade', { minimum: 1, maximum: 4 }) }, ['id', 'quantidade'])), bios: str('BIOS opcional', { maxLength: 40 }) }, ['componentes']), output: obj({ status: text, metodo: text, verificacoes: arr(obj({ codigo: text, status: text, titulo: text, mensagem: text, fontes: arr(obj({ titulo: text, url: text })) })), limites: arr(text), componentes: arr({ type: 'object' }), catalogo: { type: 'object' }, memoria_total_gb: { type: 'number', nullable: true }, modulos_total: { type: 'integer', nullable: true } }), description: 'Mesmo formato de seleção do catálogo ampliado: 2 a 16 IDs, até 4 unidades. Socket/BIOS apenas com nome exato único e ficha local revisada. Geração DDR, módulos e capacidade usam campos disponíveis; ausência ou ambiguidade permanece não verificada. Nenhuma chamada a IA ou banco.' })

const tags = ['Favoritos', 'Moderação', 'Certificados', 'Combos', 'Missões', 'Compatibilidade', 'Passaportes', 'Administração', 'Recuperação de senha', 'Perfil', 'Notificações', 'Avaliações', 'Serviços', 'Contratações', 'Pedidos', 'Mensagens', 'Uploads', 'Status'].map(name => ({ name }))

const listingFields = {
  titulo: str('Título do serviço', { minLength: 5, maxLength: 180 }), descricao: str('Descrição', { minLength: 30, maxLength: 5000 }),
  categoria: str('Categoria', { enum: ['montagem', 'manutencao', 'suporte', 'redes', 'dados', 'consultoria', 'programacao', 'design', 'audiovisual', 'fotografia', 'marketing', 'redacao', 'aulas'] }),
  modalidade: modality, tipo_preco: str('Forma de preço', { enum: ['fixo', 'a_partir_de', 'sob_consulta'] }), preco_base: { ...num('Positivo com duas casas; null para sob_consulta', { minimum: 0.01, maximum: 99999999.99, multipleOf: 0.01 }), nullable: true },
  prazo: str('Prazo estimado', { minLength: 3, maxLength: 80 }), regiao: str('Mínimo de 3 caracteres para presencial/híbrido; opcional para remoto', { maxLength: 120 }),
  destaques: arr(str('Destaque', { minLength: 2, maxLength: 120 })), entregaveis: str('O que será entregue', { minLength: 10, maxLength: 2000 }),
  criterios_aceite: str('Como conferir o resultado', { minLength: 10, maxLength: 2000 }), revisoes: int('Revisões incluídas', { minimum: 0, maximum: 20 }), politicas_versao: str('Versão aceita', { enum: ['2026-10-22'] })
}
listingFields.destaques.maxItems = 8
const listingVersion = int('Versão atual do anúncio, devolvida por meus/moderacao', { minimum: 0 })
schemas.DocServicoGerenciado = obj({ ...schemas.DocServico.properties, entregaveis: text, criterios_aceite: text, revisoes: id, versao: listingVersion, status: str('Disponibilidade', { enum: ['ativo', 'pausado', 'arquivado'] }), status_aprovacao: approval, origem: text, revisao_pendente: { ...obj(listingFields), nullable: true }, motivo_reprovacao: { ...text, nullable: true }, politicas_versao: { ...text, nullable: true } })
Object.assign(schemas.DocServico.properties, { entregaveis: { ...text, nullable: true }, criterios_aceite: { ...text, nullable: true }, revisoes: int('Revisões incluídas', { minimum: 0 }) })
schemas.DocContratacao.properties.servico_snapshot = { type: 'object', nullable: true, description: 'Cópia das condições do anúncio ao solicitar; não muda com edições posteriores. Para contratações antigas, copia o conteúdo disponível na migração.', properties: { titulo: text, descricao: { ...text, nullable: true }, categoria: text, preco_base: { ...num('Preço anunciado; orçamento final permanece separado'), nullable: true }, tipo_preco: text, prazo: text, modalidade: text, regiao: text, destaques: arr(text), entregaveis: { ...text, nullable: true }, criterios_aceite: { ...text, nullable: true }, revisoes: int('Revisões incluídas', { minimum: 0 }), politicas_versao: { ...text, nullable: true } } }
const listingDescription = 'Até 20 KB e 40 alterações/IP em 10 minutos. Qualquer usuário autenticado pode anunciar; proprietário vem da sessão e não pode ser informado no corpo. Campos extras são rejeitados. Pagamento externo. Respostas privadas sem cache.'
add('get', '/servicos/meus', 'Serviços', 'Consultar meus anúncios e revisões', { output: arr(ref('DocServicoGerenciado')), description: 'Até 100 anúncios da conta, incluindo exemplos antigos pausados. Somente o proprietário; sem cache.' })
add('post', '/servicos/meus', 'Serviços', 'Publicar oferta de serviço para aprovação', { code: 201, input: body(listingFields, Object.keys(listingFields)), output: obj({ id_servico: id, slug: text, mensagem: text }), errors: [400], description: listingDescription })
add('put', '/servicos/meus/{id}', 'Serviços', 'Enviar revisão do meu serviço', { input: body({ ...listingFields, versao: listingVersion }, [...Object.keys(listingFields), 'versao']), errors: [400, 404, 409], description: listingDescription + ' A versão pública permanece até a aprovação. Envie todos os campos e a versão atual; conflito retorna 409. Contratações guardam as condições originais.' })
add('patch', '/servicos/meus/{id}/status', 'Serviços', 'Pausar, ativar ou arquivar meu serviço', { input: body({ versao: listingVersion, status: str('Disponibilidade', { enum: ['ativo', 'pausado', 'arquivado'] }) }, ['versao', 'status']), errors: [400, 404, 409], description: listingDescription + ' Ativar exige aprovação e conteúdo próprio. Arquivamento é reversível e preserva as contratações.' })
add('get', '/servicos/moderacao', 'Serviços', 'Listar serviços para moderação', { admin: true, output: arr(ref('DocServicoGerenciado')), description: 'Até 100 anúncios com revisões pendentes primeiro. Inclui proposta e versão anterior para comparação; sem cache.' })
add('patch', '/servicos/moderacao/{id}', 'Serviços', 'Aprovar, reprovar revisão ou suspender serviço', { admin: true, input: body({ versao: listingVersion, decisao: str('Decisão', { enum: ['aprovar', 'reprovar', 'suspender'] }), motivo: str('Obrigatório para reprovar/suspender', { minLength: 5, maxLength: 500 }) }, ['versao', 'decisao']), errors: [400, 404, 409], description: listingDescription + ' Decisão e notificação na mesma transação. Reprovar revisão preserva versão anterior aprovada; suspender oculta o anúncio. Aprovação não reativa uma oferta pausada.' })
add('post', '/pedidos/{id}/entregas/{grupo}/codigo', 'Pedidos', 'Gerar código privado de recebimento para retirada', { input: body({ versao: listingVersion }, ['versao']), output: obj({ codigo: str('Código exibido somente nesta resposta ao comprador', { pattern: '^[0-9]{6}$' }), expira_em: str('Validade de 30 minutos', { format: 'date-time' }), mensagem: text }), errors: [400, 404, 409], description: 'Somente comprador do pedido, grupo pronto_retirada e versão atual. Um novo código invalida o anterior. Código aleatório com verificador HMAC; nunca aparece em histórico, listagem ou logs. Até 30 solicitações/IP em 10 minutos e 1 KB. Sem cache. Não confirma pagamento.' })
add('post', '/pedidos/{id}/entregas/{grupo}/recebimento', 'Pedidos', 'Vendedor valida código e registra recebimento da retirada', { input: body({ versao: listingVersion, codigo: str('Código recebido do comprador após a retirada', { pattern: '^[0-9]{6}$' }) }, ['versao', 'codigo']), output: ref('DocPedidoDetalhe'), errors: [400, 404, 409], description: 'Somente vendedor do próprio grupo pronto_retirada. Cinco códigos incorretos bloqueiam por 15 minutos e invalidam o código; gerar outro durante bloqueio é recusado. Contador persiste mesmo em falhas. Validação atômica, uso único, evento com autor vendedor e método; resposta contém somente a venda do participante. Não confirma pagamento nem impede denúncia posterior. Até 30 solicitações/IP em 10 minutos, 1 KB e cota global. Sem cache.' })
schemas.DocDenunciaInput = obj({ tipo: str('Alvo', { enum: ['produto', 'usuario', 'mensagem', 'servico', 'pedido', 'contratacao'] }), alvo_id: id, motivo: str('Motivo', { enum: ['fraude', 'conteudo_inadequado', 'assedio', 'spam', 'outro'] }), detalhes: str('Descrição', { minLength: 10, maxLength: 2000 }) }, ['tipo', 'alvo_id', 'motivo', 'detalhes'])
paths['/denuncias'].post.requestBody = { required: true, content: json(ref('DocDenunciaInput')) }
paths['/denuncias'].post.description += '\nServiços devem estar públicos e pertencer a outra conta. Pedidos e contratações exigem participação, inclusive após conclusão. Evidência de pedido contém somente os itens visíveis ao denunciante, sem códigos de recebimento ou endereços. Registro de denúncia não executa reembolso.'

const googleCredential = str('ID token assinado pelo Google, com o nonce do desafio; nunca registrar em logs', { maxLength: 8192 })
const googleFlow = 'Fluxo pelo mesmo domínio do site, sem cache. O desafio usa cookie HttpOnly/SameSite=Lax, nonce e validade de 10 minutos. JSON até 12 KB. O Google autentica a identidade; permissões da EHtech continuam no banco. ' + authLimit
add('get', '/auth/google/config', 'Autenticação', 'Consultar disponibilidade do Google', { auth: false, output: obj({ habilitado: bool, client_id: { ...text, nullable: true } }), description: 'Client ID é público; nenhum segredo é retornado. Desabilitado sem GOOGLE_CLIENT_ID válido.' })
add('post', '/auth/google/desafio', 'Autenticação', 'Iniciar tentativa de acesso pelo Google', { auth: false, input: body({ acao: str('entrar ou vincular', { enum: ['entrar', 'vincular'] }) }, ['acao']), output: obj({ nonce: text, expira_em: text }), errors: [400, 401, 403, 503], description: googleFlow + ' A ação vincular exige Bearer e vincula o desafio à conta autenticada. Retorna Set-Cookie; preserve-o na próxima requisição.' })
add('post', '/auth/google/entrar', 'Autenticação', 'Entrar, completar cadastro ou confirmar vínculo Google', { auth: false, input: body({ credential: googleCredential, nome: str('Nome público solicitado no primeiro cadastro ou em perfil Google antigo sem nome', { minLength: 2, maxLength: 80 }), username: str('Identificador opcional por compatibilidade; gerado internamente quando omitido', { minLength: 3, maxLength: 30 }), senha: str('Senha atual da EHtech para vincular conta existente', { maxLength: 1024 }) }, ['credential']), output: obj({ proxima_etapa: str('cadastro ou vincular quando incompleto'), token: text, username: text, nome: text, foto: text, email, userId: id, mensagem: text }), errors: [400, 401, 409, 503], description: googleFlow + ' Sucesso emite JWT normal e consome desafio atomicamente. Resposta sem token indica proxima_etapa: cadastro exige somente nome público; vincular exige senha atual. Mantém o cookie e reenvia credential. O cadastro só é criado após nome válido. Nunca une contas por e-mail sem senha. Identidade usa sub, não e-mail. Cinco senhas incorretas encerram o desafio.' })
add('post', '/auth/google/vincular', 'Autenticação', 'Vincular Google no perfil autenticado', { input: body({ credential: googleCredential, senha: str('Senha atual da EHtech', { maxLength: 1024 }) }, ['credential']), output: obj({ mensagem: text, proxima_etapa: text, email }), errors: [400, 409, 503], description: googleFlow + ' Exige desafio vincular da mesma conta e Google com mesmo e-mail. Sem senha, solicita proxima_etapa=vincular; com senha, registra vínculo único. Não concede papel administrativo.' })
add('get', '/auth/google/conta', 'Autenticação', 'Consultar meus meios de acesso', { output: obj({ vinculado: bool, senha_definida: bool, habilitado: bool }), errors: [503], description: 'Não expõe identificador Google, cookie ou credencial. Funciona mesmo se Google estiver desabilitado.' })
add('delete', '/auth/google/vinculo', 'Autenticação', 'Desvincular Google e encerrar sessões', { input: body({ senha: str('Senha atual da EHtech', { maxLength: 1024 }) }, ['senha']), errors: [400, 409], description: 'Exige senha utilizável e confirmação da senha atual. Impede remover o único meio de acesso. Remove somente vínculo local e revoga JWTs pela versão de sessão; não revoga consentimento no Google. ' + authLimit })

add('post', '/auth/google/redirecionar', 'Autenticação', 'Preparar redirecionamento para escolher conta Google', { auth: false, input: body({ acao: str('Ação', { enum: ['entrar', 'vincular'] }), destino: str('Destino interno após login', { maxLength: 1000 }) }, ['acao']), output: obj({ url: text }), errors: [400, 401, 403, 503], description: 'Exige Client ID, Client Secret e GOOGLE_REDIRECT_URI. Cria cookie HttpOnly/SameSite=Lax, nonce, state e PKCE S256 por dez minutos. Retorna URL fixa do Google com prompt=select_account, sem segredo ou verificador. A ação vincular exige Bearer. Destinos externos são substituídos por /perfil. ' + authLimit })
add('get', '/auth/google/callback', 'Autenticação', 'Receber retorno OAuth do Google', { auth: false, code: 303, parameters: [query('state', text), query('code', text), query('error', text)], description: 'Valida cookie, state e validade; consome state antes de trocar code via POST no endereço fixo Google com PKCE. Verifica ID token e nonce, guarda-o criptografado temporariamente e redireciona para /login/google sem credenciais na URL. Erros e cancelamento usam somente indicadores fixos. Não registrar query string deste endpoint. Referrer-Policy: no-referrer. ' + authLimit })
paths['/auth/google/callback'].get.responses[303] = { description: 'Retorna à página fixa /login/google, com indicador de erro opcional.', headers: { Location: { schema: { type: 'string' } } } }
add('get', '/auth/google/retorno', 'Autenticação', 'Consultar ação pendente após retorno Google', { auth: false, output: obj({ acao: text, destino: text }), errors: [401, 503], description: 'Exige cookie HttpOnly da tentativa com credencial já validada. Não devolve ID token, segredo, state ou verificador. Sem cache.' })
add('post', '/auth/google/concluir', 'Autenticação', 'Concluir login após redirecionamento e escolha do nome', { auth: false, input: body({ nome: str('Somente quando proxima_etapa=cadastro; nome público de 2 a 80 caracteres', { minLength: 2, maxLength: 80 }), senha: str('Somente para vincular conta existente', { maxLength: 1024 }) }, []), output: obj({ token: text, username: text, nome: text, foto: text, userId: id, destino: text, proxima_etapa: text, email, mensagem: text }), errors: [400, 401, 403, 409, 503], description: 'Exige cookie da tentativa; vincular no perfil exige também Bearer da conta de destino. Usa ID token temporário criptografado no servidor. Novos cadastros pedem somente nome público (proxima_etapa=cadastro, sem token); recebem identificador interno aleatório, foto padrão local de paisagem e sessão após nome válido. Perfis antigos com username gerado e sem nome recebem a mesma etapa, mantendo ID e foto personalizada. Próximos acessos entram diretamente. Nome não pode ser vazio nem conter marcação ou controles. Conta existente sem vínculo exige senha. Sucesso consome tentativa e dados temporários. Não une contas por coincidência de e-mail. ' + authLimit })

function extendSpecification(base) {
  // Preserva integralmente info, servers, segurança e operações anteriores.
  // Falha em colisões para não substituir documentação já existente silenciosamente.
  const mergedPaths = { ...base.paths }
  for (const [path, operations] of Object.entries(paths)) {
    for (const method of Object.keys(operations)) {
      if (base.paths[path]?.[method]) throw new Error('Operação Swagger duplicada: ' + method + ' ' + path)
    }
    mergedPaths[path] = { ...base.paths[path], ...operations }
  }
  for (const name of Object.keys(schemas)) {
    if (base.components?.schemas?.[name]) throw new Error('Schema Swagger duplicado: ' + name)
  }
  return {
    ...base,
    paths: mergedPaths,
    tags: [...(base.tags || []), ...tags.filter(tag => !base.tags?.some(existing => existing.name === tag.name))],
    components: { ...base.components, schemas: { ...base.components?.schemas, ...schemas } }
  }
}
module.exports = { extendSpecification }
