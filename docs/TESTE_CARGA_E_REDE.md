# EHtech — Swagger, rede local e teste de carga

## Rota escolhida e justificativa

Use **GET /produtos** para o cenário de maior volume de resposta entre as duas consultas de produtos. A rota pública executa SELECT * de todos os anúncios aprovados, sem paginação. Não exige conta nem token.

Use **GET /produtos/catalogo** como comparação representativa da navegação atual: executa COUNT e SELECT em paralelo, busca por nome (LIKE), filtra categoria/preço e ordena com paginação. Cada resposta contém no máximo 24 produtos.

Cadastro não é pré-requisito para consultar produtos. POST /cadastro tem custo de bcrypt e gravação, mas mede outro fluxo e cria usuários. Para testar POST /produtos seria preciso preparar um usuário uma única vez, obter um token pelo login e reutilizá-lo. Esse não é o cenário documentado aqui.

Não afirmamos que uma rota é a mais lenta de toda a aplicação: isso depende de CPU, banco, índices, filtros, volume e concorrência. A escolha acima é sustentada por volume de resposta e inspeção das consultas.

Amostra diagnóstica local em 10/09/2026, três consultas sequenciais por cenário, banco com 50 produtos aprovados:

| Consulta | Produtos retornados | Bytes do JSON sem compressão |
| --- | ---: | ---: |
| /produtos | 50 | 18.584 |
| /produtos/catalogo?limit=12 | 12 | 3.369 |
| /produtos/catalogo?limit=24&search=a&ordenacao=menor-preco | 24 | 7.049 |

A primeira resposta tem aproximadamente 5,5 vezes o tamanho da página de 12 itens. Isto não é benchmark de capacidade nem prova de maior CPU. O teste HTTP da API não baixa as fotos indicadas pelas URLs do JSON; testar imagens e renderização exige um cenário de navegador separado.

## Endereços na rede

IP Ethernet observado nesta máquina: **10.111.9.44**. Pode mudar ao reconectar. Confira com ipconfig e escolha o IPv4 da Ethernet/Wi-Fi ligada à rede da aula; 192.168.56.1 é outra interface e não deve ser presumida como a rede do parceiro.

- Site: http://10.111.9.44:3001
- Swagger UI: http://10.111.9.44:3001/api/docs
- OpenAPI JSON: http://10.111.9.44:3001/api/docs/openapi.json
- Saúde da API/banco: http://10.111.9.44:3001/api/health
- Rota principal pelo site: http://10.111.9.44:3001/api/produtos
- Catálogo: http://10.111.9.44:3001/api/produtos/catalogo?limit=12&page=1
- API direta (se a porta 3000 estiver acessível): http://10.111.9.44:3000/produtos
- Swagger direto: http://10.111.9.44:3000/docs

O JSON usa servidor relativo, então Try it out mantém o IP/porta de onde foi aberto. Swagger UI e seus arquivos JavaScript/CSS são servidos localmente, sem CDN e sem validação remota.

## O que foi alterado na rede, parte por parte

1. O navegador usa /api no mesmo endereço do site. Antes, localhost chamava a porta 3000, enquanto o IP caía em /api e recebia 404 no Next local.
2. O Next encaminha as rotas /api que não possuem handler local para o Express via 127.0.0.1:3000. Uploads mantêm seu encaminhamento. BACKEND_URL permite configurar outro destino no servidor.
3. Em desenvolvimento, CORS aceita localhost e os IPv4 atribuídos a esta máquina na porta 3001. Não existe wildcard de origens. allowedDevOrigins permite carregar os recursos do Next pelos mesmos hosts.
4. O Express confia em encaminhamento somente por loopback no ambiente local para identificar o IP do cliente atrás do Next. O limiter ainda se aplica; os handlers Next existentes podem agrupar chamadas sob o IP do proxy.
5. A política de conteúdo preserva scripts locais; em desenvolvimento HTTP não força o navegador a transformar links dos recursos em HTTPS.
6. A configuração de rede local não muda o roteamento serverless definido por vercel.json. Em produção, origens adicionais devem ser explicitadas em CORS_ORIGIN/FRONTEND_URL.
7. O parceiro acessa HTTP na porta 3001. O banco continua sendo acessado somente pelo backend; nenhuma conta, credencial ou regra de acesso do MySQL foi alterada. Nenhuma regra de firewall foi criada e nenhum encaminhamento no roteador foi feito.

NEXT_PUBLIC_API_URL continua tendo prioridade quando configurado: se apontar para localhost, o navegador do parceiro tentará acessar a máquina dele. No fluxo integrado, deixe essa variável ausente. BACKEND_URL é uma configuração do servidor, não do navegador.

Os servidores Next/Express já escutam nas interfaces da máquina por padrão. Use uma única execução de npm run dev; uma segunda execução causará conflito nas portas.

## Iniciar e verificar

Na raiz do projeto:

~~~powershell
npm install
npm run dev
~~~

O parceiro, na mesma rede, abre os endereços acima. Para verificar no terminal:

~~~powershell
Invoke-RestMethod http://10.111.9.44:3001/api/health
Invoke-RestMethod 'http://10.111.9.44:3001/api/produtos/catalogo?limit=1'
~~~

A resposta de saúde deve ter status ok e banco conectado. Testar o IP na própria máquina valida a aplicação, mas não prova passagem pelo firewall ou isolamento entre computadores da escola. Se nem o site abrir no computador do parceiro, verifique IPv4, rede compartilhada e política da rede com o responsável pelo laboratório. Não é necessário abrir a porta 3306.

## Limite de requisições e modo de aula

O padrão permanece **300 requisições por IP a cada 15 minutos**; o excesso retorna 429 com Retry-After. Medir só 429 mede o limitador, não a capacidade das consultas.

Para ampliar temporariamente apenas GET /produtos e GET /produtos/catalogo, pare a execução anterior e, na raiz, use:

~~~powershell
$env:NODE_ENV = 'development'
$env:LOAD_TEST_PRODUCTS_MAX = '10000'
npm run dev
~~~

Essa opção só é reconhecida com NODE_ENV=development, fora da Vercel, e com um inteiro entre 300 e 100000. Valor inválido mantém o padrão. POST, cadastro, login e outras rotas não recebem a ampliação. O console informa o limite ativo. A janela continua sendo de 15 minutos.

Depois da aula, pare com Ctrl+C e remova a opção:

~~~powershell
Remove-Item Env:LOAD_TEST_PRODUCTS_MAX -ErrorAction SilentlyContinue
Remove-Item Env:NODE_ENV -ErrorAction SilentlyContinue
~~~

Não foi executado um teste de estresse automaticamente. Somente consultas pequenas de diagnóstico foram feitas.

## Roteiro para JMeter

Swagger documenta e experimenta a API; não é uma ferramenta de carga. No JMeter:

1. Crie um Thread Group inicial com 10 usuários, ramp-up de 10 segundos e 10 repetições (100 requisições).
2. Adicione HTTP Request: protocolo http; servidor 10.111.9.44; porta 3001; método GET; caminho /api/produtos. Sem token e sem corpo.
3. Adicione HTTP Header Manager com Accept: application/json.
4. Adicione Response Assertion para status 200 e JSON Assertion para verificar que o corpo é um array.
5. Execute separadamente o cenário /api/produtos/catalogo com page=1 e limit=12; depois limit=24, search=a e ordenacao=menor-preco.
6. Compare latência p50/p95, requisições/segundo, percentual de erros e bytes. Separe 429 de falhas 5xx/timeouts. Registre quantidade de produtos, filtros, hardware, rede, limite configurado e número de usuários.
7. Faça aquecimento antes de registrar as medidas; repita o mesmo cenário e mantenha os dados constantes. Aumente concorrência em etapas combinadas com o professor e pare se o servidor ficar indisponível.
8. Para isolar o Express do Next, repita por porta 3000 com caminho /produtos, se houver acesso autorizado a essa porta. Identifique claramente qual caminho foi medido.
9. Desative download de recursos embutidos e listeners que armazenam corpos completos durante a carga. Use Summary/Aggregate Report e resultados JTL.

npm run dev inclui compilação e instrumentação de desenvolvimento. Serve para a demonstração, mas os resultados não representam produção. Para medir produção, compile o frontend (npm run build), rode npm start e o backend em outro terminal, configurando CORS_ORIGIN para o endereço da aula quando necessário. A ampliação de limite acima é deliberadamente exclusiva de desenvolvimento; identifique esse cenário no relatório.

## Fontes e arquivos

- Contrato da API: backend/docs/openapi.json
- Interface local: backend/docs/router.js
- [Next.js: rewrites](https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites)
- [Swagger: servidores e URLs relativas](https://swagger.io/docs/specification/v3_0/api-host-and-base-path/)
