# 🚀 Como Rodar Localmente e Usar com o Neon na Vercel (EHtech)

---

## 🐘 1. Usando com o Banco de Dados NEON (PostgreSQL)

O projeto agora conta com um **adaptador universal inteligente** que suporta tanto **Neon (PostgreSQL)** quanto **MySQL** automaticamente!

### Como configurar o Neon:
1. Acesse seu painel no [Neon.tech](https://neon.tech).
2. Na página inicial do seu projeto, copie a **Connection String** no formato **URI** (exemplo: `postgresql://neondb_owner:npg_xyz@ep-xyz-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require`).
3. Cole essa string como variável de ambiente:
   - **Localmente**: adicione no arquivo `.env` ou `backend/.env`:
     ```env
     DATABASE_URL=postgresql://neondb_owner:sua_senha@ep-xyz-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
     ```
   - **Na Vercel**: adicione a variável `DATABASE_URL` em **Settings > Environment Variables**.

O backend detecta a conexão PostgreSQL/Neon automaticamente e cria as tabelas necessárias. Antes de publicar, valide os fluxos de cadastro, login, anúncios, avaliações, mensagens e serviços no ambiente de preview.

---

## 💻 2. Rodando Localmente (Frontend + Backend com 1 único comando)

Basta rodar na raiz do projeto:

```bash
npm run dev
```

Esse comando iniciará simultaneamente:
- **Frontend (Next.js)** em: `http://localhost:3001`
- **Backend (Express)** em: `http://localhost:3000`

---

## ☁️ 3. Deploy na Vercel (Passo a Passo)

1. Suba seu código atualizado para o **GitHub**.
2. Acesse [vercel.com](https://vercel.com) e importe seu repositório.
3. Em **Environment Variables**, configure:

| Variável | Valor |
| :--- | :--- |
| `DATABASE_URL` | Sua URL de conexão do Neon (ex: `postgresql://...`) |
| `API_SEGREDO` | Gere uma chave exclusiva com pelo menos 32 caracteres; nunca a salve no Git |
| `FRONTEND_URL` | URL exata do site publicado, por exemplo `https://seu-projeto.vercel.app` |

4. Clique em **Deploy**!

> Segurança: se uma chave real já foi registrada em um commit, gere outra no painel da Vercel. Apagar o texto do arquivo não remove o valor do histórico do Git.
