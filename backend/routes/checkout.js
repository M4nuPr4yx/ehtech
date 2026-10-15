const express = require('express')
const crypto = require('crypto')
const { autenticarToken } = require('../middleware/auth')
const { integer } = require('../validation')
const { transaction, problem, validateAddress } = require('../addresses')
const { normalizeItems, loadCart, getSession, inspectCheckout, requireReady, checkoutView, chooseShipping } = require('../checkout')
const { readOrder } = require('../order-deliveries')

module.exports = function createCheckoutRouter(pool) {
  const router = express.Router()
  router.use(autenticarToken)
  router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next() })
  const action = callback => async (req, res) => {
    try { res.json(await callback(req)) } catch (error) { res.status(error.status || 500).json({ mensagem: error.status ? error.message : 'Não foi possível atualizar o checkout.' }) }
  }
  router.post('/', action(async req => {
    const itens = normalizeItems(req.body.itens)
    const cart = await loadCart(pool, req.user.id, itens)
    const id = crypto.randomUUID()
    await pool.execute('INSERT INTO checkout_sessoes (id, usuario_id, itens, carrinho_hash, expires_at) VALUES (?, ?, ?, ?, ?)', [id, req.user.id, JSON.stringify(itens), cart.fingerprint, new Date(Date.now() + 86400000)])
    const session = await getSession(pool, id, req.user.id)
    return checkoutView(session, await inspectCheckout(pool, session, req.user.id))
  }))
  router.get('/:id', action(async req => {
    const session = await getSession(pool, req.params.id, req.user.id)
    if (session.pedido_id) {
      const { view } = await readOrder(pool, session.pedido_id, req.user.id)
      return { id: session.id, pedido_id: session.pedido_id, frete_pendente: view.frete_pendente, status: view.status }
    }
    return checkoutView(session, await inspectCheckout(pool, session, req.user.id))
  }))
  router.put('/:id/endereco', action(req => transaction(pool, async connection => {
    const session = await getSession(connection, req.params.id, req.user.id, true)
    if (session.pedido_id) throw problem(409, 'Este checkout já foi finalizado.')
    const [rows] = await connection.execute('SELECT * FROM enderecos WHERE id = ? AND usuario_id = ? AND excluido = FALSE FOR UPDATE', [integer(req.body.endereco_id) || 0, req.user.id])
    const address = rows[0]
    if (!address) throw problem(404, 'Endereço não encontrado na sua conta.')
    if (!validateAddress(address).valid) throw problem(400, 'Endereço incompleto. Revise os campos obrigatórios.')
    if (integer(req.body.versao) !== Number(address.versao)) throw problem(409, 'O endereço mudou. Revise os dados antes de confirmar.')
    if (req.body.confirmado !== true) throw problem(400, 'Confirme que revisou o endereço para esta compra.')
    await connection.execute('UPDATE enderecos SET confirmado_em = CURRENT_TIMESTAMP WHERE id = ?', [address.id])
    await connection.execute('UPDATE checkout_sessoes SET endereco_id = ?, endereco_versao = ?, confirmado_em = CURRENT_TIMESTAMP, entrega = NULL WHERE id = ?', [address.id, address.versao, session.id])
    const updated = await getSession(connection, session.id, req.user.id)
    return checkoutView(updated, await inspectCheckout(connection, updated, req.user.id))
  })))
  router.put('/:id/entrega', action(req => transaction(pool, async connection => {
    const session = await getSession(connection, req.params.id, req.user.id, true)
    if (session.pedido_id) throw problem(409, 'Este checkout já foi finalizado.')
    const state = await inspectCheckout(connection, session, req.user.id, true)
    if (!state.confirmed) throw problem(409, 'Confirme o endereço antes de selecionar a entrega.')
    const delivery = chooseShipping(state.groups, req.body.modalidades)
    await connection.execute('UPDATE checkout_sessoes SET entrega = ? WHERE id = ?', [JSON.stringify(delivery), session.id])
    const updated = { ...session, entrega: JSON.stringify(delivery) }
    return checkoutView(updated, await inspectCheckout(connection, updated, req.user.id))
  })))
  router.post('/:id/pagamento', action(req => transaction(pool, async connection => {
    const session = await getSession(connection, req.params.id, req.user.id, true)
    if (session.pedido_id) throw problem(409, 'Este checkout já foi finalizado.')
    const state = await inspectCheckout(connection, session, req.user.id, true)
    requireReady(state)
    return { ...checkoutView(session, state), disponivel: false, mensagem: 'Nenhuma cobrança online está habilitada. Você pode registrar o pedido e combinar o pagamento com os vendedores.' }
  })))
  return router
}
