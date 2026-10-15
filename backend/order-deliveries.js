const { integer } = require('./validation')
const { problem } = require('./addresses')
const { parse, freightSummary } = require('./checkout')

const LABELS = { aguardando_proposta: 'Aguardando proposta', proposta_enviada: 'Proposta aguardando aceite', acordo_confirmado: 'Acordo confirmado', enviado: 'Enviado', pronto_retirada: 'Pronto para retirada', recebido: 'Recebimento confirmado' }
const ACTIONS = ['propor', 'aceitar', 'recusar', 'despachar', 'receber']
const empty = () => ({ proposta: null, acordo: null, despacho: null, proposta_em: null, aceito_em: null, recebido_em: null })
const decoded = row => ({ id: Number(row.id), pedido_id: Number(row.pedido_id), grupo_id: row.grupo_id, vendedor_id: Number(row.vendedor_id), estado: row.estado, versao: Number(row.versao), ...parse(row.dados) })
const text = (value, max, min = 0) => typeof value === 'string' && value.trim().length >= min && value.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f<>]/.test(value) ? value.trim() : null

function proposal(input) {
  const raw = input.valor_frete
  const value = typeof raw === 'number' || (typeof raw === 'string' && /^\d+(?:\.\d{1,2})?$/.test(raw.trim())) ? Number(raw) : NaN
  const prazo = text(input.prazo, 300, 5), observations = text(input.observacoes ?? '', 500)
  if (!Number.isFinite(value) || value < 0 || value > 100000 || Math.abs(value * 100 - Math.round(value * 100)) > 0.000001 || !['entrega', 'retirada'].includes(input.modalidade) || !prazo || observations === null || (input.modalidade === 'retirada' && value !== 0)) throw problem(400, 'Informe modalidade, frete de 0 a 100.000 com até duas casas decimais e prazo de 5 a 300 caracteres. Retirada não tem frete.')
  return { modalidade: input.modalidade, valor_frete: Math.round(value * 100) / 100, prazo, observacoes: observations }
}

function transition(current, input, role, now = new Date().toISOString()) {
  if (!input || !ACTIONS.includes(input.acao) || integer(input.versao) < 0 || !Number.isSafeInteger(integer(input.versao))) throw problem(400, 'Informe uma ação e versão válidas.')
  const seller = ['propor', 'despachar'].includes(input.acao)
  if (role !== (seller ? 'vendedor' : 'comprador')) throw problem(403, 'Esta ação não está disponível para o seu papel neste pedido.')
  if (integer(input.versao) !== current.versao) throw problem(409, 'A entrega foi atualizada. Recarregue e revise a versão atual antes de continuar.')
  const fields = input.acao === 'propor' ? ['modalidade', 'valor_frete', 'prazo', 'observacoes'] : input.acao === 'despachar' ? ['transportadora', 'codigo_rastreio', 'observacoes'] : []
  if (Object.keys(input).some(key => !['acao', 'versao', ...fields].includes(key))) throw problem(400, 'Envie somente os campos desta ação.')
  const next = { ...current, versao: current.versao + 1 }
  const requireState = states => { if (!states.includes(current.estado)) throw problem(409, 'Esta ação não é permitida na etapa atual da entrega.') }
  if (input.acao === 'propor') {
    requireState(['aguardando_proposta', 'proposta_enviada'])
    next.proposta = proposal(input); next.proposta_em = now; next.estado = 'proposta_enviada'
  } else if (input.acao === 'aceitar') {
    requireState(['proposta_enviada'])
    if (!current.proposta) throw problem(409, 'Não há proposta para aceitar.')
    next.acordo = { ...current.proposta, versao_proposta: current.versao }; next.aceito_em = now; next.estado = 'acordo_confirmado'
  } else if (input.acao === 'recusar') {
    requireState(['proposta_enviada']); next.estado = 'aguardando_proposta'
  } else if (input.acao === 'despachar') {
    requireState(['acordo_confirmado'])
    if (!current.acordo) throw problem(409, 'O comprador precisa aceitar uma proposta antes desta etapa.')
    const carrier = text(input.transportadora ?? '', 80), code = text(input.codigo_rastreio ?? '', 80), observations = text(input.observacoes ?? '', 500)
    if ([carrier, code, observations].includes(null) || (current.acordo.modalidade === 'retirada' && (carrier || code))) throw problem(400, 'Confira transportadora, código e observações. Retirada não utiliza rastreamento.')
    next.despacho = { transportadora: carrier, codigo_rastreio: code, observacoes: observations, informado_em: now }
    next.estado = current.acordo.modalidade === 'retirada' ? 'pronto_retirada' : 'enviado'
  } else {
    requireState(['enviado', 'pronto_retirada']); next.estado = 'recebido'; next.recebido_em = now
  }
  return next
}

function deliveryRecords(order, records) {
  const original = order.entrega ? parse(order.entrega) : []
  return original.map((option, index) => {
    const group = option.grupo_id || `${Number(option.vendedor_id)}:${index + 1}`
    const record = records.find(item => item.grupo_id === group)
    return { ...empty(), grupo_id: group, vendedor_id: Number(option.vendedor_id), vendedor: option.vendedor, origem: option.origem || null, referencia: option, estado: 'aguardando_proposta', versao: 0, ...(record ? decoded(record) : {}) }
  })
}

function orderStatus(deliveries) {
  if (!deliveries.length || deliveries.every(item => item.estado === 'aguardando_proposta')) return 'registrado'
  if (deliveries.every(item => item.estado === 'recebido')) return 'concluido'
  if (deliveries.some(item => ['enviado', 'pronto_retirada', 'recebido'].includes(item.estado))) return 'em_entrega'
  if (deliveries.every(item => item.acordo)) return 'acordo_confirmado'
  return 'em_negociacao'
}

function projectOrder(order, items, records, userId) {
  const buyer = Number(order.comprador_id) === Number(userId)
  const ownItems = buyer ? items : items.filter(item => Number(item.vendedor_id) === Number(userId))
  if (!buyer && !ownItems.length) throw problem(404, 'Pedido não encontrado.')
  const progress = deliveryRecords(order, records).filter(item => buyer || item.vendedor_id === Number(userId))
  const effective = progress.map(item => {
    const option = { ...item.referencia, grupo_id: item.grupo_id }
    if (item.acordo) return { ...option, tipo: 'acordada', valor: item.acordo.valor_frete, nome: item.acordo.modalidade === 'retirada' ? 'Retirada acordada' : 'Entrega acordada', prazo: item.acordo.prazo }
    if (item.proposta) return { ...option, tipo: 'a_combinar', valor: null }
    return option
  })
  const subtotal = ownItems.reduce((sum, item) => sum + Math.round(Number(item.preco_unitario) * 100) * Number(item.quantidade), 0) / 100
  const { pending, known } = freightSummary(effective)
  const partial = Math.round((subtotal + known) * 100) / 100
  const maySeeAddress = buyer || progress.some(item => item.acordo?.modalidade === 'entrega' && ['acordo_confirmado', 'enviado', 'recebido'].includes(item.estado))
  return { id_pedido: Number(order.id_pedido), comprador_id: Number(order.comprador_id), comprador_nome: order.comprador_nome || 'Comprador', papel: buyer ? 'comprador' : 'vendedor', status: progress.length ? orderStatus(progress) : order.status, status_pagamento: order.status_pagamento, created_at: order.created_at, updated_at: order.updated_at,
    subtotal, total: pending ? null : partial, total_parcial: partial, frete: pending ? null : known, frete_conhecido: known, frete_pendente: pending, acordo_pendente: progress.some(item => !item.acordo),
    endereco_entrega: maySeeAddress && order.endereco_entrega ? parse(order.endereco_entrega) : null,
    entrega: effective, entregas: progress.map(({ referencia, ...item }) => ({ ...item, rotulo: LABELS[item.estado] })),
    itens: ownItems.map(({ origem_envio, ...item }) => ({ ...item, preco_unitario: Number(item.preco_unitario), quantidade: Number(item.quantidade) })) }
}

async function readOrder(connection, orderId, userId, { lock = false, events = false } = {}) {
  const id = integer(orderId)
  if (!(id > 0)) throw problem(400, 'Pedido inválido.')
  const [rows] = await connection.execute(`SELECT * FROM pedidos_produto WHERE id_pedido = ?${lock ? ' FOR UPDATE' : ''}`, [id])
  if (!rows.length) throw problem(404, 'Pedido não encontrado.')
  const [items] = await connection.execute('SELECT id_item, pedido_id, produto_id, vendedor_id, vendedor_nome, nome_produto, preco_unitario, quantidade, imagem FROM pedido_produto_itens WHERE pedido_id = ? ORDER BY id_item', [id])
  if (Number(rows[0].comprador_id) !== Number(userId) && !items.some(item => Number(item.vendedor_id) === Number(userId))) throw problem(404, 'Pedido não encontrado.')
  const [records] = await connection.execute('SELECT * FROM pedido_entregas WHERE pedido_id = ? ORDER BY id', [id])
  const view = projectOrder(rows[0], items, records, userId)
  if (events) {
    const ids = view.entregas.map(item => item.id).filter(Boolean)
    const [history] = ids.length ? await connection.execute(`SELECT id, entrega_id, autor_id, acao, versao, dados, created_at FROM pedido_entrega_eventos WHERE entrega_id IN (${ids.map(() => '?').join(', ')}) ORDER BY id DESC LIMIT 100`, ids) : [[]]
    view.historico = history.map(({ autor_id, dados, ...item }) => ({ ...item, papel: Number(autor_id) === Number(rows[0].comprador_id) ? 'comprador' : 'vendedor', dados: parse(dados) }))
  }
  return { order: rows[0], items, records, view }
}

async function ensureDeliveries(connection, order, items, records = []) {
  const sellers = new Set(items.map(item => Number(item.vendedor_id)))
  for (const item of deliveryRecords(order, records)) {
    if (!sellers.has(item.vendedor_id)) continue
    await connection.execute('INSERT IGNORE INTO pedido_entregas (pedido_id, grupo_id, vendedor_id, dados) VALUES (?, ?, ?, ?)', [order.id_pedido, item.grupo_id, item.vendedor_id, JSON.stringify(empty())])
  }
}

async function changeDelivery(connection, orderId, group, userId, input) {
  if (typeof group !== 'string' || !/^[1-9]\d*:[1-9]\d*$/.test(group) || group.length > 80) throw problem(400, 'Grupo de entrega inválido.')
  const loaded = await readOrder(connection, orderId, userId, { lock: true })
  const current = loaded.view.entregas.find(item => item.grupo_id === group)
  if (!current) throw problem(404, 'Entrega não encontrada neste pedido.')
  const next = transition(current, input, loaded.view.papel)
  await ensureDeliveries(connection, loaded.order, loaded.items, loaded.records)
  const [rows] = await connection.execute('SELECT id FROM pedido_entregas WHERE pedido_id = ? AND grupo_id = ?', [loaded.order.id_pedido, group])
  if (!rows.length) throw problem(404, 'Entrega sem vendedor identificado no pedido.')
  const data = Object.fromEntries(['proposta', 'acordo', 'despacho', 'proposta_em', 'aceito_em', 'recebido_em'].map(key => [key, next[key]]))
  const [updated] = await connection.execute('UPDATE pedido_entregas SET estado = ?, versao = ?, dados = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND versao = ?', [next.estado, next.versao, JSON.stringify(data), rows[0].id, current.versao])
  if (Number(updated.affectedRows) !== 1) throw problem(409, 'A entrega mudou. Recarregue antes de continuar.')
  await connection.execute('INSERT INTO pedido_entrega_eventos (entrega_id, autor_id, acao, versao, dados) VALUES (?, ?, ?, ?, ?)', [rows[0].id, userId, input.acao, next.versao, JSON.stringify({ estado: next.estado, ...data })])
  const complete = await readOrder(connection, loaded.order.id_pedido, loaded.order.comprador_id)
  await connection.execute('UPDATE pedidos_produto SET status = ?, total = ?, frete = ?, updated_at = CURRENT_TIMESTAMP WHERE id_pedido = ?', [complete.view.status, complete.view.total_parcial, complete.view.frete_conhecido, loaded.order.id_pedido])
  const descriptions = { propor: 'O vendedor enviou uma proposta de entrega. Revise valor, modalidade e prazo antes de aceitar.', aceitar: 'O comprador aceitou a proposta de entrega. O acordo foi registrado; o pagamento continua externo.', recusar: 'O comprador recusou a proposta de entrega. Envie uma nova proposta após combinar pelo chat.', despachar: next.estado === 'pronto_retirada' ? 'O vendedor informou que o produto está pronto para retirada.' : 'O vendedor informou o envio do produto.', receber: 'O comprador confirmou o recebimento. Esta entrega foi concluída.' }
  const recipient = ['propor', 'despachar'].includes(input.acao) ? loaded.order.comprador_id : current.vendedor_id
  await connection.execute('INSERT INTO notificacoes (usuario_id, produto_id, tipo, mensagem) VALUES (?, NULL, ?, ?)', [recipient, `pedido_${input.acao}`, `Pedido #${loaded.order.id_pedido}: ${descriptions[input.acao]}`])
  return (await readOrder(connection, loaded.order.id_pedido, userId, { events: true })).view
}

async function listOrders(connection, userId, sales = false) {
  const [orders] = await connection.execute(`SELECT p.* FROM pedidos_produto p WHERE ${sales ? 'EXISTS (SELECT 1 FROM pedido_produto_itens i WHERE i.pedido_id = p.id_pedido AND i.vendedor_id = ?)' : 'p.comprador_id = ?'} ORDER BY p.created_at DESC, p.id_pedido DESC LIMIT 50`, [userId])
  if (!orders.length) return []
  const placeholders = orders.map(() => '?').join(', '), ids = orders.map(item => item.id_pedido)
  const [items] = await connection.execute(`SELECT id_item, pedido_id, produto_id, vendedor_id, vendedor_nome, nome_produto, preco_unitario, quantidade, imagem FROM pedido_produto_itens WHERE pedido_id IN (${placeholders}) ORDER BY id_item`, ids)
  const [records] = await connection.execute(`SELECT * FROM pedido_entregas WHERE pedido_id IN (${placeholders}) ORDER BY id`, ids)
  return orders.map(order => projectOrder(order, items.filter(item => Number(item.pedido_id) === Number(order.id_pedido)), records.filter(item => Number(item.pedido_id) === Number(order.id_pedido)), userId))
}

module.exports = { LABELS, transition, proposal, deliveryRecords, orderStatus, projectOrder, readOrder, ensureDeliveries, changeDelivery, listOrders }
