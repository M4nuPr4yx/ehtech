const { problem } = require('./addresses')

const MISSIONS = [
  { id: 'estudar', titulo: 'Estudar e trabalhar', descricao: 'Notebook e configuração inicial para atividades cotidianas.', categorias: ['notebooks'], servico: 'suporte' },
  { id: 'home-office', titulo: 'Organizar o home office', descricao: 'Notebook, acessórios e áudio, com suporte para configurar o ambiente.', categorias: ['notebooks', 'acessorios', 'audio'], servico: 'suporte' },
  { id: 'wifi', titulo: 'Melhorar o Wi-Fi', descricao: 'Equipamento de rede e atendimento para avaliar cobertura e instalação.', categorias: ['redes'], servico: 'redes' }
]
const validId = value => /^[1-9]\d*$/.test(String(value)) && Number.isSafeInteger(Number(value))
const clean = (value, minimum, maximum) => typeof value === 'string' && value.trim().length >= minimum && value.trim().length <= maximum ? value.trim() : null
const cents = value => Math.round(Number(value) * 100)
const homeOfficeNames = {
  acessorios: /\b(teclados?|mouse|web[ -]?cams?|monitor(?:es)?)\b/i,
  audio: /\b(headsets?|headphones?|fones?|microfones?)\b/i
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

function searchMissionOptions(mission, budget, products, services) {
  const ceiling = cents(budget)
  return {
    categorias: mission.categorias.map(categoria => {
      const matcher = mission.id === 'home-office' ? homeOfficeNames[categoria] : null
      const available = products.filter(item => item.categoria?.toLowerCase() === categoria && Number(item.estoque) > 0 && cents(item.preco) <= ceiling)
      return {
        categoria,
        produtos: available.filter(item => !matcher || matcher.test(item.nome))
          .sort((a, b) => cents(a.preco) - cents(b.preco) || Number(a.id_produto) - Number(b.id_produto))
          .map(item => ({ ...item, preco: Number(item.preco) }))
      }
    }),
    servicos: services.filter(item => item.categoria === mission.servico && item.preco_base !== null && item.preco_base !== undefined && cents(item.preco_base) <= ceiling)
      .sort((a, b) => cents(a.preco_base) - cents(b.preco_base) || Number(a.id_servico) - Number(b.id_servico))
      .map(item => ({ ...item, preco_base: Number(item.preco_base) }))
  }
}

module.exports = { MISSIONS, validId, clean, comboSelect, comboView, findCombo, searchMissionOptions }
