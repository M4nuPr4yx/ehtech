import specs from '../../shared/product-specs.cjs'

const labels = new Map([
  ['smartphones', 'Smartphones'], ['notebooks', 'Notebooks'], ['computadores', 'Computadores'],
  ['tablets', 'Tablets'], ['acessorios', 'Acessórios'], ['gadgets', 'Gadgets'],
  ['games', 'Games e consoles'], ['redes', 'Redes e Wi-Fi'], ['audio', 'Áudio'], ['outros', 'Outros'],
])

export const productCategoryKey = specs.categoryKey

export function productCategoryLabel(value) {
  const key = productCategoryKey(value)
  return labels.get(key) || (key ? value.trim() : 'Sem categoria')
}
