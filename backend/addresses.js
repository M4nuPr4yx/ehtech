const crypto = require('crypto')

const STATES = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ')
const ADDRESS_FIELDS = ['destinatario', 'telefone', 'identificacao', 'cep', 'uf', 'cidade', 'bairro', 'logradouro', 'numero', 'sem_numero', 'complemento', 'referencia', 'instrucoes', 'principal', 'salvar']

function validateAddress(input = {}) {
  const value = {}
  const errors = {}
  const limits = { destinatario: 150, telefone: 20, identificacao: 60, cep: 9, uf: 2, cidade: 100, bairro: 100, logradouro: 180, numero: 20, complemento: 150, referencia: 200, instrucoes: 500 }
  for (const [field, limit] of Object.entries(limits)) {
    value[field] = typeof input[field] === 'string' ? input[field].trim() : ''
    if (value[field].length > limit || /[\u0000-\u001f]/.test(value[field])) errors[field] = `Use até ${limit} caracteres válidos.`
  }
  value.sem_numero = input.sem_numero === true || input.sem_numero === 1
  value.principal = input.principal === true || input.principal === 1
  value.salvar = input.salvar !== false && input.salvar !== 0
  if (!value.salvar) value.principal = false
  if (!/^[^\d\s]+(?:\s+[^\d\s]+)+$/u.test(value.destinatario)) errors.destinatario = 'Informe o nome completo do destinatário.'
  if (!/^(?:\(?[1-9][0-9]\)?\s?)?(?:[0-9]{4,5}-?[0-9]{4})$/.test(value.telefone) || !/^[1-9][0-9][2-9][0-9]{7,8}$/.test(value.telefone.replace(/\D/g, ''))) errors.telefone = 'Informe um telefone válido com DDD (10 ou 11 dígitos).'
  value.telefone = value.telefone.replace(/\D/g, '')
  if (!/^\d{5}-?\d{3}$/.test(value.cep) || /^0{8}$/.test(value.cep.replace('-', ''))) errors.cep = 'O CEP informado é inválido.'
  value.cep = value.cep.replace('-', '')
  value.uf = value.uf.toUpperCase()
  if (!STATES.includes(value.uf)) errors.uf = 'Selecione um estado válido.'
  for (const [field, label] of [['cidade', 'cidade'], ['bairro', 'bairro'], ['logradouro', 'logradouro']]) {
    if (value[field].length < 2) errors[field] = `Informe ${label}.`
  }
  if (!value.identificacao) errors.identificacao = 'Identifique o endereço (Casa, Trabalho ou Outro).'
  if (value.sem_numero) value.numero = ''
  else if (!/^[\p{L}\p{N}][\p{L}\p{N}\s./-]{0,19}$/u.test(value.numero)) errors.numero = 'Informe o número ou marque Sem número.'
  return { value, errors, valid: Object.keys(errors).length === 0 }
}

function addressSnapshot(row) {
  const snapshot = Object.fromEntries(ADDRESS_FIELDS.map(field => [field, row[field]]))
  for (const field of ['principal', 'salvar', 'sem_numero']) snapshot[field] = Boolean(row[field])
  return snapshot
}

function addressFingerprint(address) {
  return crypto.createHash('sha256').update(JSON.stringify(ADDRESS_FIELDS.filter(field => !['principal', 'salvar'].includes(field)).map(field => address[field]))).digest('hex')
}

async function transaction(pool, callback) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const result = await callback(connection)
    await connection.commit()
    return result
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

function problem(status, mensagem, extra = {}) {
  return Object.assign(new Error(mensagem), { status, ...extra })
}

async function lookupCep(cep, fetcher = fetch) {
  if (!/^\d{8}$/.test(cep) || cep === '00000000') throw problem(400, 'O CEP informado é inválido.')
  let data
  try {
    const response = await fetcher(`https://viacep.com.br/ws/${cep}/json/`, { signal: AbortSignal.timeout(5000) })
    if (!response.ok) throw new Error('CEP indisponível')
    data = await response.json()
  } catch {
    throw problem(503, 'Consulta de CEP indisponível. Preencha o endereço manualmente ou tente novamente.')
  }
  if (data.erro) throw problem(404, 'Não encontramos esse CEP. Verifique os números digitados.')
  return { cep, uf: data.uf || '', cidade: data.localidade || '', bairro: data.bairro || '', logradouro: data.logradouro || '' }
}

module.exports = { ADDRESS_FIELDS, STATES, validateAddress, addressSnapshot, addressFingerprint, transaction, problem, lookupCep }
