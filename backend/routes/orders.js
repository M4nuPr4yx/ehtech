const express = require('express')
const { autenticarToken } = require('../middleware/auth')

function createOrdersRouter(pool) {
  const router = express.Router()
  router.use(autenticarToken)

  router.post('/', async (req, res) => {
    const requestedItems = Array.isArray(req.body.itens) ? req.body.itens : []
    if (!requestedItems.length || requestedItems.length > 20) {
      return res.status(400).json({ mensagem: 'O pedido deve conter entre 1 e 20 produtos.' })
    }

    const normalized = requestedItems.map((item) => ({
      produto_id: Number.parseInt(item.produto_id, 10),
      quantidade: Number.parseInt(item.quantidade, 10)
    }))
    if (normalized.some((item) => !Number.isInteger(item.produto_id) || item.produto_id <= 0 || !Number.isInteger(item.quantidade) || item.quantidade < 1 || item.quantidade > 99)) {
      return res.status(400).json({ mensagem: 'Há produtos ou quantidades inválidas no pedido.' })
    }
    if (new Set(normalized.map((item) => item.produto_id)).size !== normalized.length) {
      return res.status(400).json({ mensagem: 'O mesmo produto não pode aparecer mais de uma vez no pedido.' })
    }

    let orderId = null
    try {
      const placeholders = normalized.map(() => '?').join(', ')
      const [products] = await pool.execute(
        `SELECT id_produto, nome, preco, estoque, imagem, vendedor_id, vendedor
         FROM produtos WHERE id_produto IN (${placeholders}) AND status_aprovacao = 'aprovado'`,
        normalized.map((item) => item.produto_id)
      )
      if (products.length !== normalized.length) return res.status(409).json({ mensagem: 'Um dos produtos não está mais disponível.' })

      const productsById = new Map(products.map((product) => [Number(product.id_produto), product]))
      const items = normalized.map((item) => ({ ...item, product: productsById.get(item.produto_id) }))
      const unavailable = items.find((item) => Number(item.product.estoque) < item.quantidade)
      if (unavailable) return res.status(409).json({ mensagem: `Estoque insuficiente para “${unavailable.product.nome}”.` })
      if (items.some((item) => Number(item.product.vendedor_id) === Number(req.user.id))) {
        return res.status(400).json({ mensagem: 'Remova do carrinho os produtos anunciados por você.' })
      }

      const total = items.reduce((sum, item) => sum + Number(item.product.preco) * item.quantidade, 0)
      const [orderResult] = await pool.execute(
        "INSERT INTO pedidos_produto (comprador_id, status, total) VALUES (?, 'registrado', ?)",
        [req.user.id, Math.round(total * 100) / 100]
      )
      orderId = Number(orderResult.insertId)
      if (!orderId) throw new Error('O banco não retornou o identificador do pedido')

      for (const item of items) {
        await pool.execute(
          `INSERT INTO pedido_produto_itens
            (pedido_id, produto_id, vendedor_id, vendedor_nome, nome_produto, preco_unitario, quantidade, imagem)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [orderId, item.produto_id, item.product.vendedor_id, item.product.vendedor,
            item.product.nome, Number(item.product.preco), item.quantidade, item.product.imagem || null]
        )
      }

      const sellers = new Map()
      for (const item of items) {
        const sellerId = Number(item.product.vendedor_id)
        const current = sellers.get(sellerId) || { count: 0, productId: item.produto_id }
        current.count += item.quantidade
        sellers.set(sellerId, current)
      }
      for (const [sellerId, info] of sellers) {
        try {
          await pool.execute(
            'INSERT INTO notificacoes (usuario_id, produto_id, tipo, mensagem) VALUES (?, ?, ?, ?)',
            [sellerId, info.productId, 'pedido_registrado', `Novo pedido #${orderId} com ${info.count} item${info.count === 1 ? '' : 's'}. Combine os próximos passos pelo chat.`]
          )
        } catch (notificationError) {
          console.error('[pedidos/notificacao] Erro:', notificationError.message)
        }
      }

      return res.status(201).json({ id_pedido: orderId, total: Math.round(total * 100) / 100, status: 'registrado', mensagem: 'Pedido registrado. Nenhuma cobrança foi realizada.' })
    } catch (error) {
      if (orderId) {
        try {
          await pool.execute('DELETE FROM pedido_produto_itens WHERE pedido_id = ?', [orderId])
          await pool.execute('DELETE FROM pedidos_produto WHERE id_pedido = ? AND comprador_id = ?', [orderId, req.user.id])
        } catch (cleanupError) {
          console.error('[pedidos/limpeza] Erro:', cleanupError.message)
        }
      }
      console.error('[pedidos/criar] Erro:', error.message)
      return res.status(500).json({ mensagem: 'Não foi possível registrar o pedido.' })
    }
  })

  router.get('/', async (req, res) => {
    try {
      const [orders] = await pool.execute(
        `SELECT id_pedido, status, total, created_at, updated_at
         FROM pedidos_produto WHERE comprador_id = ? ORDER BY created_at DESC, id_pedido DESC LIMIT 50`,
        [req.user.id]
      )
      if (!orders.length) return res.json([])

      const placeholders = orders.map(() => '?').join(', ')
      const [items] = await pool.execute(
        `SELECT id_item, pedido_id, produto_id, vendedor_id, vendedor_nome,
          nome_produto, preco_unitario, quantidade, imagem
         FROM pedido_produto_itens WHERE pedido_id IN (${placeholders}) ORDER BY id_item`,
        orders.map((order) => order.id_pedido)
      )
      const itemsByOrder = new Map()
      for (const item of items) {
        const orderItems = itemsByOrder.get(Number(item.pedido_id)) || []
        orderItems.push({ ...item, preco_unitario: Number(item.preco_unitario), quantidade: Number(item.quantidade) })
        itemsByOrder.set(Number(item.pedido_id), orderItems)
      }
      return res.json(orders.map((order) => ({ ...order, total: Number(order.total), itens: itemsByOrder.get(Number(order.id_pedido)) || [] })))
    } catch (error) {
      console.error('[pedidos/listar] Erro:', error.message)
      return res.status(500).json({ mensagem: 'Não foi possível carregar o histórico de produtos.' })
    }
  })

  return router
}

module.exports = createOrdersRouter
