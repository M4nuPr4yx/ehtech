const express = require('express')
const { createCompatibilityAssistant } = require('../backend/components/ai')
const { createHandler } = require('../backend/serverless')
const { requestPath } = require('../backend/request-path')

const env = { GEMINI_API_KEY: 'fixture-private-not-real', VERCEL: '1' }
const fetchImpl = async (url, options) => {
  const context = JSON.parse(JSON.parse(options.body).contents[0].parts[0].text).dados_tecnicos
  const answer = { status: 'nao_verificado', resumo: 'Prévia de interface com IA simulada: faltam especificações oficiais para concluir.', pontos: [{ titulo: 'Confirmar suporte no fabricante', status: 'nao_verificado', explicacao: 'A fonte não informa socket da CPU, lista de suporte e BIOS mínima da placa-mãe.', acao: 'Confira o código exato das peças e a lista de suporte do fabricante.', componentes: context.componentes.map(item => item.id) }] }
  return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(answer) }] } }] })
}
const app = express()
app.use((req, res, next) => { const query = new URL(req.url, 'http://localhost').search; req.url = requestPath(req.url) + query; next() })
app.use(express.json())
app.use('/componentes', require('../backend/routes/components')({ execute() { throw new Error('Prévia não acessa banco') } }, (req, res) => res.sendStatus(401), {
  assistant: createCompatibilityAssistant({ env, fetchImpl }), evaluator: createCompatibilityAssistant({ env, fetchImpl, assessment: true })
}))
app.initDatabaseTables = () => { throw new Error('Prévia não inicializa banco') }
const server = require('node:http').createServer(createHandler(app)).listen(3002, '127.0.0.1', () => console.log('Prévia sem banco/IA externa: http://127.0.0.1:3002. Envie stop para encerrar.'))
process.stdin.on('data', data => { if (String(data).trim() === 'stop') { server.closeAllConnections(); server.close(() => process.exit(0)) } })
