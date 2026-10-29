const { requestPath } = require('../request-path')

function privateResponse(req, res, next) {
  const pathname = requestPath(req.url)
  const authentication = /^\/(?:auth\/|login$|cadastro$|admin(?:\/|$)|esqueci-senha$|redefinir-senha$|verificar-token(?:\/|$))/.test(pathname)
  if (req.headers.authorization || authentication) {
    res.set('Cache-Control', 'no-store')
    res.set('Referrer-Policy', 'no-referrer')
  }
  next()
}

module.exports = { privateResponse }
