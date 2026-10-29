const express = require('express')
const { MISSIONS, recommend } = require('../differentials')

function createMissionsRouter(pool) {
  const router = express.Router()
  router.get('/', (req, res) => res.json(MISSIONS))
  router.post('/recomendar', async (req, res) => {
    const mission = MISSIONS.find(item => item.id === req.body.missao)
    const budget = req.body.orcamento
    if (!mission || typeof budget !== 'number' || !Number.isFinite(budget) || budget < 1 || budget > 1000000) return res.status(400).json({ mensagem: 'Selecione uma missão e informe orçamento entre R$ 1 e R$ 1.000.000.' })
    res.set('Cache-Control', 'no-store')
    try {
      const products = []
      for (const category of mission.categorias) {
        const [rows] = await pool.execute("SELECT id_produto, nome, preco, estoque, categoria, componente_id FROM produtos WHERE status_aprovacao = 'aprovado' AND estoque > 0 AND LOWER(categoria) = ? ORDER BY preco, id_produto LIMIT 100", [category])
        products.push(...rows)
      }
      const [services] = await pool.execute("SELECT id_servico, titulo, slug, categoria, preco_base, tipo_preco, modalidade, regiao FROM servicos WHERE status = 'ativo' AND status_aprovacao = 'aprovado' AND categoria = ? ORDER BY preco_base, id_servico LIMIT 100", [mission.servico])
      res.json({ missao: mission, orcamento: budget, faixas: recommend(mission, budget, products, services), regras: ['Faixas usam 50%, 75% e 100% do saldo após o serviço de menor preço-base informado; valores maiores não significam maior desempenho.', 'Até 100 anúncios por categoria, ordenados por menor preço. Produtos aprovados e com estoque; disponibilidade pode mudar.', 'Compatibilidade, cobertura Wi-Fi, desempenho e consumo elétrico precisam de avaliação técnica. Consumo não estimado por falta de dados.', 'Preço-base de serviço não é proposta final. Frete não incluso. A partir de/sob consulta dependem de orçamento. Não compra nem reserva itens.'] })
    } catch {
      res.status(500).json({ mensagem: 'Não foi possível montar as opções para essa missão.' })
    }
  })
  return router
}
module.exports = createMissionsRouter
