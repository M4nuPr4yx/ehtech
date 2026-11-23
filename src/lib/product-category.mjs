import categories from '../../shared/product-categories.cjs'

export const productCategoryGroups = categories.groups
export const productCategoryOptions = productCategoryGroups.flatMap(([, options]) => options)
const labels = new Map(productCategoryOptions)

export const productCategoryKey = categories.categoryKey

export function productCategoryLabel(value) {
  const key = productCategoryKey(value)
  return labels.get(key) || (key ? value.trim() : 'Sem categoria')
}
