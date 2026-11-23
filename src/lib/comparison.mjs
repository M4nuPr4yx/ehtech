import { productCategoryKey } from './product-category.mjs'

export const COMPARISON_KEY = 'ehtech.comparacao'
export function comparisonIds(raw) {
  try {
    const data = JSON.parse(raw || '[]')
    return Array.isArray(data) ? [...new Set(data.filter(id => Number.isSafeInteger(id) && id > 0))].slice(0, 4) : []
  } catch { return [] }
}

export function comparisonGroups(products) {
  const groups = new Map()
  for (const product of products) {
    const category = productCategoryKey(product?.categoria)
    if (!category) continue
    const group = groups.get(category) || []
    group.push(product)
    groups.set(category, group)
  }
  return groups
}
