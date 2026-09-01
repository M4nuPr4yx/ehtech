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

  // No navegador:
  if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    // Em desenvolvimento local: direciona para o backend na porta 3000
    if (isLocalhost) {
      const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      return `http://localhost:3000${path}`;
    }

    // Em produção (ex: Vercel): usa caminhos relativos (mesmo domínio)
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return path;
  }

  // No SSR (Node.js):
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}${path}`;
  }
  return `http://localhost:3000${path}`;
};

export default getApiUrl;
