// Ampliação explícita apenas para leituras de produtos no ambiente de aula.
function createProductLoadPolicy(env) {
  const value = env.LOAD_TEST_PRODUCTS_MAX || ''
  const max = /^\d+$/.test(value) ? Number(value) : NaN
  const enabled = env.NODE_ENV === 'development' && !env.VERCEL &&
    Number.isSafeInteger(max) && max >= 300 && max <= 100000
  return {
    enabled,
    max: enabled ? max : 300,
    matches: (req) => enabled && req.method === 'GET' &&
      ['/produtos', '/produtos/catalogo'].includes(req.path)
  }
}

module.exports = { createProductLoadPolicy }
