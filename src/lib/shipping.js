export const freightLabel = option => option.valor === null ? 'Valor a combinar' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(option.valor)

// Only the single, unpriced negotiated option is suggested. Continue and final
// review still require the buyer's action; priced alternatives stay unselected.
export const deliverySelections = (delivery, groups = []) => Object.fromEntries([
  ...groups.filter(group => group.opcoes.length === 1 && group.opcoes[0].tipo === 'a_combinar' && group.opcoes[0].valor === null).map(group => [group.grupo_id, group.opcoes[0].id]),
  ...delivery.filter(option => option.grupo_id).map(option => [option.grupo_id, option.id]),
])
