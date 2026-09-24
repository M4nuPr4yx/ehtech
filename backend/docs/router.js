const express = require('express')
const path = require('node:path')
const swaggerUi = require('swagger-ui-dist')
const { extendSpecification } = require('./additional-routes')
const specification = extendSpecification(require('./openapi.json'))

function createDocsRouter() {
  const router = express.Router()
  router.get('/openapi.json', (req, res) => res.json(specification))
  router.get('/init.js', (req, res) => {
    res.type('application/javascript').send(
      "window.addEventListener('load', function () { window.ui = SwaggerUIBundle({ url: window.location.pathname.replace(/\\/$/, '') + '/openapi.json', dom_id: '#swagger-ui', deepLinking: true, validatorUrl: null, persistAuthorization: true, supportedSubmitMethods: ['get', 'post', 'put', 'patch', 'delete'] }); });"
    )
  })
  for (const asset of ['swagger-ui.css', 'swagger-ui-bundle.js']) {
    router.get('/' + asset, (req, res) => res.sendFile(path.join(swaggerUi.getAbsoluteFSPath(), asset)))
  }
  router.get('/', (req, res) => {
    const pathname = req.originalUrl.split('?')[0]
    if (pathname.endsWith('/')) return res.redirect(307, pathname.slice(0, -1))
    res.type('html').send(`<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>EHtech | Documentação da API</title>
<link rel="stylesheet" href="./docs/swagger-ui.css">
</head>
<body>
<div id="swagger-ui"></div>
<script src="./docs/swagger-ui-bundle.js"></script>
<script src="./docs/init.js"></script>
</body>
</html>`)
  })
  return router
}

module.exports = { createDocsRouter }
