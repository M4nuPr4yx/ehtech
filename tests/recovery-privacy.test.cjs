const { test } = require('node:test')
const assert = require('node:assert/strict')
const http = require('node:http')
const express = require('express')

test('recuperação sem SMTP não registra link nem e-mail, mantendo resposta genérica', async t => {
  const prior = { SMTP_HOST: process.env.SMTP_HOST, SMTP_USER: process.env.SMTP_USER }
  process.env.SMTP_HOST = ''
  process.env.SMTP_USER = ''
  const logs = []
  t.mock.method(console, 'log', (...args) => logs.push(args.join(' ')))
  const pool = { async execute(sql) { return [sql.startsWith('SELECT') ? [{ id_usuario: 1 }] : [], []] } }
  const app = express()
  app.use(express.json())
  app.use(require('../backend/routes/recovery')(pool, { passwordResetLimiter: (req, res, next) => next() }))
  const server = http.createServer(app)
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
    const response = await fetch(`http://127.0.0.1:${server.address().port}/esqueci-senha`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'somente.teste@gmail.com' }) })
    assert.equal(response.status, 200)
    assert.match((await response.json()).mensagem, /^Se o e-mail/)
    assert.ok(logs.every(line => !/somente\.teste|redefinir-senha|token=/.test(line)))
  } finally {
    await new Promise(resolve => server.close(resolve))
    for (const [key, value] of Object.entries(prior)) { if (value === undefined) delete process.env[key]; else process.env[key] = value }
  }
})
