function requestPath(url) {
  const pathname = new URL(url, 'http://localhost').pathname
  return pathname.replace(/^\/api\/_backend(?=\/|$)/, '').replace(/^\/api(?=\/|$)/, '') || '/'
}

module.exports = { requestPath }
