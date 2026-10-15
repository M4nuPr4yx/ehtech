export const freightLabel = option => option.valor === null ? 'Valor a combinar' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(option.valor)

export const deliverySelections = delivery => Object.fromEntries(delivery.filter(option => option.grupo_id).map(option => [option.grupo_id, option.id]))
