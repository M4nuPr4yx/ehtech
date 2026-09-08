import { proxyBackendGet } from '../../_lib/backend'

export async function GET(request, context) {
  const { slug } = await context.params
  if (!/^[a-z0-9-]{1,160}$/.test(slug)) {
    return Response.json({ mensagem: 'Serviço inválido.' }, { status: 400 })
  }
  return proxyBackendGet(request, `/servicos/${encodeURIComponent(slug)}`)
}
