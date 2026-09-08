import { proxyBackendGet } from '../_lib/backend'

export function GET(request) {
  return proxyBackendGet(request, '/servicos', [
    'page', 'limit', 'search', 'categoria', 'modalidade', 'ordenacao'
  ])
}
