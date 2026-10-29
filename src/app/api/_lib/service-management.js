// Rotas privadas explícitas evitam que /servicos/[slug] descarte o JWT.
export async function proxyServiceManagement(request, path) {
  const headers = { 'Cache-Control': 'no-store' }
  if (process.env.VERCEL) return new Response(null, { status: 307, headers: { ...headers, Location: `/api/_backend${path}` } })
  const authorization = request.headers.get('Authorization')
  if (!authorization) return Response.json({ mensagem: 'Entre na sua conta para continuar.' }, { status: 401, headers })
  try {
    const body = request.method === 'GET' ? undefined : await request.text()
    if (body && new TextEncoder().encode(body).length > 20000) return Response.json({ mensagem: 'Envie até 20 KB por anúncio.' }, { status: 413, headers })
    const response = await fetch(new URL(path, process.env.BACKEND_URL || 'http://127.0.0.1:3000'), { method: request.method, headers: { Authorization: authorization, 'Content-Type': 'application/json' }, ...(body !== undefined ? { body } : {}), cache: 'no-store', signal: AbortSignal.timeout(12000) })
    return Response.json(await response.json(), { status: response.status, headers: { ...headers, ...(response.headers.get('Retry-After') ? { 'Retry-After': response.headers.get('Retry-After') } : {}) } })
  } catch { return Response.json({ mensagem: 'O serviço está temporariamente indisponível. Tente novamente.' }, { status: 502, headers }) }
}
