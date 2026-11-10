export function deliveryGuidance(delivery, role) {
  const seller = role === 'vendedor'
  const pickup = delivery.acordo?.modalidade === 'retirada'
  const stages = ['Pedido registrado', 'Combinar entrega', pickup ? 'Retirada disponível' : 'Produto enviado', 'Recebido']
  let step = 1, title, detail
  switch (delivery.estado) {
    case 'aguardando_proposta':
      title = seller ? 'Combine a entrega e envie uma proposta' : 'Aguarde a proposta do vendedor'
      detail = seller ? 'Informe abaixo como o comprador receberá o produto, o frete e o prazo. Ele precisa aceitar antes do envio.' : 'Converse pelo chat para combinar frete, prazo e pagamento. A proposta aparecerá aqui para você revisar.'
      break
    case 'proposta_enviada':
      title = seller ? 'Aguarde o comprador aceitar' : 'Revise a proposta antes de aceitar'
      detail = seller ? 'O produto ainda não está liberado para envio por este acordo. Você pode revisar a proposta enquanto ela não for aceita.' : 'Confira modalidade, frete e prazo abaixo. Se não concordar, recuse e peça uma nova proposta.'
      break
    case 'acordo_confirmado':
      title = seller ? pickup ? 'Prepare o produto para retirada' : 'Prepare o produto e informe o envio' : pickup ? 'Combine a retirada com o vendedor' : 'Aguarde o vendedor informar o envio'
      detail = seller ? 'Confira o pagamento diretamente com o comprador, fora do site. Depois registre a próxima etapa abaixo.' : 'As condições foram aceitas. Confirme o recebimento somente quando o produto estiver com você.'
      break
    case 'enviado':
      step = 2
      title = seller ? 'Aguarde a confirmação do comprador' : 'Recebeu o produto? Confirme aqui'
      detail = seller ? 'O comprador confirma pelo próprio pedido quando receber. Você não precisa pedir um código pelo chat.' : 'Confira os produtos e use Confirmar recebimento abaixo. Se ainda não recebeu ou há um problema, não confirme; use Relatar problema no pedido.'
      break
    case 'pronto_retirada':
      step = 2
      title = seller ? 'Entregue o produto e valide o código' : 'Retire o produto antes de gerar o código'
      detail = seller ? 'Depois de entregar, peça ao comprador o código de seis dígitos e digite abaixo. O código registra o recebimento, sem confirmar pagamento.' : 'Depois de receber, gere o código abaixo e mostre ao vendedor. Não informe o código antecipadamente.'
      break
    case 'recebido':
      step = 3
      title = 'Recebimento registrado'
      detail = 'Esta entrega foi concluída. O botão Relatar problema no pedido continua disponível; o recebimento não é uma aprovação da qualidade nem do pagamento.'
      break
    default:
      step = null
      title = 'Consulte as condições desta entrega'
      detail = 'Atualize o pedido para conferir a etapa atual antes de continuar.'
  }
  return { stages, step, title, detail }
}

export function deliveryCount(deliveries = []) {
  const received = deliveries.filter(item => item.estado === 'recebido').length
  return deliveries.length ? `${received} de ${deliveries.length} ${deliveries.length === 1 ? 'entrega recebida' : 'entregas recebidas'}` : 'Sem entrega física para acompanhar'
}

// A failed write may have reached the server. Read the order before retrying.
export function uncertainOrderChange(error) {
  return !error?.status || error.status === 409 || error.status >= 500 || error.code === 'INVALID_RESPONSE'
}
