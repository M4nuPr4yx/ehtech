# Catálogo ampliado de componentes

## Fonte e abrangência

Dados publicados no [PC Part Dataset](https://github.com/docyx/pc-part-dataset), de Doc Oliver, revisão `c52a04ca9465c83997ed335f7767b09a2005dd26`. A fonte informa atualização em **23/07/2025** e coleta original no PCPartPicker. Não há API oficial universal com todos os componentes Intel/AMD e todas as placas-mãe, nem garantia de cobertura de lançamentos. Este snapshot não é um banco oficial dos fabricantes.

| Categoria | Registros distintos importados |
| --- | ---: |
| Processadores Intel/AMD | 961 |
| Placas-mãe | 4.972 |
| Memórias RAM | 12.158 |
| Placas de vídeo | 6.547 |
| SSDs/HDs | 5.663 |
| Fontes | 3.364 |
| Gabinetes | 6.428 |
| Coolers | 2.827 |
| **Total** | **42.920** |

Importamos todos os registros distintos disponíveis nessas oito categorias, restringindo CPUs a Intel/AMD. Duplicatas exatas após remover preços são consolidadas; variantes técnicas permanecem separadas. A fonte original contém 45.951 linhas nessas categorias antes da deduplicação/filtro. Nomes iguais podem representar capacidades, frequências ou cores diferentes. A interface mostra detalhes para diferenciá-los.

A licença MIT publicada acompanha os dados em `backend/components/data/LICENSE.pc-part-dataset.txt`. Ela exige preservar o aviso. Como toda fonte comunitária derivada, sua procedência e termos das fontes originais devem ser reavaliados antes de uma exploração comercial. Não utilizamos o BuildCores, cuja licença atual restringe uso comercial sem autorização específica.

## Operação

- Snapshot está em `backend/components/data/catalog.json`, apenas no servidor. Não altera nem popula o Neon. Evita dezenas de milhares de INSERTs em cold start da Vercel.
- API: `/componentes/catalogo/status` e `/componentes/catalogo?tipo=processador&busca=Intel&pagina=1`. IDs são hashes estáveis de categoria, nome e especificações, não IDs numéricos do banco. Paginação de 30 itens; busca ignora acentos e exige todos os termos. A pesquisa inclui valores das especificações.
- A tela /compatibilidade usa esse catálogo com /componentes/verificar-basico (regras sem IA/banco) e /componentes/ia/analisar (complemento opcional). As regras não inventam campos ausentes ou variantes; BIOS fora das listas revisadas permanece não verificada. BIOS pode conter letras/números/ponto/hífen/espaço; o site não lê a BIOS do aparelho.
- O catálogo revisado `/componentes` e painel `/admin/componentes` permanecem separados para preservar associações em anúncios e passaportes, permissões e revisão humana. Não marque automaticamente os 42 mil registros comunitários como verificados.
- Importação de passaporte busca correspondência exata por nome no snapshot. Registros manuais, códigos não disponíveis ou variantes ambíguas são avisados e exigem seleção. Não altera o equipamento original.

## Atualização reproduzível

```sh
node scripts/import-component-catalog.cjs
```

Requer internet, sem novas dependências. O script baixa somente JSON e licença da revisão fixada, elimina preços e deduplica, preserva campos originais e gera IDs determinísticos. Não executa código remoto, scraper ou VPN. Não acessa `.env`, conta, banco ou provedor de IA. Para atualizar, revise licença/schema/conteúdo/data no upstream e altere explicitamente `REVISION` e `data_fonte` no script. Confira contagens, testes e diff antes de publicar. Build e inicialização não baixam dados.

## Lacunas técnicas

CPU não traz socket; placa-mãe não traz geração DDR, lista de CPUs suportadas/BIOS mínima/QVL; cooler não traz sockets; gabinete/fonte não possuem todos os conectores/dimensões. Esses campos **não foram inferidos nem preenchidos com padrões fictícios**. A IA recebe as lacunas e deve indicar confirmação no fabricante; não é uma garantia de compatibilidade. Para uma conclusão confiável futura, complemente com fichas oficiais revisadas e código/revisão exatos do hardware.
