const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000'

export async function proxyBackendGet(request, path, allowedParams = []) {
  const incoming = new URL(request.url)
  const upstream = process.env.VERCEL ? new URL(`/api/_backend${path}`, incoming.origin) : new URL(path, BACKEND_URL)
  for (const key of allowedParams) {
    const value = incoming.searchParams.get(key)
    if (value !== null) upstream.searchParams.set(key, value)
  }

  if (process.env.VERCEL) {
    return new Response(null, { status: 307, headers: { Location: upstream.pathname + upstream.search, 'Cache-Control': 'no-store' } })
  }

  try {
    const response = await fetch(upstream, {
      cache: 'no-store',
      signal: AbortSignal.timeout(12000)
    })
    const data = await response.json()
    return Response.json(data, {
      status: response.status,
      headers: { 'Cache-Control': 'no-store' }
    })
  } catch {
    return Response.json(
      { mensagem: 'O serviço está temporariamente indisponível. Tente novamente.' },
      { status: 502 }
    )
  }
}
