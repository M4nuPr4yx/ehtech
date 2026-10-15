const express = require('express')
const { autenticarToken } = require('../middleware/auth')
const { transaction, addressSnapshot, problem } = require('../addresses')
const { getSession, inspectCheckout, requireReady, normalizeItems, orderView } = require('../checkout')
const { readOrder, ensureDeliveries, changeDelivery, listOrders } = require('../order-deliveries')

function createOrdersRouter(pool) {
  const router = express.Router()
  router.use(autenticarToken)
  router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next() })
  router.post('/', async (req, res) => {
    try {
      if (req.body.itens !== undefined) normalizeItems(req.body.itens)
      if (!req.body.checkout_id) throw problem(409, 'Para continuar sua compra, é necessário cadastrar e confirmar seu endereço de entrega no checkout.')
      const result = await transaction(pool, async connection => {
        const session = await getSession(connection, req.body.checkout_id, req.user.id, true)
        if (session.pedido_id) {
          const [orders] = await connection.execute('SELECT id_pedido, total, frete, entrega, status, status_pagamento FROM pedidos_produto WHERE id_pedido = ? AND comprador_id = ?', [session.pedido_id, req.user.id])
          if (!orders.length) throw problem(409, 'Pedido indisponível.')
          return (await readOrder(connection, orders[0].id_pedido, req.user.id)).view
        }
        const state = await inspectCheckout(connection, session, req.user.id, true)
        requireReady(state)
        const total = Math.round((state.cart.subtotal + state.freight) * 100) / 100
        const [order] = await connection.execute(
          "INSERT INTO pedidos_produto (comprador_id, status, total, endereco_entrega, entrega, frete, status_pagamento, checkout_id) VALUES (?, 'registrado', ?, ?, ?, ?, 'nao_iniciado', ?)",
          [req.user.id, total, state.cart.exige_entrega ? JSON.stringify(addressSnapshot(state.address)) : null, JSON.stringify(state.delivery), state.freight, session.id]
        )
        const orderId = Number(order.insertId)
        if (!orderId) throw new Error('Pedido sem identificador')
        for (const item of state.cart.items) {
          await connection.execute(
            `INSERT INTO pedido_produto_itens (pedido_id, produto_id, vendedor_id, vendedor_nome, nome_produto, preco_unitario, quantidade, imagem, origem_envio) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [orderId, item.produto_id, item.product.vendedor_id, item.product.vendedor, item.product.nome, Number(item.product.preco), item.quantidade, item.product.imagem || null, item.product.origem_snapshot || null]
          )
        }
        await ensureDeliveries(connection, { id_pedido: orderId, entrega: state.delivery }, state.cart.items.map(item => ({ vendedor_id: item.product.vendedor_id })))
        await connection.execute('UPDATE checkout_sessoes SET pedido_id = ? WHERE id = ?', [orderId, session.id])
        const sellers = new Set(state.cart.items.map(item => Number(item.product.vendedor_id)))
        for (const sellerId of sellers) {
          const pending = state.delivery.some(option => option.vendedor_id === sellerId && option.tipo === 'a_combinar')
          await connection.execute('INSERT INTO notificacoes (usuario_id, produto_id, tipo, mensagem) VALUES (?, ?, ?, ?)', [sellerId, null, 'pedido_registrado', `Novo pedido #${orderId} registrado.${pending ? ' Entrega, prazo e frete ainda precisam ser combinados; atendimento não confirmado.' : ''} Combine os próximos passos pelo chat.`])
        }
        return orderView({ id_pedido: orderId, total, frete: state.freight, entrega: state.delivery, status: 'registrado', status_pagamento: 'nao_iniciado' })
      })
      return res.status(201).json({ ...result, mensagem: result.frete_pendente ? 'Pedido registrado com entrega e frete a combinar. Nenhuma entrega ou cobrança foi confirmada.' : 'Pedido registrado. Nenhuma cobrança foi realizada.' })
    } catch (error) {
      return res.status(error.status || 500).json({ mensagem: error.status ? error.message : 'Não foi possível registrar o pedido.' })
    }
  })
  router.get('/', async (req, res) => {
    try {
      return res.json(await listOrders(pool, req.user.id))
    } catch {
      return res.status(500).json({ mensagem: 'Não foi possível carregar o histórico de produtos.' })
    }
  })
  router.get('/vendas', async (req, res) => {
    try { res.json(await listOrders(pool, req.user.id, true)) }
    catch { res.status(500).json({ mensagem: 'Não foi possível carregar suas vendas.' }) }
  })
  router.get('/:id', async (req, res) => {
    try { res.json((await readOrder(pool, req.params.id, req.user.id, { events: true })).view) }
    catch (error) { res.status(error.status || 500).json({ mensagem: error.status ? error.message : 'Não foi possível carregar o pedido.' }) }
  })
  const actionLimiter = require('express-rate-limit')({ windowMs: 10 * 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false, message: { mensagem: 'Muitas atualizações de pedidos. Aguarde alguns minutos.' } })
  router.patch('/:id/entregas/:grupo', actionLimiter, async (req, res) => {
    try {
      if (!req.body || Buffer.byteLength(JSON.stringify(req.body)) > 4096) throw problem(400, 'Envie somente os dados desta ação, até 4 KB.')
      res.json(await transaction(pool, connection => changeDelivery(connection, req.params.id, req.params.grupo, req.user.id, req.body)))
    } catch (error) { res.status(error.status || 500).json({ mensagem: error.status ? error.message : 'Não foi possível atualizar a entrega.' }) }
  })
  return router
}

module.exports = createOrdersRouter
