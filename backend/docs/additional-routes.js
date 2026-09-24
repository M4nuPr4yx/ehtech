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
const password = str('Senha de no mínimo 8 caracteres', { format: 'password', minLength: 8, writeOnly: true })
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
    descricao_problema: text, modalidade: modality, urgencia: text,
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
  500: 'Falha interna no processamento.'
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
    schema: ['slug', 'token', 'filename'].includes(name) ? str('Valor real do recurso') : id
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
const authLimit = '20 requisições/IP em 15 minutos, compartilhadas entre cadastro, login e login administrativo; também sujeita ao limite global.'
const resetLimit = '10 requisições/IP por hora, compartilhadas entre solicitação e redefinição de senha; também sujeita ao limite global.'
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
  auth: false, errors: [400, 401], limit: authLimit,
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
add('put', '/admin/users/{id}/senha', 'Administração', 'Redefinir senha de usuário', { admin: true, errors: [400], input: body({ novaSenha: password }, ['novaSenha']) })
add('get', '/admin/produtos', 'Administração', 'Listar anúncios para moderação', { admin: true, output: arr(ref('ProdutoCompleto')), description: 'Inclui anúncios aprovados, pendentes e reprovados.' })
add('put', '/admin/produtos/{id}/aprovacao', 'Administração', 'Alterar aprovação de anúncio', { admin: true, errors: [400, 404], input: body({ status: approval }, ['status']), description: 'Atualiza o anúncio e envia uma notificação ao vendedor.' })

add('post', '/esqueci-senha', 'Recuperação de senha', 'Solicitar link de recuperação', {
  auth: false, errors: [400], limit: resetLimit, input: body({ email }, ['email']),
  description: 'Pode enviar e-mail real se SMTP estiver configurado. Retorna mensagem genérica mesmo se a conta não existir. O link expira em 1 hora; sem SMTP, a implementação registra o link no console do servidor.'
})
add('get', '/verificar-token/{token}', 'Recuperação de senha', 'Verificar token de recuperação', {
  auth: false, errors: [400], output: obj({ valido: bool, email, mensagem: text }),
  description: 'Use o token do link de recuperação, não o JWT de login. Token inválido ou expirado retorna HTTP 200 com valido=false.'
})
add('post', '/redefinir-senha', 'Recuperação de senha', 'Salvar nova senha usando link de recuperação', {
  auth: false, errors: [400], limit: resetLimit, input: body({ token: str('Token do link de recuperação'), novaSenha: password }, ['token', 'novaSenha']),
  description: 'Altera a senha da conta vinculada ao token de recuperação e remove seus tokens de recuperação. Não use o JWT de login aqui.'
})

add('get', '/perfil', 'Perfil', 'Consultar meu perfil', { errors: [404], output: ref('DocPerfil') })
add('put', '/perfil', 'Perfil', 'Atualizar meu nome', { input: body({ nome: str('Nome; omitido ou vazio limpa o campo; truncado em 255 caracteres', { nullable: true, maxLength: 255 }) }, []) })
add('get', '/usuarios/{id}/publico', 'Perfil', 'Consultar perfil público do vendedor', { auth: false, errors: [400, 404], output: ref('DocPerfilPublico') })
add('put', '/perfil/senha', 'Perfil', 'Alterar minha senha', { errors: [400, 404], input: body({ senhaAtual: str('Senha atual', { format: 'password', writeOnly: true }), novaSenha: password }, ['senhaAtual', 'novaSenha']) })
add('put', '/perfil/email', 'Perfil', 'Alterar meu e-mail', {
  errors: [400, 404, 409], input: body({ novoEmail: email, senha: str('Senha atual', { format: 'password', writeOnly: true }) }, ['novoEmail', 'senha']),
  output: obj({ mensagem: text, novoEmail: email }), description: 'Aceita gmail.com, hotmail.com ou outlook.com. Valida a senha atual e a disponibilidade do novo endereço.'
})
add('put', '/perfil/foto', 'Perfil', 'Atualizar ou remover minha foto', {
  errors: [400], output: obj({ mensagem: text, foto: { ...text, nullable: true } }),
  description: 'Arquivo JPG/JPEG, PNG ou WEBP de até 5 MiB, campo foto. Alternativamente envie JSON com foto (URL http, caminho /uploads/ ou data:image/). JSON com foto=null remove a referência do perfil.',
  input: { required: true, content: { 'multipart/form-data': { schema: obj({ foto: binary }, ['foto']) }, 'application/json': { schema: obj({ foto: { ...text, nullable: true } }), example: { foto: null } } } }
})

add('get', '/produtos/meus', 'Produtos', 'Listar meus anúncios, incluindo pendentes', { output: arr(ref('ProdutoCompleto')) })
add('get', '/produtos/{id}', 'Produtos', 'Consultar anúncio por ID', { auth: false, errors: [400, 404], output: ref('ProdutoCompleto'), description: 'A implementação consulta pelo ID, sem filtrar status de aprovação.' })
add('put', '/produtos/{id}', 'Produtos', 'Editar anúncio', {
  errors: [400, 404], description: 'Requer proprietário ou administrador. Envie todos os campos principais no exemplo para manter os valores desejados. status_aprovacao é considerado somente para administradores.',
  input: body({
    nome: str('Nome', { maxLength: 255 }), descricao: str('Descrição', { maxLength: 5000 }),
    preco: num('Preço'), estoque: int('Estoque'), categoria: str('Categoria', { maxLength: 60 }),
    imagem: { oneOf: [text, arr(text)], nullable: true }, status_aprovacao: approval
  }, [], { nome: 'Produto de teste', descricao: 'Descrição atualizada do produto de teste', preco: 99.9, estoque: 10, categoria: 'Acessórios', imagem: [] })
})
add('delete', '/produtos/{id}', 'Produtos', 'Excluir anúncio', { errors: [400, 404], description: 'Ação destrutiva: requer proprietário ou administrador. Exclui o anúncio real indicado pelo ID.' })

add('get', '/notificacoes', 'Notificações', 'Listar minhas últimas 50 notificações', { output: arr(ref('DocNotificacao')) })
add('put', '/notificacoes/{id}/lida', 'Notificações', 'Marcar minha notificação como lida', { errors: [400], description: 'Atualiza somente notificações pertencentes ao usuário autenticado.' })
add('put', '/notificacoes/lidas', 'Notificações', 'Marcar todas as minhas notificações como lidas')

add('post', '/avaliacoes', 'Avaliações', 'Criar ou atualizar avaliação de produto', {
  errors: [400, 404], input: body({ produtoId: id, nota: int('Nota', { minimum: 1, maximum: 5 }), comentario: str('Comentário opcional; truncado em 1000 caracteres', { maxLength: 1000 }) }, ['produtoId', 'nota']),
  description: 'Não permite avaliar o próprio anúncio. Se já existir avaliação desse usuário para o produto, atualiza a avaliação. Retorna 200, inclusive na criação.'
})
add('get', '/avaliacoes/produto/{id}', 'Avaliações', 'Listar avaliações de um produto', {
  auth: false, errors: [400], output: obj({ avaliacoes: arr(obj({ id, produto_id: id, nota: int('Nota'), comentario: { ...text, nullable: true }, data_avaliacao: text, avaliador_username: text })), media: str('Média em texto, com uma casa decimal', { example: '4.5' }), total: int('Total') })
})
add('get', '/avaliacoes/usuario/{id}', 'Avaliações', 'Consultar reputação do vendedor de produtos', { auth: false, errors: [400], output: obj({ media: str('Média em texto', { example: '4.5' }), total: int('Total') }) })

add('get', '/servicos', 'Serviços', 'Listar catálogo paginado de serviços ativos', {
  auth: false,
  parameters: [query('page', int('Página, limitada ao total disponível', { default: 1, minimum: 1, maximum: 100000 })), query('limit', int('Itens por página', { default: 9, minimum: 1, maximum: 24 })), query('search', str('Busca por título, descrição ou categoria', { maxLength: 100 })), query('categoria', str('Categoria exata', { maxLength: 60 })), query('modalidade', modality), query('ordenacao', str('Ordenação', { enum: ['recentes', 'menor-preco', 'maior-preco'], default: 'recentes' }))],
  output: obj({ items: arr(ref('DocServico')), total: int('Total'), page: int('Página efetiva'), limit: int('Tamanho da página'), totalPages: int('Total de páginas') }),
  description: 'Resposta pública com Cache-Control: public, max-age=60, stale-while-revalidate=300.'
})
add('get', '/servicos/{slug}', 'Serviços', 'Consultar serviço ativo pelo slug', { auth: false, errors: [400, 404], output: ref('DocServico'), description: 'Use o slug real retornado pelo catálogo; somente letras minúsculas, números e hífens.' })
add('get', '/servicos/reputacao/prestador/{id}', 'Serviços', 'Consultar reputação técnica do prestador', { auth: false, errors: [400], output: obj({ media: num('Média numérica'), total: int('Total'), avaliacoes: arr(obj({ nota: int('Nota'), comentario: { ...text, nullable: true }, created_at: text, avaliador: text, servico: text })) }), description: 'Retorna resumo e até 20 avaliações recentes.' })

add('post', '/contratacoes', 'Contratações', 'Solicitar orçamento de serviço', {
  code: 201, errors: [400, 404, 409],
  input: body({ servico_id: { ...id, minimum: 1 }, descricao_problema: str('Necessidade', { minLength: 20, maxLength: 2000 }), modalidade: modality, urgencia: str('Urgência', { enum: ['flexivel', 'normal', 'urgente'] }), orcamento_max: { ...money, nullable: true }, disponibilidade: str('Disponibilidade', { minLength: 5, maxLength: 300 }) }, ['servico_id', 'descricao_problema', 'modalidade', 'urgencia', 'disponibilidade'], { servico_id: 1, descricao_problema: 'Preciso de montagem e configuração de um computador.', modalidade: 'presencial', urgencia: 'normal', orcamento_max: 300, disponibilidade: 'Sábado pela manhã' }),
  output: obj({ id, status, mensagem: text }), description: 'Cliente identificado pelo token. Serviço deve estar ativo e pertencer a outro usuário. Apenas uma solicitação não concluída/não cancelada por cliente e serviço.'
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
  code: 201, errors: [400, 409], input: body({ itens: { ...arr(obj({ produto_id: { ...id, minimum: 1 }, quantidade: int('Quantidade', { minimum: 1, maximum: 99 }) }, ['produto_id', 'quantidade'])), minItems: 1, maxItems: 20 } }, ['itens'], { itens: [{ produto_id: 1, quantidade: 1 }] }),
  output: obj({ id_pedido: id, total: num('Total calculado pelo backend'), status: str('Estado', { enum: ['registrado'] }), mensagem: text }),
  description: 'Somente produtos aprovados, com estoque suficiente e de outros vendedores. Não repita produto_id. O backend calcula preços, registra pedido e itens e notifica vendedores. Não realiza cobrança nem baixa/reserva de estoque.'
})
add('get', '/pedidos', 'Pedidos', 'Consultar meu histórico de compras', { output: arr(ref('DocPedido')), description: 'Retorna até 50 pedidos do comprador autenticado com seus itens e valores registrados.' })

add('post', '/mensagens', 'Mensagens', 'Enviar mensagem privada', {
  code: 201, errors: [400, 404], input: body({ destinatarioId: { ...id, minimum: 1 }, conteudo: str('Mensagem não vazia, truncada em 2000 caracteres', { minLength: 1, maxLength: 2000 }), produtoId: { ...id, nullable: true } }, ['destinatarioId', 'conteudo']),
  output: obj({ sucesso: bool, mensagem: text, id }), description: 'Destinatário deve existir e ser outro usuário. Cria mensagem e notificação para o destinatário.'
})
add('get', '/mensagens/conversas', 'Mensagens', 'Listar minhas conversas', { output: arr(obj({ partner_id: id, partner_username: text, partner_nome: { ...text, nullable: true }, partner_foto: { ...text, nullable: true }, last_message: text, last_message_date: text, last_sender_id: id, unread_count: int('Não lidas') })) })
add('get', '/mensagens/nao-lidas/total', 'Mensagens', 'Contar minhas mensagens não lidas', { output: obj({ totalNaoLidas: int('Total não lido') }) })
add('get', '/mensagens/{outroUsuarioId}', 'Mensagens', 'Consultar histórico com outro usuário', { errors: [400, 404], output: obj({ parceiro: obj({ id_usuario: id, username: text, nome: { ...text, nullable: true }, foto: { ...text, nullable: true } }), mensagens: arr(ref('DocMensagem')) }) })
add('put', '/mensagens/{outroUsuarioId}/lidas', 'Mensagens', 'Marcar mensagens recebidas desse usuário como lidas', { errors: [400], output: obj({ sucesso: bool, mensagem: text }) })

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

const tags = ['Administração', 'Recuperação de senha', 'Perfil', 'Notificações', 'Avaliações', 'Serviços', 'Contratações', 'Pedidos', 'Mensagens', 'Uploads', 'Status'].map(name => ({ name }))

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
