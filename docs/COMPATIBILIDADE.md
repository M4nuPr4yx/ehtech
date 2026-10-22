# Compatibilidade e catálogo revisado

A tela pública /compatibilidade usa o catálogo ampliado com checagem básica por regras sem IA, além de análise adicional opcional com IA. Consulte CATALOGO_COMPONENTES.md e IA_COMPATIBILIDADE.md.

POST /componentes/verificar-basico recebe os mesmos IDs, quantidades e BIOS da seleção ampliada, resolve-os no servidor e não consulta banco nem provedor. Socket e suporte de CPU/BIOS exigem correspondência de nome completo único com fichas locais revisadas. Geração DDR, módulos e capacidade usam campos disponíveis, com origem comunitária indicada; formato e variante ausentes ficam não verificados. Não infere socket ou QVL por marketing. Fonte, vídeo, gabinete, cooler e armazenamento ficam explicitamente fora dessa checagem.

## Motor anterior (API legada, fora da tela)

As regras descritas nesta seção e suas seis fichas revisadas foram preservadas por compatibilidade das integrações e referências históricas. As instruções abaixo descrevem esse fluxo anterior, não a interface atual.

Selecione o modelo exato do processador, placa-mãe e kit de memória. Cada peça usa um único campo com busca e lista: digitar “AMD”, por exemplo, filtra os modelos disponíveis; clicar em uma opção confirma a seleção. A seta abre a lista sem precisar digitar. Também é possível usar as setas do teclado e Enter para selecionar, e Escape para fechar. Texto digitado sem seleção não identifica uma peça; editar o texto de um modelo selecionado limpa sua associação e o resultado anterior. Informe a BIOS que foi conferida no equipamento. A quantidade corresponde a kits: um kit de 2 × 8 GB ocupa dois slots e soma 16 GB. Trocar a placa-mãe limpa a BIOS; mudar qualquer peça limpa o resultado anterior.

O resultado cobre somente os requisitos comparados, com justificativas e fontes. A BIOS é declarada pelo usuário; o site não lê o computador. Não certifica velocidades, XMP/EXPO, QVL, estabilidade ou estado de peças usadas. Fonte, GPU, gabinete, cooler e armazenamento não são comparados nesta etapa.

| Resultado | Significado |
| --- | --- |
| Compatível nos requisitos verificados | Todos os requisitos cobertos têm informações suficientes e correspondem. |
| Incompatível | Há uma divergência comprovada nas especificações, mesmo que outras informações estejam pendentes. |
| Não verificado | Falta um modelo, especificação, suporte revisado ou versão conhecida de BIOS. |
| Condicional | É preciso confirmar/atualizar BIOS ou conferir a combinação de vários kits. |

A ausência de um processador na nossa lista de suporte não comprova incompatibilidade. Mesmo com socket igual, é necessário registrar o suporte ao modelo exato. A comparação de BIOS é numérica e limitada às versões ASUS de quatro dígitos usadas nesta base; não publique modelos de outro fabricante com uma convenção diferente sem adaptar a regra.

## Catálogo e manutenção

O backend cria a tabela `componentes_tecnicos`, adiciona a referência opcional `produtos.componente_id` e inclui seis fichas iniciais. A inicialização é idempotente e preserva as revisões administrativas existentes. Reinicie o backend após atualizar o código para registrar as rotas e executar a migração. Não é preciso apagar nem recriar o banco.

O catálogo público retorna até 100 modelos por consulta. A tela inicial busca esses modelos e filtra por marca/modelo. Antes de ampliar para mais de 100 modelos ativos, implemente paginação ou busca por categoria no seletor; modelos além desse limite ainda não serão oferecidos pela interface.

No painel administrativo, crie um rascunho com identificador único e categoria. Confira o código completo e a revisão do hardware nas fontes oficiais. Use `null` para dados desconhecidos. Publicar como verificado exige pelo menos uma fonte HTTPS; a revisão é humana, não automática. Desativar uma ficha preserva referências históricas e impede novas aprovações. Identificador e categoria não mudam após a criação. A revisão numérica impede que duas sessões sobrescrevam alterações sem perceber; recarregue após um conflito.

Campos aceitos nas especificações:

| Categoria | Campos |
| --- | --- |
| `processador` | `socket`, `memoria_tipos` (lista de DDR3/DDR4/DDR5), `memoria_max_gb`, `video_integrado` |
| `placa_mae` | `socket`, `memoria_tipo`, `memoria_formato` (UDIMM/SODIMM), `memoria_slots`, `memoria_max_gb`, `bios_versoes`, `suporte_cpu` |
| `memoria` | `memoria_tipo`, `memoria_formato`, `modulos`, `capacidade_gb` (total do kit), `velocidade_padrao_mts`, `velocidade_perfil_mts`, `perfil` (`XMP`, `EXPO`, `XMP/EXPO` ou `Nenhum`) |

Exemplo de suporte na ficha da placa-mãe:

```json
{
  "bios_versoes": ["2407", "2423", "2803"],
  "suporte_cpu": { "amd-ryzen-5-5600": { "bios_minima": "2423" } }
}
```

Fontes são uma lista de objetos `{ "titulo": "Ficha oficial", "url": "https://..." }`. URLs são apenas exibidas como referências; o servidor não baixa essas páginas. Velocidades/perfis são dados de catálogo, não regras de aprovação nesta versão.

## Passaportes e anúncios

Em Meus Equipamentos, associe o modelo do catálogo ou mantenha um registro manual. O backend normaliza o nome da associação e grava ID, revisão e quantidade; o texto manual continua funcionando. O verificador importa somente associações reconhecidas, avisa sobre registros manuais e não altera o passaporte. Conjuntos ambíguos ou peças repetidas exigem seleção manual. A análise usa a revisão atual do catálogo, indicada no resultado, e não congela uma aprovação na ficha do equipamento.

Anunciar e editar produto permitem associar um modelo exato, de forma opcional. Essa associação é informada pelo vendedor e não certifica a peça usada. Alterar ou remover a associação de um anúncio aprovado como vendedor devolve-o à moderação. Anúncios antigos continuam sem associação.

## Modelos iniciais e fontes

- [AMD Ryzen 5 5600](https://www.amd.com/en/support/downloads/drivers.html/processors/ryzen/ryzen-5000-series/amd-ryzen-5-5600.html): AM4, DDR4.
- [AMD Ryzen 5 7600](https://www.amd.com/en/products/processors/desktops/ryzen/7000-series/amd-ryzen-5-7600.html): AM5, DDR5.
- ASUS PRIME B550M-A: [especificações](https://www.asus.com/uk/motherboards-components/motherboards/prime/prime-b550m-a/techspec/) e [suporte de processadores/BIOS](https://www.asus.com/motherboards-components/motherboards/prime/prime-b550m-a/helpdesk_cpu?model2Name=PRIME-B550M-A).
- ASUS PRIME B650M-A II: [especificações](https://www.asus.com/motherboards-components/motherboards/prime/prime-b650m-a-ii/techspec/) e [suporte de processadores/BIOS](https://www.asus.com/id/motherboards-components/motherboards/prime/prime-b650m-a-ii/helpdesk_cpu/?model2Name=PRIME-B650M-A-II).
- [Kingston KF432C16BBK2/16](https://www.kingston.com/datasheets/KF432C16BBK2_16.pdf): kit DDR4 de 2 × 8 GB.
- [Kingston KF560C36BBEK2-16](https://www.kingston.com/datasheets/KF560C36BBEK2-16.pdf): kit DDR5 de 2 × 8 GB.

## Validação

Regras cobertas em `tests/component-compatibility.test.cjs`. A integração com banco descartável testa migração de schema antigo, publicação/desativação, conflito de revisão, permissões administrativas, referências de anúncio e normalização de componentes do passaporte. O Swagger documenta todos os endpoints.

```powershell
node --test --test-isolation=none tests/*.test.cjs
$env:RUN_DB_TESTS='1'; node --test --test-isolation=none tests/api-integration.test.cjs
npm run lint
npm run build
```

Antes de expandir a cobertura, revise mais modelos e suas combinações oficiais. A explicação opcional usa Gemini externo; Ollama e Groq continuam disponíveis por configuração explícita do servidor. Consulte [IA_COMPATIBILIDADE.md](IA_COMPATIBILIDADE.md). As regras e as fontes continuam determinando a conclusão; a IA não adiciona suporte a peças fora do catálogo.
