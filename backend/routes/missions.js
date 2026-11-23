const express = require('express')
const { MISSIONS, searchMissionOptions } = require('../differentials')

function createMissionsRouter(pool) {
  const router = express.Router()
  router.get('/', (req, res) => res.json(MISSIONS))
  const search = async (req, res) => {
    const mission = MISSIONS.find(item => item.id === req.body.missao)
    const budget = req.body.orcamento
    if (!mission || typeof budget !== 'number' || !Number.isFinite(budget) || budget < 1 || budget > 1000000) return res.status(400).json({ mensagem: 'Escolha um objetivo e informe um limite entre R$ 1 e R$ 1.000.000 por item.' })
    res.set('Cache-Control', 'no-store')
    try {
      const products = []
      for (const category of mission.categorias) {
        const [rows] = await pool.execute("SELECT id_produto, nome, preco, estoque, categoria, componente_id FROM produtos WHERE status_aprovacao = 'aprovado' AND estoque > 0 AND LOWER(categoria) = ? AND preco <= ? ORDER BY preco, id_produto LIMIT 100", [category, budget])
        products.push(...rows)
      }
      const [services] = await pool.execute("SELECT id_servico, titulo, slug, categoria, preco_base, tipo_preco, modalidade, regiao FROM servicos WHERE status = 'ativo' AND status_aprovacao = 'aprovado' AND categoria = ? AND preco_base IS NOT NULL AND preco_base <= ? ORDER BY preco_base, id_servico LIMIT 100", [mission.servico, budget])
      res.json({ missao: mission, orcamento: budget, opcoes: searchMissionOptions(mission, budget, products, services), regras: ['O limite vale para cada item; os resultados não são uma montagem recomendada.', 'Os anúncios disponíveis são ordenados pelo menor preço. Para home office, acessórios e áudio são filtrados pelo tipo identificado no título.', 'Confirme as especificações com o anunciante. Frete e valor final do serviço são combinados à parte.'] })
    } catch {
      res.status(500).json({ mensagem: 'Não foi possível buscar agora. Tente novamente.' })
    }
  }
  router.post('/buscar', search)
  return router
}
module.exports = createMissionsRouter
