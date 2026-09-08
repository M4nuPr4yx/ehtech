const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000'

export async function proxyBackendGet(request, path, allowedParams = []) {
  const incoming = new URL(request.url)
  const upstream = new URL(path, BACKEND_URL)
  for (const key of allowedParams) {
    const value = incoming.searchParams.get(key)
    if (value !== null) upstream.searchParams.set(key, value)
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
