import { getApiUrl } from './api'

export async function apiRequest(endpoint, { timeoutMs = 15000, signal, ...options } = {}) {
  const timeout = AbortSignal.timeout(timeoutMs)
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout
  try {
    const response = await fetch(getApiUrl(endpoint), { ...options, signal: combined, cache: 'no-store' })
    const json = response.headers.get('content-type')?.includes('application/json')
    const data = json ? await response.json() : null
    if (!response.ok) throw new Error(data?.mensagem || (response.status === 504 ? 'O servidor demorou para responder. Tente novamente.' : 'O serviço não respondeu como esperado. Tente novamente em instantes.'))
    if (!data) throw new Error('A API retornou uma resposta inesperada. Confira a configuração do servidor.')
    return data
  } catch (error) {
    if (signal?.aborted) throw error
    if (timeout.aborted) throw new Error('A conexão demorou para responder. Confira sua internet e tente novamente.')
    if (error instanceof TypeError) throw new Error('Não foi possível conectar ao servidor. Confira sua conexão e tente novamente.')
    if (error instanceof SyntaxError) throw new Error('A API retornou uma resposta inválida. Tente novamente em instantes.')
    throw error
  }
}
