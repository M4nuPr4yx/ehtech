export function deliveryGuidance(delivery, role) {
  const seller = role === 'vendedor'
  const pickup = delivery.retirada_solicitada || delivery.acordo?.modalidade === 'retirada'
  const stages = ['Pedido registrado', pickup ? 'Combinar retirada' : 'Combinar entrega', pickup ? 'Retirada disponível' : 'Produto enviado', 'Recebido']
  let step = 1, title, detail
  switch (delivery.estado) {
    case 'aguardando_proposta':
      title = pickup ? seller ? 'Envie uma proposta de retirada' : 'Combine a retirada com o vendedor' : seller ? 'Combine a entrega e envie uma proposta' : 'Combine a entrega com o vendedor'
      detail = pickup
        ? seller ? 'Combine o local pelo chat e informe o prazo abaixo. Aguarde o aceite antes de disponibilizar a retirada.' : 'Confirme pelo chat se a retirada é possível e combine local e prazo. Quando o vendedor enviar a proposta, volte a este pedido para revisar.'
        : seller ? 'Informe abaixo como o comprador receberá o produto, o frete e o prazo. Ele precisa aceitar antes do envio.' : 'Pergunte pelo chat sobre disponibilidade, entrega ou retirada, frete e prazo. Quando o vendedor enviar a proposta, volte a este pedido para revisar.'
      break
    case 'proposta_enviada':
      title = seller ? 'Aguarde o comprador aceitar' : 'Revise a proposta antes de aceitar'
      detail = seller ? 'O produto ainda não está liberado para envio por este acordo. Você pode revisar a proposta enquanto ela não for aceita.' : 'Confira modalidade, frete e prazo abaixo. Se não concordar, recuse e peça uma nova proposta.'
      break
    case 'acordo_confirmado':
      title = seller ? pickup ? 'Prepare o produto para retirada' : 'Prepare o produto e informe o envio' : pickup ? 'Combine a retirada com o vendedor' : 'Aguarde o vendedor informar o envio'
      detail = seller ? 'Confira o pagamento diretamente com o comprador, fora do site. Depois registre a próxima etapa abaixo.' : 'Combine o pagamento diretamente com o vendedor. Confirme o recebimento somente quando o produto estiver com você.'
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
