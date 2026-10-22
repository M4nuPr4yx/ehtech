import { cache } from 'react'
import { apiRequest } from './api-request'
export const publicProduct = cache(async id => {
  if (!/^[1-9]\d*$/.test(String(id)) || !Number.isSafeInteger(Number(id))) return null
  try {
    const product = await apiRequest(`/produtos/${id}`, { timeoutMs: 12000 })
    return product.status_aprovacao === 'aprovado' ? product : null
  } catch (error) { if (error.status === 404 || error.status === 400) return null; throw error }
})
