export const COMPARISON_KEY = 'ehtech.comparacao'
export function comparisonIds(raw) {
  try {
    const data = JSON.parse(raw || '[]')
    return Array.isArray(data) ? [...new Set(data.filter(id => Number.isSafeInteger(id) && id > 0))].slice(0, 4) : []
  } catch { return [] }
}
