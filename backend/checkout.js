const crypto = require('crypto')
const { integer } = require('./validation')
const { problem, validateAddress, addressSnapshot } = require('./addresses')

function normalizeItems(items) {
  if (!Array.isArray(items) || !items.length || items.length > 20) throw problem(400, 'O pedido deve conter entre 1 e 20 produtos.')
  const normalized = items.map(item => ({ produto_id: integer(item?.produto_id), quantidade: integer(item?.quantidade) })).sort((first, second) => first.produto_id - second.produto_id)
  if (normalized.some(item => !(item.produto_id > 0) || !(item.quantidade > 0) || item.quantidade > 99)) throw problem(400, 'Há produtos ou quantidades inválidas no pedido.')
  if (new Set(normalized.map(item => item.produto_id)).size !== normalized.length) throw problem(400, 'O mesmo produto não pode aparecer mais de uma vez no pedido.')
  return normalized
}

const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex')
const parse = value => typeof value === 'string' ? JSON.parse(value) : value

async function loadCart(connection, userId, requestedItems, lock = false) {
  const normalized = normalizeItems(requestedItems)
  const [products] = await connection.execute(`SELECT id_produto, nome, preco, estoque, imagem, vendedor_id, vendedor, exige_entrega FROM produtos WHERE id_produto IN (${normalized.map(() => '?').join(', ')}) AND status_aprovacao = 'aprovado'${lock ? ' FOR UPDATE' : ''}`, normalized.map(item => item.produto_id))
  if (products.length !== normalized.length) throw problem(409, 'Um dos produtos não está mais disponível.')
  const byId = new Map(products.map(product => [Number(product.id_produto), product]))
  const items = normalized.map(item => ({ ...item, product: byId.get(item.produto_id) }))
  for (const item of items) {
    if (Number(item.product.vendedor_id) === Number(userId)) throw problem(400, 'Remova do carrinho os produtos anunciados por você.')
    if (Number(item.product.estoque) < item.quantidade) throw problem(409, `Estoque insuficiente para “${item.product.nome}”.`)
    if (!(Number(item.product.preco) > 0)) throw problem(409, 'Preço inválido. Entre em contato com o vendedor.')
  }
  const subtotal = items.reduce((sum, item) => sum + Math.round(Number(item.product.preco) * 100) * item.quantidade, 0) / 100
  const fingerprint = hash(items.map(item => [item.produto_id, item.quantidade, Number(item.product.preco), Number(item.product.vendedor_id), Boolean(item.product.exige_entrega)]))
  return { items, subtotal, fingerprint, exige_entrega: items.some(item => Boolean(item.product.exige_entrega)) }
}

function shippingOptions(cart, address, rulesText = process.env.SHIPPING_RULES_JSON || '[]') {
  let rules
  try { rules = JSON.parse(rulesText) } catch { rules = [] }
  if (!Array.isArray(rules)) rules = []
  const sellers = new Map(cart.items.filter(item => Boolean(item.product.exige_entrega)).map(item => [Number(item.product.vendedor_id), item.product.vendedor]))
  return [...sellers].map(([sellerId, seller]) => {
    const options = rules.filter(rule => rule && typeof rule === 'object' && Number(rule.vendedor_id) === sellerId
      && typeof rule.id === 'string' && /^[\w-]{1,60}$/.test(rule.id)
      && typeof rule.nome === 'string' && rule.nome.length > 0 && rule.nome.length <= 120
      && Number.isFinite(rule.valor) && rule.valor >= 0 && rule.valor <= 100000
      && (!rule.ufs || (Array.isArray(rule.ufs) && rule.ufs.includes(address.uf)))
      && (!rule.cep_inicio || (/^\d{8}$/.test(rule.cep_inicio) && address.cep >= rule.cep_inicio))
      && (!rule.cep_fim || (/^\d{8}$/.test(rule.cep_fim) && address.cep <= rule.cep_fim))
    ).map(rule => ({ id: rule.id, nome: rule.nome, valor: Math.round(rule.valor * 100) / 100,
      prazo: Number.isInteger(rule.dias_min) && Number.isInteger(rule.dias_max) && rule.dias_min >= 0 && rule.dias_max >= rule.dias_min ? `${rule.dias_min} a ${rule.dias_max} dias úteis` : 'Prazo a combinar com o vendedor', fonte: 'Tabela de entrega configurada pelo vendedor' }))
    return { vendedor_id: sellerId, vendedor: seller, opcoes: options }
  })
}

function chooseShipping(groups, selected) {
  if (!Array.isArray(selected) || selected.some(option => !option || typeof option !== 'object' || !Number.isSafeInteger(Number(option.vendedor_id)) || typeof option.id !== 'string') || selected.length !== groups.length || new Set(selected.map(option => Number(option.vendedor_id))).size !== selected.length) throw problem(400, 'Escolha uma modalidade de entrega para cada vendedor.')
  return groups.map(group => {
    const requested = selected.find(option => Number(option.vendedor_id) === group.vendedor_id)
    const option = group.opcoes.find(entry => entry.id === requested?.id)
    if (!option) throw problem(409, 'Entrega indisponível para esta região. Selecione outro endereço ou modalidade.')
    return { ...option, vendedor_id: group.vendedor_id, vendedor: group.vendedor }
  })
}

async function getSession(connection, id, userId, lock = false) {
  if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/.test(id)) throw problem(400, 'Checkout inválido.')
  const [rows] = await connection.execute(`SELECT * FROM checkout_sessoes WHERE id = ? AND usuario_id = ?${lock ? ' FOR UPDATE' : ''}`, [id, userId])
  if (!rows.length) throw problem(404, 'Checkout não encontrado.')
  if (!rows[0].pedido_id && new Date(rows[0].expires_at).getTime() < Date.now()) throw problem(409, 'Checkout expirado. Retorne ao carrinho para continuar.')
  return rows[0]
}

async function inspectCheckout(connection, session, userId, lock = false) {
  const cart = await loadCart(connection, userId, parse(session.itens), lock)
  if (cart.fingerprint !== session.carrinho_hash) throw problem(409, 'O carrinho mudou. Retorne ao carrinho e confirme a compra novamente.')
  let address = null
  if (session.endereco_id) {
    const [rows] = await connection.execute(`SELECT * FROM enderecos WHERE id = ? AND usuario_id = ? AND excluido = FALSE${lock ? ' FOR UPDATE' : ''}`, [session.endereco_id, userId])
    address = rows[0] || null
  }
  const confirmed = Boolean(!cart.exige_entrega || (address && validateAddress(address).valid && address.confirmado_em && session.confirmado_em && Number(session.endereco_versao) === Number(address.versao)))
  const groups = cart.exige_entrega && confirmed ? shippingOptions(cart, address) : []
  let delivery = []
  let ready = !cart.exige_entrega
  if (cart.exige_entrega && confirmed && session.entrega) {
    try {
      delivery = chooseShipping(groups, parse(session.entrega))
      ready = hash(delivery) === hash(parse(session.entrega))
    } catch { ready = false }
  }
  const freight = ready ? delivery.reduce((sum, option) => sum + Math.round(option.valor * 100), 0) / 100 : 0
  return { cart, address, confirmed, groups, delivery, ready, freight }
}

function requireReady(state) {
  if (!state.confirmed) throw problem(409, 'Para continuar sua compra, é necessário cadastrar e confirmar seu endereço de entrega.')
  if (!state.ready) throw problem(409, 'Selecione uma entrega disponível para cada vendedor antes de continuar.')
}

function checkoutView(session, state) {
  return { id: session.id, pedido_id: session.pedido_id, exige_entrega: state.cart.exige_entrega,
    itens: state.cart.items.map(item => ({ produto_id: item.produto_id, quantidade: item.quantidade, nome: item.product.nome, preco: Number(item.product.preco), vendedor: item.product.vendedor })),
    subtotal: state.cart.subtotal, frete: state.ready ? state.freight : null,
    total: Math.round((state.cart.subtotal + state.freight) * 100) / 100,
    endereco: state.address ? { ...addressSnapshot(state.address), id: state.address.id, versao: state.address.versao } : null,
    endereco_confirmado: state.confirmed, modalidades: state.groups, entrega: state.ready ? state.delivery : [],
    pronto: state.ready, pagamento_online: false, expires_at: session.expires_at }
}

module.exports = { normalizeItems, loadCart, shippingOptions, chooseShipping, getSession, inspectCheckout, requireReady, checkoutView, parse }
