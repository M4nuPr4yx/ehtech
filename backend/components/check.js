const { integer } = require('../validation')
const { biosVersion } = require('./catalog')

function normalizeSelection(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  const optionalId = value => value === undefined || value === null || value === '' ? null : integer(value)
  const processador_id = optionalId(body.processador_id)
  const placa_mae_id = optionalId(body.placa_mae_id)
  if ([processador_id, placa_mae_id].some(value => value !== null && (!Number.isInteger(value) || value <= 0))) return null
  if (!Array.isArray(body.memorias) || body.memorias.length > 4) return null
  const memorias = body.memorias.map(item => ({ componente_id: integer(item?.componente_id), quantidade: integer(item?.quantidade ?? 1) }))
  if (memorias.some(item => !Number.isInteger(item.componente_id) || item.componente_id <= 0 || !Number.isInteger(item.quantidade) || item.quantidade < 1 || item.quantidade > 4)) return null
  if (new Set(memorias.map(item => item.componente_id)).size !== memorias.length) return null
  const bios = body.bios === undefined || body.bios === null || body.bios === '' ? null : body.bios
  if (bios !== null && !biosVersion(bios)) return null
  return { processador_id, placa_mae_id, memorias, bios }
}

function verify(selection, catalogue) {
  const checks = []
  const selectedIds = [selection.processador_id, selection.placa_mae_id, ...selection.memorias.map(item => item.componente_id)].filter(Boolean)
  const selected = selectedIds.map(id => catalogue.find(item => item.id === id && item.status === 'verificado' && item.ativo)).filter(Boolean)
  const usable = (id, type) => catalogue.find(item => item.id === id && item.tipo === type && item.status === 'verificado' && item.ativo)
  const cpu = usable(selection.processador_id, 'processador')
  const board = usable(selection.placa_mae_id, 'placa_mae')
  const memories = selection.memorias.map(item => ({ ...item, model: usable(item.componente_id, 'memoria') }))
  const add = (codigo, status, titulo, mensagem, components = []) => checks.push({ codigo, status, titulo, mensagem,
    componentes: components.map(item => item.id), fontes: [...new Map(components.flatMap(item => item.fontes).map(item => [item.url, item])).values()] })

  if (!cpu) add('processador_ausente', 'nao_verificado', 'Processador não identificado', 'Selecione um processador ativo com ficha técnica revisada.')
  if (!board) add('placa_ausente', 'nao_verificado', 'Placa-mãe não identificada', 'Selecione uma placa-mãe ativa com ficha técnica revisada.')
  if (!memories.length) add('memoria_ausente', 'nao_verificado', 'Memória não selecionada', 'Selecione pelo menos um modelo de memória.')
  if (cpu && board) {
    const c = cpu.especificacoes, b = board.especificacoes
    if (!c.socket || !b.socket) add('socket', 'nao_verificado', 'Encaixe do processador', 'Falta a especificação de socket.', [cpu, board])
    else if (c.socket !== b.socket) add('socket', 'incompativel', 'Encaixes diferentes', `O processador usa ${c.socket}; a placa-mãe usa ${b.socket}.`, [cpu, board])
    else {
      add('socket', 'compativel', 'Encaixes correspondem', `Processador e placa-mãe usam ${c.socket}.`, [cpu, board])
      const support = b.suporte_cpu && Object.hasOwn(b.suporte_cpu, cpu.slug) ? b.suporte_cpu[cpu.slug] : null
      if (!support) add('suporte_cpu', 'nao_verificado', 'Suporte deste processador', 'Não há um registro revisado para esta combinação. A ausência na nossa base não comprova incompatibilidade.', [cpu, board])
      else if (!selection.bios) add('bios', 'condicional', 'Confirme a BIOS instalada', `O fabricante lista este processador a partir da BIOS ${support.bios_minima}. Informe a versão instalada para concluir esta verificação.`, [board])
      else if (!b.bios_versoes?.includes(selection.bios)) add('bios', 'nao_verificado', 'Versão de BIOS não revisada', 'A versão informada ainda não está na nossa lista de versões revisadas.', [board])
      else if (Number(selection.bios) < Number(support.bios_minima)) add('bios', 'condicional', 'Atualização de BIOS necessária', `A BIOS informada é ${selection.bios}; este processador exige ${support.bios_minima} ou posterior. Consulte o procedimento do fabricante antes da troca.`, [board])
      else add('bios', 'compativel', 'Processador listado pelo fabricante', `A BIOS ${selection.bios}, informada por você, atende à versão mínima ${support.bios_minima}.`, [board])
    }
  }

  for (const memory of memories) {
    const ram = memory.model
    if (!ram) { add(`memoria_${memory.componente_id}`, 'nao_verificado', 'Modelo de memória não revisado', 'Esta memória está ausente, inativa ou ainda não foi revisada.'); continue }
    const r = ram.especificacoes
    if (board) {
      const b = board.especificacoes
      for (const [field, title] of [['memoria_tipo', 'Geração da memória'], ['memoria_formato', 'Formato da memória']]) {
        if (!r[field] || !b[field]) add(`${field}_${ram.id}`, 'nao_verificado', title, 'Faltam especificações para comparar esta memória e a placa-mãe.', [ram, board])
        else add(`${field}_${ram.id}`, r[field] === b[field] ? 'compativel' : 'incompativel', title,
          `${ram.modelo}: ${r[field]}. A placa-mãe exige ${b[field]}.`, [ram, board])
      }
    }
    if (cpu) {
      const types = cpu.especificacoes.memoria_tipos
      if (!types || !r.memoria_tipo) add(`controlador_${ram.id}`, 'nao_verificado', 'Memória suportada pelo processador', 'Falta o padrão de memória suportado.', [cpu, ram])
      else add(`controlador_${ram.id}`, types.includes(r.memoria_tipo) ? 'compativel' : 'incompativel', 'Memória suportada pelo processador',
        `O processador suporta ${types.join(', ')}; a memória selecionada é ${r.memoria_tipo}.`, [cpu, ram])
    }
  }

  const allKnown = memories.length && memories.every(item => item.model)
  const allModules = allKnown && memories.every(item => Number.isInteger(item.model.especificacoes.modulos))
  const allCapacity = allKnown && memories.every(item => Number.isInteger(item.model.especificacoes.capacidade_gb))
  const modules = allModules ? memories.reduce((sum, item) => sum + item.quantidade * item.model.especificacoes.modulos, 0) : null
  const capacity = allCapacity ? memories.reduce((sum, item) => sum + item.quantidade * item.model.especificacoes.capacidade_gb, 0) : null
  if (board && memories.length) {
    const slots = board.especificacoes.memoria_slots
    add('slots', modules === null || !slots ? 'nao_verificado' : modules > slots ? 'incompativel' : 'compativel', 'Quantidade de módulos',
      modules === null || !slots ? 'Falta a quantidade de módulos ou de slots da placa-mãe.' : `${modules} módulo(s) selecionado(s) para ${slots} slot(s).`, [board])
  }
  for (const item of [cpu, board].filter(Boolean)) {
    if (!memories.length) continue
    const maximum = item.especificacoes.memoria_max_gb
    add(`capacidade_${item.tipo}`, capacity === null || !maximum ? 'nao_verificado' : capacity > maximum ? 'incompativel' : 'compativel', `Capacidade de memória: ${item.modelo}`,
      capacity === null || !maximum ? 'Falta a capacidade do kit ou o limite de memória deste componente.' : `${capacity} GB selecionados; limite declarado de ${maximum} GB.`, [item])
  }
  if (selection.memorias.reduce((sum, item) => sum + item.quantidade, 0) > 1) add('multiplos_kits', 'condicional', 'Combinação de kits de memória', 'Misturar kits, mesmo do mesmo modelo, exige conferir a configuração e a estabilidade. Prefira um único kit dimensionado para sua necessidade.', memories.filter(item => item.model).map(item => item.model))
  const statuses = checks.map(item => item.status)
  const status = ['incompativel', 'nao_verificado', 'condicional', 'compativel'].find(value => statuses.includes(value)) || 'nao_verificado'
  return { status, verificado_em: new Date().toISOString(), metodo: 'regras', selecao: selection,
    componentes: selected, verificacoes: checks, memoria_total_gb: capacity, modulos_total: modules,
    limites: ['Verifica somente processador, placa-mãe e memória para PCs de mesa.', 'Não verifica fonte, placa de vídeo, gabinete, cooler, armazenamento nem funcionamento de peças usadas.', 'Velocidades de memória, overclock e presença na lista QVL não são certificados por esta análise.'],
    observacoes: cpu?.especificacoes.video_integrado === false ? ['Este processador não tem vídeo integrado e requer uma placa de vídeo dedicada para exibir imagem.'] : [] }
}

module.exports = { normalizeSelection, verify }
