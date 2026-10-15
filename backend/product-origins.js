const { integer } = require('./validation')
const { problem, validateAddress, addressSnapshot } = require('./addresses')

async function selectOrigin(pool, userId, addressId, version) {
  if (!(integer(addressId) > 0) || !(integer(version) > 0)) throw problem(400, 'Selecione e confirme um endereço salvo de origem do envio.')
  const [rows] = await pool.execute('SELECT * FROM enderecos WHERE id = ? AND usuario_id = ? AND excluido = FALSE AND salvar = TRUE', [addressId, userId])
  if (!rows.length) throw problem(404, 'Endereço de origem não encontrado na conta do anunciante.')
  const address = rows[0]
  if (Number(address.versao) !== integer(version) || !address.confirmado_em) throw problem(409, 'O endereço de origem mudou ou não foi confirmado. Selecione e revise novamente.')
  if (!validateAddress(address).valid) throw problem(400, 'Complete o endereço de origem antes de anunciar.')
  return { id: Number(address.id), snapshot: JSON.stringify(addressSnapshot(address)), uf: address.uf, cidade: address.cidade }
}
function publicProduct(row) {
  const { origem_snapshot: _snapshot, origem_endereco_id: _addressId, ...safe } = row
  return safe
}
function productOrigin(product) {
  if (!product.origem_snapshot) return null
  try {
    const address = typeof product.origem_snapshot === 'string' ? JSON.parse(product.origem_snapshot) : product.origem_snapshot
    const validation = validateAddress(address)
    return validation.valid ? validation.value : null
  } catch { return null }
}
module.exports = { selectOrigin, publicProduct, productOrigin }
