/**
 * Helper centralizado para URLs de API do EHtech
 * Permite que o frontend funcione perfeitamente em:
 * 1. Ambiente de desenvolvimento local (localhost:3000 / localhost:3001)
 * 2. Deploy unificado na Vercel (mesmo domínio com Serverless API)
 * 3. Deploy com backend externo configurado via NEXT_PUBLIC_API_URL
 */

export const getApiUrl = (endpoint = '') => {
  // Se houver uma variável de ambiente definida, usa ela com prioridade
  if (process.env.NEXT_PUBLIC_API_URL) {
    const base = process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '');
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${base}${path}`;
  }

  // Mesmo endereço do site, tanto por localhost quanto pelo IP da rede.
  // O Next local encaminha /api ao Express; a Vercel usa a função serverless.
  if (typeof window !== 'undefined') {
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `/api${path}`;
  }

  // No SSR (Node.js):
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/api${path}`;
  }
  return `http://localhost:3000${path}`;
};

export default getApiUrl;
