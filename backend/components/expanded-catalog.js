const snapshot = require('./data/catalog.json')
const { AssistantError } = require('./ai')

const LABELS = { processador: 'Processador Intel / AMD', placa_mae: 'Placa-mãe', memoria: 'Memória RAM', placa_video: 'Placa de vídeo', armazenamento: 'SSD / HD', fonte: 'Fonte', gabinete: 'Gabinete', cooler: 'Cooler' }
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
const entries = snapshot.items.map(item => ({ ...item, search: normalize(`${item.modelo} ${JSON.stringify(item.especificacoes)}`) }))
const byId = new Map(entries.map(item => [item.id, item]))
const publicItem = ({ search, ...item }) => item
const metadata = { fonte: snapshot.fonte, revisao: snapshot.revisao, data_fonte: snapshot.data_fonte, licenca: snapshot.licenca, total: entries.length, categorias: Object.entries(LABELS).map(([tipo, nome]) => ({ tipo, nome, total: snapshot.contagens[tipo] })) }

function searchCatalog(query) {
  const { tipo, busca = '', pagina = '1' } = query
  if (Object.keys(query).some(key => !['tipo', 'busca', 'pagina'].includes(key)) || typeof tipo !== 'string' || !Object.hasOwn(LABELS, tipo) || typeof busca !== 'string' || busca.length > 100 || typeof pagina !== 'string' || !/^[1-9]\d{0,4}$/.test(pagina)) throw new AssistantError('filtro_invalido', 'Escolha uma categoria, uma busca de até 100 caracteres e uma página válida.', 400)
  const terms = normalize(busca).split(/\s+/).filter(Boolean)
  const matches = entries.filter(item => item.tipo === tipo && terms.every(term => item.search.includes(term)))
  const page = Number(pagina), limit = 30
  return { items: matches.slice((page - 1) * limit, page * limit).map(publicItem), pagina: page, limite: limit, total: matches.length, mais: page * limit < matches.length, catalogo: metadata }
}

function assessmentContext(body) {
  if (!body || Object.keys(body).some(key => !['componentes', 'bios'].includes(key)) || !Array.isArray(body.componentes) || body.componentes.length < 2 || body.componentes.length > 16 || Buffer.byteLength(JSON.stringify(body)) > 4096 || (body.bios !== undefined && (typeof body.bios !== 'string' || !/^[a-zA-Z0-9. _-]{0,40}$/.test(body.bios)))) throw new AssistantError('selecao_invalida', 'Selecione de 2 a 16 peças e informe somente os identificadores, quantidades e a BIOS.', 400)
  const seen = new Set(), single = new Set()
  const componentes = body.componentes.map(selection => {
    if (!selection || Object.keys(selection).some(key => !['id', 'quantidade'].includes(key)) || typeof selection.id !== 'string' || !byId.has(selection.id) || seen.has(selection.id) || !Number.isInteger(selection.quantidade) || selection.quantidade < 1 || selection.quantidade > 4) throw new AssistantError('selecao_invalida', 'Há peças desconhecidas, repetidas ou quantidades inválidas.', 400)
    const item = byId.get(selection.id)
    if (!['memoria', 'armazenamento', 'placa_video'].includes(item.tipo)) {
      if (single.has(item.tipo) || selection.quantidade !== 1) throw new AssistantError('selecao_invalida', 'Escolha somente uma peça por categoria, exceto memória, armazenamento e vídeo.', 400)
      single.add(item.tipo)
    }
    seen.add(selection.id)
    return { ...publicItem(item), quantidade: selection.quantidade }
  })
  componentes.sort((first, second) => first.id.localeCompare(second.id))
  return { componentes, bios_informada: body.bios?.trim() || null, catalogo: { fonte: metadata.fonte, revisao: metadata.revisao, data_fonte: metadata.data_fonte }, limitacoes: ['Catálogo comunitário, sem revisão individual pelo EHtech. Campos ausentes não devem ser inventados.', 'CPUs não possuem socket nesta fonte; placas-mãe não possuem lista de CPUs suportadas, BIOS mínima, geração DDR ou QVL.', 'Coolers não possuem lista de sockets; fontes e gabinetes não possuem todas as conexões e dimensões.', 'Nomes podem representar variantes. Confirme o código exato, o manual e a lista de suporte do fabricante antes da compra.'] }
}

module.exports = { metadata, searchCatalog, assessmentContext }
