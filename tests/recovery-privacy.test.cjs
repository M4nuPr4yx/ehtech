const { test } = require('node:test')
const assert = require('node:assert/strict')
const http = require('node:http')
const express = require('express')

test('biblioteca de e-mail corrigida compõe a recuperação local sem mudar o destinatário', async () => {
  const nodemailer = require('nodemailer')
  const transport = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'unix' })
  const link = 'https://example.test/redefinir-senha?token=' + 'a'.repeat(64)
  const mail = await transport.sendMail({
    from: '"EHtech" <noreply@example.test>',
    to: '"Cliente, da EHtech" <cliente@example.test>',
    subject: 'Redefinicao de senha - EHtech',
    html: `<p><a href="${link}">Redefinir senha</a></p>`,
    disableFileAccess: true,
    disableUrlAccess: true
  })
  assert.deepEqual(mail.envelope.to, ['cliente@example.test'])
  assert.equal(mail.envelope.from, 'noreply@example.test')
  const content = mail.message.toString('utf8')
  assert.match(content, /Content-Type: text\/html/)
  const encodedBody = content.split(/\r?\n\r?\n/).slice(1).join('\n\n')
  const html = /Content-Transfer-Encoding: quoted-printable/i.test(content)
    ? encodedBody.replace(/=\r?\n/g, '').replace(/=([0-9a-f]{2})/gi, (_, value) => String.fromCharCode(Number.parseInt(value, 16)))
    : encodedBody
  assert.match(html, /Redefinir senha/)
  assert.ok(html.includes(link))
})

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
