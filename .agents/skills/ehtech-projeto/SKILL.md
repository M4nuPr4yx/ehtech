---
name: ehtech-projeto
description: Manter o marketplace acadêmico EHtech em português, especialmente o fluxo de pedidos, o retorno às listagens e os registros na ERS e no documento de testes. Use ao implementar ou revisar essas áreas no repositório EHtech.
---

# Manutenção da EHtech

Use o [AGENTS.md](../../../AGENTS.md) como fonte das regras do repositório e dos links oficiais. Leia só a seção do [mapa de desenvolvimento](../../../docs/DESENVOLVIMENTO.md) e os arquivos de código relacionados à tarefa. Para clone, GitHub, checkup de entrega ou publicação, siga a [skill de release](../ehtech-release/SKILL.md).

## Decisões de produto

- **Passaporte e certificado.** Se um recurso não puder funcionar e ser explicado com clareza para o público do TCC, retire-o da interface quando essa for a orientação da tarefa. Na revisão 1.14, o passaporte e a inspeção/certificado estavam retirados. Preserve os redirecionamentos de `/passaportes` para Compatibilidade e de `/certificados` para Produtos. As operações antigas da API ficam indisponíveis. Os dados legados não devem ser apagados ao atualizar o código. Consulte RF033 e RF034 na ERS e [o histórico dos diferenciais](../../../docs/DIFERENCIAIS_IMPLEMENTADOS.md).
- **Compra para iniciantes.** Mostre a próxima ação e o que ela faz. **Iniciar pedido** abre a preparação ou o carrinho, quando há outros produtos. O checkout pede endereço para envio e oferece **Solicitar retirada** sem endereço para os grupos físicos. Digitais podem ir direto à revisão. Mostre o resumo e o frete pendente antes de **Registrar pedido**, inclusive no celular. Pelo pedido, o comprador conversa com o vendedor, revisa a proposta e acompanha o recebimento. Pode cancelar enquanto todos os grupos aguardam proposta. Preserve histórico, aviso aos vendedores e validação transacional. O pagamento é combinado fora da EHtech. Consulte `src/app/checkout/page.js`, `src/app/pedidos/` e [Acordos e entregas](../../../docs/ACORDOS_E_ENTREGAS.md).
- **Voltar não reinicia a listagem.** Em Produtos e Serviços, preserve busca aplicada, filtros, ordenação, página e posição de rolagem pelo botão do navegador e pelo link do detalhe. Preserve também o contexto pertinente da origem, como objetivo e orçamento ou a aba Minhas vendas. Reaproveite `src/app/complements/ListingNavigation.js`. Confirme a posição depois de os resultados carregarem e verifique o caminho em desktop e viewport de celular. Para teste de rolagem, meça a posição no instante do clique, pois o próprio navegador pode reposicionar o card para torná-lo clicável.
- **Incoerências no fluxo em revisão.** Corrija as que encontrar dentro do escopo e relate o sintoma e o ajuste. Exemplos desta entrega incluem chamar de total um valor sem frete e mostrar o resumo abaixo da confirmação no celular.

## ERS e documento de testes

- Atualize os documentos oficiais pelos links do `AGENTS.md`. Edite diretamente no Word Online quando houver acesso de edição. Abra a versão vigente, confira a seção correspondente e siga a formatação e o histórico existentes. A retirada sem endereço e o cancelamento foram registrados na ERS 1.15 e na execução A.15. Confira a numeração atual antes de acrescentar uma revisão.
- Preserve os identificadores dos requisitos e registre comportamento implementado e critérios de aceite. No documento de testes, informe data, versão ou commit base, ambiente, cenário, esperado, observado e situação. Inclua falhas relevantes das rodadas anteriores e a correção correspondente. Diferencie navegador com viewport móvel de aparelho real e integração descartável de produção.
- Verifique o texto inserido e o estado **Salvo** em cada documento antes de declarar a atualização. Se a sessão ou a permissão impedir a edição, identifique o bloqueio específico e o que ficou pendente. A autorização para acessar os dois documentos em uma tarefa não amplia o acesso a outros arquivos.
