import { proxyBackendGet } from '../_lib/backend'

export function GET(request) {
  return proxyBackendGet(request, '/produtos/catalogo', [
    'page', 'limit', 'search', 'categoria', 'precoMin', 'precoMax', 'ordenacao'
  ])
}
