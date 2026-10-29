import { getApiUrl } from './api.js'

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'REQUEST_FAILED', errors, retryAfter } = {}) {
    super(message); this.name = 'ApiError'; this.status = status; this.code = code
    this.errors = errors; this.retryAfter = retryAfter
  }
}

const pendingReads = new Map()

// Compartilha somente leituras simultâneas, sem guardar dados após a resposta.
function perform(endpoint, { dedupe = false, ...options } = {}) {
  if (!dedupe || options.signal || options.body || options.json !== undefined || (options.method || 'GET').toUpperCase() !== 'GET') return fetchResponse(endpoint, options)
  const key = JSON.stringify([getApiUrl(endpoint), { ...options, headers: [...new Headers(options.headers)].sort() }])
  if (pendingReads.has(key)) return pendingReads.get(key)
  const request = fetchResponse(endpoint, options).finally(() => pendingReads.delete(key))
  pendingReads.set(key, request)
  return request
}

async function fetchResponse(endpoint, { timeoutMs, signal, json, ...options } = {}) {
  const controller = new AbortController()
  let timedOut = false
  const abort = () => controller.abort(signal?.reason)
  if (signal?.aborted) abort()
  else signal?.addEventListener('abort', abort, { once: true })
  const deadline = timeoutMs ?? (typeof FormData !== 'undefined' && options.body instanceof FormData ? 60000 : 15000)
  const timer = setTimeout(() => { timedOut = true; controller.abort() }, deadline)
  try {
    const headers = new Headers(options.headers)
    if (json !== undefined) headers.set('Content-Type', 'application/json')
    const response = await fetch(getApiUrl(endpoint), { cache: 'no-store', ...options, headers, signal: controller.signal, ...(json !== undefined ? { body: JSON.stringify(json) } : {}) })
    const raw = response.status === 204 ? null : response.headers.get('content-type')?.includes('application/json') ? await response.json() : null
    const data = raw === null && !response.ok ? { mensagem: response.status === 504 ? 'O servidor demorou para responder. Tente novamente.' : 'O serviço não respondeu como esperado. Tente novamente em instantes.' } : raw
    if (response.ok && response.status !== 204 && data === null) throw new ApiError('A API retornou uma resposta inesperada. Tente novamente.', { status: response.status, code: 'INVALID_RESPONSE' })
    if (typeof window !== 'undefined' && [401, 403].includes(response.status) && ['INVALID_TOKEN', 'TOKEN_EXPIRED'].includes(data?.code)) window.dispatchEvent(new CustomEvent('ehtech:session-expired', { detail: { authorization: headers.get('Authorization') } }))
    return { response, data }
  } catch (error) {
    if (signal?.aborted) throw signal.reason || new DOMException('Requisição cancelada.', 'AbortError')
    if (timedOut) throw new ApiError('A conexão demorou para responder. Confira sua internet e tente novamente.', { code: 'TIMEOUT' })
    if (error instanceof TypeError) throw new ApiError('Não foi possível conectar ao servidor. Confira sua conexão e tente novamente.', { code: 'NETWORK_ERROR' })
    if (error instanceof SyntaxError) throw new ApiError('A API retornou uma resposta inválida. Tente novamente em instantes.', { code: 'INVALID_RESPONSE' })
    throw error
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort) }
}

export async function apiResponse(endpoint, options) {
  const { response, data } = await perform(endpoint, options)
  return { ok: response.ok, status: response.status, headers: response.headers, json: async () => data }
}

export async function apiRequest(endpoint, options) {
  const { response, data } = await perform(endpoint, options)
  if (!response.ok) throw new ApiError(data?.mensagem || data?.erro || data?.error || (response.status === 504 ? 'O servidor demorou para responder. Tente novamente.' : 'O serviço não respondeu como esperado. Tente novamente em instantes.'), { status: response.status, code: data?.code || data?.codigo || 'HTTP_ERROR', errors: data?.erros, retryAfter: response.headers.get('Retry-After') })
  return data
}
