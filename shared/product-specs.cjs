const base = [['marca', 'Marca', 'Ex.: Lenovo'], ['modelo', 'Modelo', 'Ex.: ThinkPad T480']]
const computer = [['processador', 'Processador', 'Ex.: Intel Core i5-8250U'], ['memoria_ram', 'Memória RAM', 'Ex.: 16 GB'], ['armazenamento', 'Armazenamento', 'Ex.: SSD de 512 GB']]
const screen = ['tela', 'Tela', 'Ex.: 14 pol. Full HD']
const connection = ['conexao', 'Conexão', 'Ex.: USB-C ou Bluetooth']
const fields = new Map([
  ['notebooks', [...computer, screen]],
  ['computadores', [...computer, ['placa_video', 'Placa de vídeo', 'Ex.: GeForce RTX 4060']]],
  ['smartphones', [...computer, screen, ['bateria', 'Bateria', 'Ex.: 5.000 mAh']]],
  ['tablets', [...computer, screen]],
  ['games', [['plataforma', 'Plataforma', 'Ex.: Xbox Series'], ['armazenamento', 'Armazenamento', 'Ex.: SSD de 512 GB']]],
  ['redes', [['padrao_wifi', 'Padrão Wi-Fi', 'Ex.: Wi-Fi 6'], ['bandas', 'Bandas', 'Ex.: 2,4 e 5 GHz'], ['portas', 'Portas', 'Ex.: 4 portas Gigabit']]],
  ['audio', [connection, ['microfone', 'Microfone', 'Ex.: Integrado']]],
  ['acessorios', [connection, ['compatibilidade', 'Compatibilidade informada', 'Ex.: Windows e macOS']]],
  ['gadgets', [connection]],
])
const specificationLimit = 80

function categoryKey(value) {
  return typeof value === 'string' ? value.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase().replace(/\s+/g, ' ') : ''
}

function specificationFields(category) {
  const key = categoryKey(category)
  return key ? [...base, ...(fields.get(key) || [])] : []
}

function normalizeSpecifications(category, raw, strict = false) {
  if (raw == null) return {}
  if (typeof raw !== 'object' || Array.isArray(raw)) return strict ? null : {}
  const allowed = specificationFields(category).map(([key]) => key)
  if (strict && Object.keys(raw).some(key => !allowed.includes(key))) return null
  const values = {}
  for (const key of allowed) {
    if (!Object.hasOwn(raw, key)) continue
    const value = raw[key]
    if (typeof value !== 'string' || value.length > specificationLimit || /\p{Cc}/u.test(value)) {
      if (strict) return null
      continue
    }
    if (value.trim()) values[key] = value.trim()
  }
  return values
}

function readSpecifications(category, raw) {
  try { return normalizeSpecifications(category, typeof raw === 'string' ? JSON.parse(raw) : raw) }
  catch { return {} }
}

module.exports = { categoryKey, specificationFields, specificationLimit, normalizeSpecifications, readSpecifications }
