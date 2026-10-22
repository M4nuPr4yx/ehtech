const { assessmentContext } = require('./expanded-catalog')
const { SEEDS } = require('./seeds')
const snapshot = require('./data/catalog.json')
const normalize = value => value.toLowerCase().replace(/\s+/g, ' ').trim()
const counts = new Map()
for (const item of snapshot.items) { const key = item.tipo + ':' + normalize(item.modelo); counts.set(key, (counts.get(key) || 0) + 1) }
function basicCheck(body) {
  const context = assessmentContext(body), parts = context.componentes, checks = []
  const reviewed = item => item && counts.get(item.tipo + ':' + normalize(item.modelo)) === 1 ? SEEDS.find(seed => seed.tipo === item.tipo && normalize(`${seed.marca} ${seed.modelo}`) === normalize(item.modelo)) : null
  const cpu = parts.find(item => item.tipo === 'processador'), board = parts.find(item => item.tipo === 'placa_mae'), memories = parts.filter(item => item.tipo === 'memoria')
  const c = reviewed(cpu), b = reviewed(board)
  const add = (codigo, status, titulo, mensagem, sources = []) => checks.push({ codigo, status, titulo, mensagem, fontes: sources.flatMap(item => item?.fontes || []) })
  if (!cpu) add('cpu_ausente', 'nao_verificado', 'Processador ausente', 'Selecione o modelo exato do processador.')
  if (!board) add('placa_ausente', 'nao_verificado', 'Placa-mãe ausente', 'Selecione o modelo exato da placa-mãe.')
  if (cpu && board) {
    const cpuSocket = c?.especificacoes.socket, boardSocket = b?.especificacoes.socket || board.especificacoes.socket
    add('socket', !cpuSocket || !boardSocket ? 'nao_verificado' : cpuSocket === boardSocket ? 'compativel' : 'incompativel', 'Encaixe do processador', !cpuSocket || !boardSocket ? 'Falta uma correspondência inequívoca com ficha revisada do processador. Não inferimos o socket pelo nome.' : `${cpu.modelo}: ${cpuSocket}. ${board.modelo}: ${boardSocket}.`, [c, b])
    if (cpuSocket && cpuSocket === boardSocket) {
      const support = b?.especificacoes.suporte_cpu?.[c.slug], bios = context.bios_informada
      const known = bios && b?.especificacoes.bios_versoes?.includes(bios)
      add('bios', !support ? 'nao_verificado' : !bios ? 'condicional' : !known ? 'nao_verificado' : Number(bios) < Number(support.bios_minima) ? 'condicional' : 'compativel', 'Suporte e BIOS', !support ? 'Não temos uma lista revisada de suporte para esta combinação.' : !bios ? `Confirme a BIOS instalada: versão mínima revisada ${support.bios_minima}.` : !known ? 'A BIOS informada não está na lista de versões revisadas.' : `BIOS informada: ${bios}; mínima revisada: ${support.bios_minima}.`, [b])
    }
  }
  if (!memories.length) add('ram_ausente', 'nao_verificado', 'Memória ausente', 'Selecione a memória para conferir geração, módulos e capacidade.')
  for (const memory of memories) {
    const ram = reviewed(memory), type = ram?.especificacoes.memoria_tipo || ([4, 5].includes(memory.especificacoes.speed?.[0]) ? `DDR${memory.especificacoes.speed[0]}` : null)
    const expected = b?.especificacoes.memoria_tipo
    add('ddr_' + memory.id, !type || !expected ? 'nao_verificado' : type === expected ? 'compativel' : 'incompativel', `Geração de memória: ${memory.modelo}`, !type || !expected ? 'Falta a geração DDR da memória ou uma ficha revisada da placa-mãe.' : `Memória: ${type}. Placa-mãe: ${expected}.`, [ram, b])
    if (!ram) add('formato_' + memory.id, 'nao_verificado', 'Formato e variante da memória', 'O nome comercial não identifica uma ficha revisada inequívoca. Confira código exato, DIMM/SODIMM, tensão e QVL no fabricante.')
  }
  const modules = memories.every(item => Array.isArray(item.especificacoes.modules) && item.especificacoes.modules.length === 2 && item.especificacoes.modules.every(value => Number.isInteger(value) && value > 0)) ? memories.reduce((sum, item) => sum + item.quantidade * item.especificacoes.modules[0], 0) : null
  const capacity = modules === null ? null : memories.reduce((sum, item) => sum + item.quantidade * item.especificacoes.modules[0] * item.especificacoes.modules[1], 0)
  if (board && memories.length) {
    const slots = b?.especificacoes.memoria_slots || board.especificacoes.memory_slots
    const maximum = b?.especificacoes.memoria_max_gb || board.especificacoes.max_memory
    add('slots', !slots || modules === null ? 'nao_verificado' : modules > slots ? 'incompativel' : 'compativel', 'Quantidade de módulos', !slots || modules === null ? 'Faltam dados de módulos ou slots.' : `${modules} módulos para ${slots} slots.`, [b])
    add('capacidade', !maximum || capacity === null ? 'nao_verificado' : capacity > maximum ? 'incompativel' : 'compativel', 'Capacidade de memória', !maximum || capacity === null ? 'Faltam dados de capacidade.' : `${capacity} GB selecionados; limite da placa-mãe: ${maximum} GB.`, [b])
    if (c?.especificacoes.memoria_max_gb && capacity !== null) add('capacidade_cpu', capacity > c.especificacoes.memoria_max_gb ? 'incompativel' : 'compativel', 'Limite de memória do processador', `${capacity} GB selecionados; limite revisado da CPU: ${c.especificacoes.memoria_max_gb} GB.`, [c])
  }
  if (memories.reduce((sum, item) => sum + item.quantidade, 0) > 1) add('kits', 'condicional', 'Combinação de kits', 'Combinar kits exige verificar suporte e estabilidade; não equivale a um kit único.')
  for (const part of parts.filter(item => !['processador', 'placa_mae', 'memoria'].includes(item.tipo))) add('fora_' + part.id, 'nao_verificado', `Fora desta checagem: ${part.modelo}`, 'Conectores, potência, dimensões e funcionamento deste componente não foram verificados.')
  const status = ['incompativel', 'nao_verificado', 'condicional', 'compativel'].find(value => checks.some(check => check.status === value)) || 'nao_verificado'
  return { status, metodo: 'regras_locais', verificacoes: checks, memoria_total_gb: capacity, modulos_total: modules, catalogo: context.catalogo, componentes: parts, limites: ['Checagem sem provedor de IA. Fichas locais revisadas em 06/10/2026; demais campos vêm do catálogo comunitário identificado acima.', 'Correspondência a ficha revisada exige nome completo único no catálogo. Não deduzimos variantes ou especificações ausentes.', 'Não certifica QVL, frequências, overclock, tensão, estabilidade, peças usadas, fonte, vídeo, armazenamento, cooler ou gabinete. Confirme dados no fabricante antes da compra.'] }
}
module.exports = { basicCheck }
