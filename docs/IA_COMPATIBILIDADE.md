# IA do verificador

Gemini é o provedor externo escolhido para o projeto. Ollama local e Groq continuam disponíveis por configuração explícita. O visitante pede uma explicação depois de verificar as peças. O servidor recalcula a análise a partir dos IDs e das fichas atuais; a IA não decide nem altera a compatibilidade.

## Ativar Gemini neste computador

Abra o arquivo privado `backend/.env.ai`, já preparado, e preencha somente `GEMINI_API_KEY` com a chave criada no Google AI Studio:

```dotenv
COMPAT_AI_PROVIDER=gemini
GEMINI_MODEL=gemini-3.1-flash-lite
GEMINI_API_KEY=
COMPAT_AI_TIMEOUT_MS=30000
```

Não cole a chave no chat, no frontend ou em exemplos versionados. Salve o arquivo e reinicie somente o backend. Se o site estiver rodando com `npm run dev`, encerre essa execução e execute o mesmo comando novamente; não abra uma segunda instância. Acesse `http://localhost:3001/compatibilidade`, selecione as peças, verifique e clique em “Explicar resultado com IA”. A tela identifica “Online · Gemini”.

Sem chave, a tela informa que ela precisa ser configurada no servidor e nenhuma chamada ao Google é feita. Chaves de autorização no formato `AQ.` também são aceitas, sem permitir espaços internos ou quebras de linha. O indicador de configuração não testa a validade da chave nem garante cota disponível. A primeira explicação confirma a autorização e a disponibilidade do modelo.

O padrão `gemini-3.1-flash-lite` foi conferido na página oficial de preço em 8 de outubro de 2026 e validado com uma explicação real estruturada: possui nível gratuito e respondeu corretamente ao caso de socket AM5/AM4 e memória DDR5/DDR4 incompatíveis. Foi escolhido após o modelo 3.8 retornar indisponibilidade por alta demanda. As cotas variam por conta/modelo e podem mudar. A integração não habilita faturamento, troca de modelo nem provedor automaticamente. Se o modelo deixar de estar disponível, confira as opções da sua conta e altere `GEMINI_MODEL` no servidor para um modelo de texto Gemini que suporte JSON Schema.

## Configuração na Vercel

No projeto da Vercel, abra Settings → Environment Variables. Cadastre no ambiente de destino as quatro variáveis do exemplo acima, preenchendo a chave apenas no valor de `GEMINI_API_KEY`. Marque a chave como Sensitive quando disponível. Nenhuma dessas variáveis usa o prefixo `NEXT_PUBLIC_`. Faça um novo deploy para aplicar a configuração. Backend, banco e autenticação também precisam estar configurados conforme o restante do projeto.

O arquivo local `backend/.env.ai` não é lido em produção nem na Vercel. O Git ignora arquivos `.env*` e o `.vercelignore` também exclui esses arquivos do upload via CLI, além de arquivos de chave e diretórios de trabalho. As variáveis definidas no processo sempre têm prioridade. Em desenvolvimento, `.env.ai` é carregado antes de `backend/.env`, para que a seleção de IA não dependa de alterar as credenciais do banco.

## Proteção de credenciais e dados

- Chaves Gemini/Groq são lidas somente do ambiente do servidor. Não ficam no código, URL, corpo do pedido, respostas HTTP ou armazenamento do navegador. O Gemini usa o header `x-goog-api-key`; Groq usa `Authorization`.
- A integração consulta apenas os hosts oficiais fixos e recusa redirecionamentos. O cliente não pode informar chave, URL, modelo, prompt ou resultado técnico.
- A inicialização do backend e a configuração do Next recusam variáveis `NEXT_PUBLIC_*` com nomes de credenciais. O erro contém apenas nomes, nunca seus valores.
- Mensagens de erro do provedor são descartadas; não são devolvidas nem registradas. Uma resposta que reproduza a chave é rejeitada. Dados pessoais, token, passaporte, mensagens e e-mail não entram no contexto enviado à IA.
- O Google recebe somente fichas públicas revisadas, BIOS informada e requisitos técnicos calculados. No nível gratuito, pode usar esses dados para melhorar seus produtos; a interface informa isso antes do pedido. Não envie dados pessoais em fichas técnicas.
- Arquivos ignorados continuam privados no computador: não os compartilhe, inclua em ZIPs ou envie em screenshots. Se uma credencial vazar, substitua-a no provedor e atualize a configuração. Ignorar um arquivo não remove um segredo que tenha sido versionado anteriormente.

## Comportamento e limites

- `GET /api/componentes/ia/status` expõe apenas provedor, modelo, configuração e mensagem. Para provedores externos, não faz inferência nem promete autorização/cota disponível.
- `POST /api/componentes/ia/explicar` aceita somente a seleção e a BIOS, até 4 KB, e retorna `{ verificacao, ia }`. A IA explica até quatro requisitos prioritários; não busca modelos novos nem amplia o catálogo.
- Valida JSON, tamanho, códigos, cobertura e igualdade dos status. Gemini com bloqueio, truncamento, ferramentas ou pensamentos retornados não é exibido. Fontes e rótulos vêm das regras; o texto é renderizado pelo React, sem HTML executável.
- Sem chave, autorização recusada, cota atingida, modelo ausente, timeout ou resposta inválida, a análise pelas regras continua disponível. Não há repetição automática de pedidos ou fallback para outro provedor.
- Gemini/Groq têm prazo padrão de 30 segundos. Na função Vercel configurada para 30 segundos, a chamada externa fica limitada a 25 segundos. Ollama permite até 180 segundos no backend, cobertos pelos 190 segundos do proxy Next.
- Limite de oito pedidos por IP em dez minutos, uma geração local ou duas externas simultâneas por processo. Cache de até 50 explicações por dez minutos, considerando modelos, fichas e revisões. Em várias instâncias, os limites em memória não são compartilhados; use também as cotas do provedor para controlar uso em produção.
- Alterar uma peça cancela a solicitação e limpa a explicação anterior. A validação não prova que toda frase esteja correta: as fichas, fontes e regras permanecem a referência. A IA não certifica um PC completo, QVL, velocidades, overclock ou peças usadas.

## Alternativas preservadas

Para executar localmente, use `COMPAT_AI_PROVIDER=ollama`, `OLLAMA_BASE_URL=http://127.0.0.1:11434`, `OLLAMA_MODEL=qwen3:4b` e `COMPAT_AI_TIMEOUT_MS=120000`. Abra o Ollama e baixe o modelo com `ollama pull qwen3:4b`. A URL aceita apenas loopback e modelos cloud são rejeitados. Não exige chave nem envia a seleção a um provedor externo.

Para Groq, configure `COMPAT_AI_PROVIDER=groq`, `GROQ_MODEL=openai/gpt-oss-20b`, `GROQ_API_KEY` e prazo de 30000 ms. Outro modelo Groq precisa suportar `json_schema` com `strict: true`.

Para desligar, use `COMPAT_AI_PROVIDER=disabled`. Sem configuração, a IA fica desativada e o verificador funciona normalmente.

Fontes oficiais: [chaves Gemini](https://ai.google.dev/gemini-api/docs/api-key), [preço e nível gratuito](https://ai.google.dev/gemini-api/docs/pricing), [API de geração](https://ai.google.dev/api/generate-content), [Ollama](https://docs.ollama.com/faq), [Groq Structured Outputs](https://console.groq.com/docs/structured-outputs).
