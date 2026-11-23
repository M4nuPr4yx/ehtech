const { categoryKey } = require('./product-categories.cjs')

const conditions = ['Novo', 'Seminovo', 'Usado', 'Recondicionado', 'Com defeito ou para peças']
const base = [['condicao', 'Estado de conservação', '', conditions], ['marca', 'Marca', 'Ex.: Lenovo'], ['modelo', 'Modelo', 'Ex.: ThinkPad T480']]
const computer = [['processador', 'Processador', 'Ex.: Intel Core i5-8250U'], ['memoria_ram', 'Memória RAM', 'Ex.: 16 GB'], ['armazenamento', 'Armazenamento', 'Ex.: SSD de 512 GB']]
const screen = ['tela', 'Tela', 'Ex.: 14 pol. Full HD']
const connection = ['conexao', 'Conexão', 'Ex.: USB-C ou Bluetooth']
const items = ['itens_inclusos', 'Itens inclusos', 'Ex.: Cabo, fonte e caixa original']
const gpu = ['placa_video', 'Placa de vídeo', 'Ex.: GeForce RTX 4060']
const frequency = ['frequencia', 'Frequência', 'Ex.: 144 Hz']
const format = ['formato', 'Formato', 'Ex.: micro-ATX']
const watts = ['potencia', 'Potência', 'Ex.: 650 W']
const fields = new Map([
  ['notebooks', [...computer, screen]],
  ['computadores', [...computer, gpu]],
  ['setups', [...computer, gpu, ['monitor', 'Monitor incluso', 'Ex.: 24 pol. Full HD'],
    ['perifericos', 'Periféricos inclusos', 'Ex.: Teclado, mouse e headset'], ['mobiliario', 'Mesa ou cadeira inclusa', 'Ex.: Mesa de 120 cm']]],
  ['smartphones', [...computer, screen, ['bateria', 'Bateria', 'Ex.: 5.000 mAh']]],
  ['tablets', [...computer, screen]],
  ['games', [['plataforma', 'Plataforma', 'Ex.: Xbox Series'], ['armazenamento', 'Armazenamento', 'Ex.: SSD de 512 GB']]],
  ['redes', [['padrao_wifi', 'Padrão Wi-Fi', 'Ex.: Wi-Fi 6'], ['bandas', 'Bandas', 'Ex.: 2,4 e 5 GHz'], ['portas', 'Portas', 'Ex.: 4 portas Gigabit']]],
  ['audio', [connection, ['microfone', 'Microfone', 'Ex.: Integrado']]],
  ['monitores', [screen, frequency, ['painel', 'Tipo de painel', 'Ex.: IPS'], connection]],
  ['teclados', [connection, ['layout', 'Layout', 'Ex.: ABNT2'], ['switch', 'Tipo de tecla ou switch', 'Ex.: Mecânico Brown']]],
  ['mouses', [connection, ['dpi', 'Resolução do sensor', 'Ex.: 8.000 DPI'], ['botoes', 'Quantidade de botões', 'Ex.: 6']]],
  ['mousepads', [['dimensoes', 'Dimensões', 'Ex.: 90 × 40 cm'], ['material', 'Material', 'Ex.: Tecido e borracha']]],
  ['processadores', [['socket', 'Socket', 'Ex.: AM5'], ['nucleos', 'Núcleos', 'Ex.: 6']]],
  ['placas-mae', [['socket', 'Socket', 'Ex.: LGA1700'], ['chipset', 'Chipset', 'Ex.: B760'], format]],
  ['memorias', [['tipo_memoria', 'Tipo de memória', 'Ex.: DDR5'], ['capacidade', 'Capacidade', 'Ex.: Kit 2 × 16 GB'], ['frequencia', 'Velocidade', 'Ex.: 6.000 MT/s']]],
  ['placas-de-video', [['vram', 'Memória de vídeo', 'Ex.: 8 GB GDDR6'], connection]],
  ['armazenamento', [['capacidade', 'Capacidade', 'Ex.: 1 TB'], ['interface', 'Interface', 'Ex.: NVMe PCIe 4.0'], ['formato', 'Formato', 'Ex.: M.2 2280']]],
  ['fontes', [watts, format, ['certificacao', 'Eficiência informada', 'Ex.: 80 Plus Gold']]],
  ['gabinetes', [format, ['dimensoes', 'Dimensões', 'Ex.: 40 × 21 × 46 cm']]],
  ['refrigeracao', [['socket', 'Sockets compatíveis', 'Ex.: AM4 e AM5'], ['tipo_cooler', 'Tipo de refrigeração', 'Ex.: Air cooler ou AIO de 240 mm']]],
  ['webcams', [['resolucao', 'Resolução de vídeo', 'Ex.: 1080p a 30 fps'], connection]],
  ['cameras', [['resolucao', 'Resolução', 'Ex.: 24 MP'], ['lente', 'Lente ou encaixe', 'Ex.: Canon EF-S 18–55 mm']]],
  ['tv', [screen, frequency, connection]],
  ['smartwatches', [screen, connection, ['bateria', 'Autonomia', 'Ex.: até 7 dias']]],
  ['controles', [['plataforma', 'Plataforma', 'Ex.: Nintendo Switch'], connection]],
  ['impressoras', [['tecnologia', 'Tecnologia', 'Ex.: Laser monocromática'], connection]],
  ['energia', [watts, ['tensao', 'Tensão', 'Ex.: Entrada 127 V e saída 115 V']]],
  ['mobiliario', [['dimensoes', 'Dimensões', 'Ex.: 120 × 60 cm'], ['material', 'Material', 'Ex.: MDF e aço']]],
  ['acessorios', [connection, ['compatibilidade', 'Compatibilidade informada', 'Ex.: Windows e macOS']]],
  ['gadgets', [connection]],
])
const specificationLimit = 80

function specificationFields(category) {
  const key = categoryKey(category)
  return key ? [...base, ...(fields.get(key) || []), items] : []
}

function normalizeSpecifications(category, raw, strict = false) {
  if (raw == null) return {}
  if (typeof raw !== 'object' || Array.isArray(raw)) return strict ? null : {}
  const allowed = new Map(specificationFields(category).map(([key, , , options]) => [key, options]))
  if (strict && Object.keys(raw).some(key => !allowed.has(key))) return null
  const values = {}
  for (const [key, options] of allowed) {
    if (!Object.hasOwn(raw, key)) continue
    const value = raw[key]
    if (typeof value !== 'string' || value.length > specificationLimit || /\p{Cc}/u.test(value) || (options && value.trim() && !options.includes(value.trim()))) {
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
