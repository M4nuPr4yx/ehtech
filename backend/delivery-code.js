const crypto = require('node:crypto')
const { integer } = require('./validation')
const { problem } = require('./addresses')
const { readOrder, changeDelivery } = require('./order-deliveries')

const TTL = 30 * 60 * 1000, LOCK_TIME = 15 * 60 * 1000, MAX_ATTEMPTS = 5
function verifier(context, code, secret) {
  return crypto.createHmac('sha256', secret).update(JSON.stringify([context.entrega_id, context.comprador_id, context.salt, code])).digest('hex')
}
function validCode(context, code, secret) {
  if (typeof code !== 'string' || !/^\d{6}$/.test(code) || !/^[a-f0-9]{64}$/.test(context.digest || '')) return false
  return crypto.timingSafeEqual(Buffer.from(context.digest, 'hex'), Buffer.from(verifier(context, code, secret), 'hex'))
}
async function loadGroup(connection, orderId, group, userId, input) {
  if (typeof group !== 'string' || !/^[1-9]\d*:[1-9]\d*$/.test(group) || group.length > 80) throw problem(400, 'Grupo de entrega inválido.')
  const loaded = await readOrder(connection, orderId, userId, { lock: true })
  const delivery = loaded.view.entregas.find(item => item.grupo_id === group)
  if (!delivery) throw problem(404, 'Entrega não encontrada.')
  if (!(integer(input.versao) >= 0)) throw problem(400, 'Informe a versão da entrega.')
  if (integer(input.versao) !== delivery.versao) throw problem(409, 'A entrega mudou. Atualize o pedido antes de continuar.')
  if (delivery.estado !== 'pronto_retirada' || delivery.acordo?.modalidade !== 'retirada' || !delivery.id) throw problem(409, 'Código disponível somente para uma retirada pronta e ainda não recebida.')
  return { ...loaded, delivery }
}
async function issueCode(connection, orderId, group, userId, input) {
  if (!input || Object.keys(input).some(key => key !== 'versao')) throw problem(400, 'Envie somente a versão da entrega.')
  const loaded = await loadGroup(connection, orderId, group, userId, input)
  if (loaded.view.papel !== 'comprador') throw problem(403, 'Somente o comprador pode gerar o código de recebimento.')
  const now = Date.now(), deliveryId = loaded.delivery.id
  const [rows] = await connection.execute('SELECT * FROM pedido_recebimento_codigos WHERE entrega_id = ? FOR UPDATE', [deliveryId])
  if (Number(rows[0]?.bloqueado_ate) > now) throw problem(429, 'Muitas tentativas. Aguarde 15 minutos antes de gerar outro código.')
  const secret = require('./middleware/auth').getApiSecret()
  let code
  do { code = String(crypto.randomInt(1000000)).padStart(6, '0') } while (rows[0] && validCode(rows[0], code, secret))
  const context = { entrega_id: deliveryId, comprador_id: loaded.order.comprador_id, salt: crypto.randomBytes(16).toString('hex') }
  const digest = verifier(context, code, secret)
  if (rows.length) await connection.execute('UPDATE pedido_recebimento_codigos SET salt = ?, digest = ?, expira_em = ?, tentativas = 0, bloqueado_ate = 0 WHERE entrega_id = ?', [context.salt, digest, now + TTL, deliveryId])
  else await connection.execute('INSERT INTO pedido_recebimento_codigos (entrega_id, comprador_id, salt, digest, expira_em) VALUES (?, ?, ?, ?, ?)', [deliveryId, context.comprador_id, context.salt, digest, now + TTL])
  return { codigo: code, expira_em: new Date(now + TTL).toISOString(), mensagem: 'Informe ao vendedor somente após receber os produtos. Gerar outro código invalida este.' }
}
async function redeemCode(connection, orderId, group, userId, input) {
  if (!input || Object.keys(input).some(key => !['versao', 'codigo'].includes(key)) || typeof input.codigo !== 'string' || !/^\d{6}$/.test(input.codigo)) throw problem(400, 'Informe a versão e o código de seis dígitos.')
  const loaded = await loadGroup(connection, orderId, group, userId, input)
  if (loaded.view.papel !== 'vendedor') throw problem(403, 'Somente o vendedor desta entrega pode validar o código.')
  const [rows] = await connection.execute('SELECT * FROM pedido_recebimento_codigos WHERE entrega_id = ? FOR UPDATE', [loaded.delivery.id])
  const row = rows[0], now = Date.now()
  if (!row || Number(row.comprador_id) !== Number(loaded.order.comprador_id)) throw problem(409, 'Peça ao comprador que gere um código após receber.')
  if (Number(row.bloqueado_ate) > now) return { failure: { status: 429, mensagem: 'Muitas tentativas. Aguarde 15 minutos e peça um novo código ao comprador.' } }
  if (Number(row.expira_em) <= now) throw problem(409, 'Código expirado. Peça ao comprador para gerar outro.')
  if (!validCode(row, input.codigo, require('./middleware/auth').getApiSecret())) {
    const attempts = Number(row.tentativas) + 1, blocked = attempts >= MAX_ATTEMPTS
    await connection.execute('UPDATE pedido_recebimento_codigos SET tentativas = ?, bloqueado_ate = ?, expira_em = ? WHERE entrega_id = ?', [attempts, blocked ? now + LOCK_TIME : 0, blocked ? 0 : Number(row.expira_em), row.entrega_id])
    // Retorna a falha depois do commit: lançar aqui desfaria o contador de tentativas.
    return { failure: { status: blocked ? 429 : 400, mensagem: blocked ? 'Muitas tentativas. Aguarde 15 minutos e peça um novo código ao comprador.' : 'Código inválido. Confira com o comprador.' } }
  }
  await changeDelivery(connection, orderId, group, loaded.order.comprador_id, { acao: 'receber', versao: loaded.delivery.versao }, { codeSellerId: userId })
  return (await readOrder(connection, orderId, userId, { events: true })).view
}
module.exports = { verifier, validCode, issueCode, redeemCode }
