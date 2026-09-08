export const SERVICE_CATEGORIES = [
  ['', 'Todos'],
  ['montagem', 'Montagem'],
  ['manutencao', 'Manutenção'],
  ['suporte', 'Suporte técnico'],
  ['redes', 'Redes e Wi-Fi'],
  ['dados', 'Dados e backup'],
  ['consultoria', 'Consultoria']
]

export const MODALITIES = [
  ['', 'Todas as modalidades'],
  ['remoto', 'Remoto'],
  ['presencial', 'Presencial'],
  ['hibrido', 'Remoto ou presencial']
]

const categoryMap = Object.fromEntries(SERVICE_CATEGORIES)
const modalityMap = Object.fromEntries(MODALITIES)
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function categoryLabel(value) {
  return categoryMap[value] || value
}

export function modalityLabel(value) {
  return modalityMap[value] || value
}

export function servicePrice(service) {
  if (service.tipo_preco === 'sob_consulta' || service.preco_base === null) return 'Sob consulta'
  const price = money.format(Number(service.preco_base) || 0)
  return service.tipo_preco === 'a_partir_de' ? `A partir de ${price}` : price
}
