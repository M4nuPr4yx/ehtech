async function completedPurchase(pool, userId, productId) {
  const [rows] = await pool.execute(`SELECT p.id_pedido FROM pedidos_produto p
    JOIN pedido_produto_itens i ON i.pedido_id = p.id_pedido
    JOIN produtos produto ON produto.id_produto = i.produto_id AND produto.vendedor_id = i.vendedor_id
    WHERE p.comprador_id = ? AND i.produto_id = ? AND p.status = 'concluido'
      AND i.vendedor_id <> ?
      AND EXISTS (SELECT 1 FROM pedido_entregas e WHERE e.pedido_id = p.id_pedido)
      AND NOT EXISTS (SELECT 1 FROM pedido_entregas e WHERE e.pedido_id = p.id_pedido AND e.estado <> 'recebido')
    ORDER BY p.id_pedido DESC LIMIT 1`, [userId, productId, userId])
  return rows[0]?.id_pedido || null
}
module.exports = { completedPurchase }
