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

O backend detecta a conexão PostgreSQL/Neon automaticamente, cria todas as tabelas necessárias (`usuarios`, `produtos`, `avaliacoes`, `mensagens`, etc.) e converte todas as consultas de forma 100% transparente.

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
| `API_SEGREDO` | `g98VFDRf1XFXyF51vjbD+PewDAjB+HY5y5sVARKAB+0zqpZS0cFMr9X4XmerNQvk` |

4. Clique em **Deploy**!
