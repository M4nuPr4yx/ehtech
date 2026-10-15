# Compatibilidade somente com IA

A tela `/compatibilidade` pesquisa o [catálogo ampliado](CATALOGO_COMPONENTES.md) e envia a seleção diretamente à IA. O resultado apresenta resumo, pontos de atenção e próximos passos. Não executa nem exibe a verificação manual anterior. As rotas legadas `/componentes/verificar` e `/componentes/ia/explicar` continuam disponíveis para integrações antigas, separadas do novo fluxo.

## Configuração privada

Em desenvolvimento, preencha `backend/.env.ai` (ignorado pelo Git) ou as variáveis do processo. Em produção, use somente o painel da hospedagem:

```dotenv
COMPAT_AI_PROVIDER=gemini
GEMINI_MODEL=gemini-3.1-flash-lite
GEMINI_API_KEY=sua-chave-privada
COMPAT_AI_TIMEOUT_MS=25000
```

Não cole chaves no chat, no navegador nem em arquivos versionados. Sem `COMPAT_AI_PROVIDER`, uma chave `GEMINI_API_KEY` seleciona Gemini; na ausência dela, `GROQ_API_KEY` seleciona Groq. Uma configuração explícita tem prioridade, inclusive `disabled`. O exemplo de instalação mantém `disabled`: altere-o para habilitar IA. Nunca há troca automática de provedor ou modelo após uma falha.

O indicador informa somente que provedor/modelo/chave estão configurados; não valida autorização ou cota. Erros de chave, modelo ausente, cota, resposta inválida e timeout são diferenciados, sem revelar a resposta privada do provedor. O modelo pode ser alterado por `GEMINI_MODEL` se suportar JSON Schema e estiver disponível na conta. Não habilitamos faturamento ou serviços pagos.

## Vercel e celular

1. Configure as variáveis acima em **Production** (e em Preview se usar uma URL de preview). Configure também `API_SEGREDO` e a `DATABASE_URL` pooled do Neon para contas, anúncios e demais recursos.
2. Deixe `NEXT_PUBLIC_API_URL` **vazio** no deploy unificado. O navegador usa `/api` no mesmo domínio HTTPS. `BACKEND_URL` não é necessário para a função serverless. URLs localhost apontam para o próprio celular, não para o computador que publicou o site. A aplicação agora ignora destinos locais/privados em páginas públicas e HTTP em páginas HTTPS. Backends externos intencionais precisam de URL HTTPS correta e CORS adequado.
3. Faça **novo deploy** após alterar variáveis, especialmente `NEXT_PUBLIC_*`, que ficam embutidas no build. Reabra o link público no Chrome; se só uma sessão antiga falhar, teste uma aba anônima para comparar cache/sessão. Não é necessário apagar a conta.
4. Consulte `/api/componentes/catalogo/status`: retorna snapshot e contagens, sem usar banco. `/api/componentes/ia/status` informa configuração, sem inferência ou Neon. Esses endpoints e `/api/componentes/ia/analisar` agora independem da inicialização/migração do banco.
5. `/api/health` testa o banco. Se retornar `banco_indisponivel`, confira a conexão pooled/SSL do Neon e os logs privados da função. Não compartilhe a string de conexão. O pool PostgreSQL limita a espera por conexão a dez segundos e usa até três conexões por instância Vercel por padrão.
6. Se o catálogo abre, mas a IA falha, confira o código retornado por `/api/componentes/ia/analisar`: `nao_configurada`, `chave_recusada`, `modelo_ausente`, `cota_atingida`, `tempo_excedido`, `resposta_invalida` ou `provedor_indisponivel`. Cota retorna 429; timeout, 504. Não há fallback manual fingindo que a IA funcionou.
7. Uploads usam `BLOB_READ_WRITE_TOKEN`; `BLOB_WEBHOOK_PUBLIC_KEY` e `BLOB_STORE_KEY` não substituem essa variável. Isso não configura a IA.

Em 15/10/2026, consultas públicas ao deploy informado `ehtech-gc18.vercel.app` retornaram HTTP 200 para catálogo revisado e estado da IA; Gemini aparecia configurado. Porém `/api/servicos` retornou HTTP 502 com a mensagem relatada: o handler Next tentava consultar `localhost:3000` dentro da Vercel. Corrigimos os proxies Next de serviços e catálogo: na Vercel, redirecionam (307, sem cache) para `/api/_backend/...`, que chega ao mesmo Express pela regra de rewrite existente, sem recursão ou backend local. O prefixo alternativo mantém JWT, permissões e rate limits idênticos; não é uma API privilegiada. Localmente o proxy HTTP continua funcionando. Isso não comprova inferência válida nem exclui falhas de rede no aparelho. As alterações locais precisam ser publicadas para chegar a esse domínio.

## Comportamento e segurança

- `GET /componentes/catalogo` busca no servidor com 30 resultados por página, debounce e cancelamento no frontend; o celular não baixa os 42 mil registros. Catálogo empacotado não exige Neon nem consulta externa em cada pesquisa.
- `POST /componentes/ia/analisar` aceita de 2 a 16 modelos conhecidos, quantidades de 1 a 4 e BIOS opcional (40 caracteres), até 4 KB. CPU, placa-mãe, fonte, gabinete e cooler são únicos; RAM, vídeo e armazenamento permitem vários modelos. Quantidade de RAM é de kits, não módulos avulsos.
- O servidor resolve IDs no snapshot, sem confiar em especificações, prompt, URL, modelo ou resultado enviados pelo cliente. A IA recebe apenas fichas públicas, quantidades, BIOS declarada e limitações da fonte. Nunca envia token, conta, endereço ou conteúdo privado do passaporte.
- O catálogo não contém socket dos processadores, DDR/lista de CPUs/BIOS mínima/QVL das placas-mãe e todos os limites físicos/elétricos. A IA deve apontar dados ausentes e separar hipóteses de fatos; não deve aprovar lacunas. Não certifica um computador completo, velocidades ou peças usadas. Confira o fabricante antes de comprar ou montar.
- Saídas passam por validação de JSON, tamanho, campos, IDs, cobertura das peças e coerência do status. Respostas truncadas, ferramentas, pensamentos, HTML, URLs ou reprodução da chave são rejeitadas. Essa validação estrutural **não prova a verdade técnica** da análise. React renderiza texto, nunca HTML da IA.
- Gemini/Groq usam hosts oficiais fixos, chave somente em header, sem redirecionamento. Chaves nunca aparecem na URL, corpo, logs ou resposta. Variáveis públicas com nomes de segredo são recusadas no build/inicialização.
- Antes do pedido, a tela informa o envio ao provedor. No nível gratuito do Gemini, os dados podem ser usados para melhorar os serviços Google; não inclua informações pessoais na BIOS.
- Limite compartilhado de oito pedidos/IP em dez minutos entre análise e explicação legada, mais limite global. Uma geração local ou duas externas simultâneas por processo. Cache interno de até 50 resultados por dez minutos, considerando seleção, quantidades, modelo e snapshot. Em múltiplas instâncias, os limites em memória não são globais: mantenha também cotas no provedor.
- Na função Vercel de 30 segundos, a chamada externa tem no máximo 25 segundos. Ollama local permite até 180 segundos. Trocar peças ou cancelar invalida a resposta pendente. Falhas não geram repetição automática de inferência.

## Alternativas

Ollama: `COMPAT_AI_PROVIDER=ollama`, `OLLAMA_BASE_URL=http://127.0.0.1:11434`, `OLLAMA_MODEL=qwen3:4b`, `COMPAT_AI_TIMEOUT_MS=120000`. Instale/abra o Ollama e baixe o modelo nesse computador. Só loopback HTTP é aceito; modelos cloud são rejeitados. **Não funciona como serviço local na Vercel**: lá localhost é a função, não seu computador.

Groq: `COMPAT_AI_PROVIDER=groq`, `GROQ_API_KEY`, `GROQ_MODEL=openai/gpt-oss-20b`, `COMPAT_AI_TIMEOUT_MS=25000`. O modelo precisa suportar JSON Schema estrito. Para desligar, use `COMPAT_AI_PROVIDER=disabled`; catálogo continua acessível, mas não há resultado de análise sem IA.

Fontes oficiais: [Gemini](https://ai.google.dev/gemini-api/docs/models), [chaves](https://ai.google.dev/gemini-api/docs/api-key), [preços/cotas](https://ai.google.dev/gemini-api/docs/pricing), [Vercel duration](https://vercel.com/docs/functions/configuring-functions/duration), [Neon pooling](https://neon.com/docs/connect/connection-pooling), [Ollama](https://docs.ollama.com/faq), [Groq](https://console.groq.com/docs/structured-outputs).
