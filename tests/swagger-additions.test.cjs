const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const base = require('../backend/docs/openapi.json')
const { extendSpecification } = require('../backend/docs/additional-routes')
const spec = extendSpecification(base)
const methods = ['get', 'post', 'put', 'patch', 'delete']

test('preserva todas as definições anteriores sem modificar o documento original', () => {
  const snapshot = JSON.stringify(base)
  const result = extendSpecification(base)
  assert.equal(JSON.stringify(base), snapshot)
  for (const [key, value] of Object.entries(base)) {
    if (!['paths', 'tags', 'components'].includes(key)) assert.deepEqual(result[key], value)
  }
  for (const [route, operations] of Object.entries(base.paths)) {
    for (const [method, operation] of Object.entries(operations)) assert.deepEqual(result.paths[route][method], operation)
  }
  for (const [name, schema] of Object.entries(base.components.schemas)) assert.deepEqual(result.components.schemas[name], schema)
  assert.deepEqual(result.components.securitySchemes, base.components.securitySchemes)
  for (const tag of base.tags) assert.deepEqual(result.tags.find(item => item.name === tag.name), tag)
  assert.throws(() => extendSpecification(result), /duplicad/)
})

test('documenta todos os endpoints de negócio Express, sem inventar rotas', () => {
  const expected = new Set()
  for (const [file, prefix, receiver] of [
    ['index.js', '', 'app'],
    ['routes/services.js', '/servicos', 'router'],
    ['routes/serviceContracts.js', '/contratacoes', 'router'],
    ['routes/orders.js', '/pedidos', 'router'],
    ['routes/addresses.js', '/enderecos', 'router'],
    ['routes/checkout.js', '/checkout', 'router'],
    ['routes/passports.js', '/passaportes', 'router'],
    ['routes/certificates.js', '/certificados', 'router'],
    ['routes/combos.js', '/combos', 'router'],
    ['routes/missions.js', '/missoes', 'router'],
    ['routes/components.js', '/componentes', 'router'],
    ['routes/upload.js', '/upload', 'router']
  ]) {
    const source = fs.readFileSync(path.join(__dirname, '../backend', file), 'utf8')
    const matcher = new RegExp(receiver + '\\.(' + methods.join('|') + ')\\(\\s*["\x27]([^"\x27]+)["\x27]', 'g')
    for (const match of source.matchAll(matcher)) {
      const route = ((prefix + (match[2] === '/' && prefix ? '' : match[2])) || '/').replace(/:([A-Za-z0-9_]+)/g, '{$1}')
      expected.add(match[1] + ' ' + route)
    }
  }
  const documented = new Set()
  for (const [route, operations] of Object.entries(spec.paths)) {
    for (const method of methods) if (operations[method]) documented.add(method + ' ' + route)
  }
  assert.deepEqual([...documented].sort(), [...expected].sort())
})

test('referências, IDs de operação, parâmetros de caminho e segurança são consistentes', () => {
  const ids = new Set()
  function visit(value) {
    if (!value || typeof value !== 'object') return
    if (value.$ref) {
      assert.ok(value.$ref.startsWith('#/'))
      const target = value.$ref.slice(2).split('/').reduce((node, key) => node?.[key], spec)
      assert.ok(target, value.$ref)
    }
    Object.values(value).forEach(visit)
  }
  visit(spec)
  for (const [route, operations] of Object.entries(spec.paths)) {
    for (const method of methods) {
      const operation = operations[method]
      if (!operation) continue
      assert.ok(operation.operationId)
      assert.ok(!ids.has(operation.operationId), operation.operationId)
      ids.add(operation.operationId)
      for (const [, name] of route.matchAll(/\{([^}]+)\}/g)) {
        assert.ok(operation.parameters?.some(parameter => parameter.name === name && parameter.in === 'path' && parameter.required), route)
      }
      for (const security of operation.security || []) {
        for (const name of Object.keys(security)) assert.ok(spec.components.securitySchemes[name])
      }
    }
  }
  assert.deepEqual(spec.paths['/cadastro'].post.security, [])
  assert.deepEqual(spec.paths['/admin/login'].post.security, [])
  for (const route of ['/perfil', '/pedidos', '/contratacoes', '/notificacoes', '/admin/users']) {
    assert.deepEqual(spec.paths[route].get.security, [{ bearerAuth: [] }])
  }
  assert.deepEqual(spec.paths['/cadastro'].post.requestBody.content['application/json'].schema.required, ['username', 'email', 'senha', 'confirmarSenha'])
  assert.ok(spec.paths['/cadastro'].post.responses[409])
  assert.ok(spec.paths['/cadastro'].post.responses[429])
  assert.equal(spec.paths['/upload/imagens'].post.requestBody.content['multipart/form-data'].schema.properties.imagens.maxItems, 8)
})

test('Swagger publica o documento completo via HTTP, sem iniciar backend ou acessar banco', async () => {
  const express = require('express')
  const { createDocsRouter } = require('../backend/docs/router')
  const app = express()
  app.use('/api/docs', createDocsRouter())
  const server = await new Promise(resolve => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening))
  })
  try {
    const origin = 'http://127.0.0.1:' + server.address().port
    const response = await fetch(origin + '/api/docs/openapi.json')
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), spec)
    const html = await fetch(origin + '/api/docs')
    assert.equal(html.status, 200)
    assert.match(await html.text(), /swagger-ui-bundle/)
    const init = await fetch(origin + '/api/docs/init.js')
    assert.match(await init.text(), /supportedSubmitMethods/)
  } finally {
    server.closeAllConnections()
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  }
})
