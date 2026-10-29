const crypto = require('crypto')
const { problem } = require('./addresses')

const CHECKS = { funcionamento: 'Funcionamento', integridade: 'Integridade visual', temperatura: 'Temperaturas', armazenamento: 'Armazenamento', bateria: 'Bateria' }
const MISSIONS = [
  { id: 'estudar', titulo: 'Estudar e trabalhar', descricao: 'Notebook e configuração inicial para atividades cotidianas.', categorias: ['notebooks'], servico: 'suporte' },
  { id: 'home-office', titulo: 'Organizar o home office', descricao: 'Notebook, acessórios e áudio, com suporte para configurar o ambiente.', categorias: ['notebooks', 'acessorios', 'audio'], servico: 'suporte' },
  { id: 'wifi', titulo: 'Melhorar o Wi-Fi', descricao: 'Equipamento de rede e atendimento para avaliar cobertura e instalação.', categorias: ['redes'], servico: 'redes' }
]
const validId = value => /^[1-9]\d*$/.test(String(value)) && Number.isSafeInteger(Number(value))
const clean = (value, minimum, maximum) => typeof value === 'string' && value.trim().length >= minimum && value.trim().length <= maximum ? value.trim() : null
const cents = value => Math.round(Number(value) * 100)

function fingerprint(passport, product) {
  return crypto.createHash('sha256').update(JSON.stringify([
    Number(passport.id), Number(passport.proprietario_id), passport.nome, passport.tipo, passport.modelo, passport.componentes,
    Number(product.id_produto), Number(product.vendedor_id), product.nome, product.descricao, product.categoria, product.imagem, product.componente_id ?? null
  ])).digest('hex')
}

function checklistResult(checklist) {
  if (!checklist || typeof checklist !== 'object' || Array.isArray(checklist) || Object.keys(checklist).length !== Object.keys(CHECKS).length) return null
  for (const key of Object.keys(CHECKS)) {
    const allowed = ['funcionamento', 'integridade'].includes(key) ? ['aprovado', 'reprovado'] : ['aprovado', 'reprovado', 'nao_aplicavel']
    if (!allowed.includes(checklist[key])) return null
  }
  return Object.values(checklist).includes('reprovado') ? 'reprovado' : 'emitido'
}

function certificateStatus(certificate, passport, product, now = Date.now()) {
  if (certificate.status !== 'emitido') return certificate.status
  if (new Date(certificate.expira_em).getTime() <= now) return 'expirado'
  if (!passport || !product || product.status_aprovacao !== 'aprovado' || fingerprint(passport, product) !== certificate.ficha_hash) return 'desatualizado'
  return 'emitido'
}

const comboSelect = `SELECT c.*, p.nome AS produto_nome, p.preco AS produto_preco, p.estoque,
  s.titulo AS servico_titulo, s.slug AS servico_slug, s.preco_base, s.tipo_preco, s.modalidade,
  s.regiao, s.prestador_id FROM combos_instalacao c
  JOIN produtos p ON p.id_produto = c.produto_id JOIN servicos s ON s.id_servico = c.servico_id
  WHERE c.ativo = TRUE AND p.status_aprovacao = 'aprovado' AND p.estoque > 0
  AND s.status = 'ativo' AND s.status_aprovacao = 'aprovado' AND p.vendedor_id = c.criador_id AND s.prestador_id = c.criador_id`
const comboView = row => ({ ...row, produto_preco: Number(row.produto_preco), preco_base: row.preco_base === null ? null : Number(row.preco_base), total_estimado: row.preco_base === null ? null : (cents(row.produto_preco) + cents(row.preco_base)) / 100 })
async function findCombo(pool, id) {
  if (!validId(id)) throw problem(400, 'Combo inválido.')
  const [rows] = await pool.execute(`${comboSelect} AND c.id = ?`, [id])
  if (!rows.length) throw problem(409, 'Combo indisponível: confira aprovação, estoque e serviço.')
  return comboView(rows[0])
}

function recommend(mission, budget, products, services) {
  const service = services.filter(item => item.categoria === mission.servico && item.preco_base !== null && Number(item.preco_base) >= 0 && cents(item.preco_base) <= cents(budget)).sort((first, second) => cents(first.preco_base) - cents(second.preco_base) || first.id_servico - second.id_servico)[0]
  const serviceCost = service ? cents(service.preco_base) : 0
  const available = cents(budget) - serviceCost
  const groups = mission.categorias.map(category => products.filter(item => item.categoria?.toLowerCase() === category && Number(item.estoque) > 0 && Number(item.preco) > 0).sort((first, second) => cents(first.preco) - cents(second.preco) || first.id_produto - second.id_produto))
  return [0.5, 0.75, 1].map((portion, index) => {
    let remaining = Math.floor(Math.max(0, available) * portion)
    const items = [], missing = []
    groups.forEach((group, position) => {
      const reserve = groups.slice(position + 1).reduce((total, next) => total + (next.length ? cents(next[0].preco) : 0), 0)
      const candidates = group.filter(item => cents(item.preco) <= remaining - reserve)
      const selected = index === 0 ? candidates[0] : index === 1 ? candidates[Math.floor((candidates.length - 1) / 2)] : candidates.at(-1)
      if (!selected) { missing.push(mission.categorias[position]); return }
      items.push({ ...selected, preco: Number(selected.preco), motivo: `Categoria ${mission.categorias[position]} prevista nesta missão; seleção apenas por preço e disponibilidade.` })
      remaining -= cents(selected.preco)
    })
    const total = items.reduce((sum, item) => sum + cents(item.preco), serviceCost)
    return { faixa: ['Essencial', 'Intermediária', 'Ampliada'][index], teto_produtos: Math.floor(Math.max(0, available) * portion) / 100, produtos: items, servico: service ? { ...service, preco_base: Number(service.preco_base) } : null, faltantes: missing, total_estimado: total / 100, completo: !missing.length && Boolean(service) && total <= cents(budget), consumo_estimado: null }
  })
}

module.exports = { CHECKS, MISSIONS, validId, clean, fingerprint, checklistResult, certificateStatus, comboSelect, comboView, findCombo, recommend }
