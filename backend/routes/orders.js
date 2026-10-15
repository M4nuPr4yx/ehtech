const express = require('express')
const { autenticarToken } = require('../middleware/auth')
const { transaction, addressSnapshot, problem } = require('../addresses')
const { getSession, inspectCheckout, requireReady, parse, normalizeItems } = require('../checkout')

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
          const [orders] = await connection.execute('SELECT id_pedido, total, status, status_pagamento FROM pedidos_produto WHERE id_pedido = ? AND comprador_id = ?', [session.pedido_id, req.user.id])
          if (!orders.length) throw problem(409, 'Pedido indisponível.')
          return orders[0]
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
            `INSERT INTO pedido_produto_itens (pedido_id, produto_id, vendedor_id, vendedor_nome, nome_produto, preco_unitario, quantidade, imagem) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [orderId, item.produto_id, item.product.vendedor_id, item.product.vendedor, item.product.nome, Number(item.product.preco), item.quantidade, item.product.imagem || null]
          )
        }
        await connection.execute('UPDATE checkout_sessoes SET pedido_id = ? WHERE id = ?', [orderId, session.id])
        const sellers = new Set(state.cart.items.map(item => Number(item.product.vendedor_id)))
        for (const sellerId of sellers) {
          await connection.execute('INSERT INTO notificacoes (usuario_id, produto_id, tipo, mensagem) VALUES (?, ?, ?, ?)', [sellerId, null, 'pedido_registrado', `Novo pedido #${orderId} registrado. Combine os próximos passos pelo chat.`])
        }
        return { id_pedido: orderId, total, status: 'registrado', status_pagamento: 'nao_iniciado' }
      })
      return res.status(201).json({ ...result, total: Number(result.total), mensagem: 'Pedido registrado. Nenhuma cobrança foi realizada.' })
    } catch (error) {
      return res.status(error.status || 500).json({ mensagem: error.status ? error.message : 'Não foi possível registrar o pedido.' })
    }
  })
  router.get('/', async (req, res) => {
    try {
      const [orders] = await pool.execute(
        `SELECT id_pedido, status, total, created_at, updated_at, endereco_entrega, entrega, frete, status_pagamento
         FROM pedidos_produto WHERE comprador_id = ? ORDER BY created_at DESC, id_pedido DESC LIMIT 50`, [req.user.id]
      )
      if (!orders.length) return res.json([])
      const [items] = await pool.execute(
        `SELECT id_item, pedido_id, produto_id, vendedor_id, vendedor_nome, nome_produto, preco_unitario, quantidade, imagem
         FROM pedido_produto_itens WHERE pedido_id IN (${orders.map(() => '?').join(', ')}) ORDER BY id_item`, orders.map(order => order.id_pedido)
      )
      const itemsByOrder = new Map()
      for (const item of items) {
        const orderItems = itemsByOrder.get(Number(item.pedido_id)) || []
        orderItems.push({ ...item, preco_unitario: Number(item.preco_unitario), quantidade: Number(item.quantidade) })
        itemsByOrder.set(Number(item.pedido_id), orderItems)
      }
      return res.json(orders.map(order => ({ ...order, total: Number(order.total), frete: Number(order.frete),
        endereco_entrega: order.endereco_entrega ? parse(order.endereco_entrega) : null,
        entrega: order.entrega ? parse(order.entrega) : [], itens: itemsByOrder.get(Number(order.id_pedido)) || [] })))
    } catch {
      return res.status(500).json({ mensagem: 'Não foi possível carregar o histórico de produtos.' })
    }
  })
  return router
}

module.exports = createOrdersRouter
