/**
 * Helper centralizado para URLs de API do EHtech
 * Permite que o frontend funcione perfeitamente em:
 * 1. Ambiente de desenvolvimento local (localhost:3000 / localhost:3001)
 * 2. Deploy unificado na Vercel (mesmo domínio com Serverless API)
 * 3. Deploy com backend externo configurado via NEXT_PUBLIC_API_URL
 */

export const getApiUrl = (endpoint = '') => {
  const path = `/${endpoint.replace(/^\/+/, '').replace(/^api(?:\/|$)/, '')}`;
  const browser = typeof window !== 'undefined';
  const deployment = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null;
  const origin = browser ? window.location.origin : deployment;
  if (process.env.NEXT_PUBLIC_API_URL) {
    try {
      const configured = process.env.NEXT_PUBLIC_API_URL.trim().replace(/\/+$/, '');
      const url = new URL(configured, origin || 'http://localhost:3001');
      const local = hostname => /^(localhost|127(?:\.\d{1,3}){3}|\[::1\]|0\.0\.0\.0)$/.test(hostname) || hostname.endsWith('.localhost');
      const privateHost = hostname => local(hostname) || /^(10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(hostname);
      const site = origin ? new URL(origin) : null;
      const invalid = !['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || (site && ((site.protocol === 'https:' && url.protocol !== 'https:') || (!privateHost(site.hostname) && privateHost(url.hostname)) || (local(url.hostname) && !local(site.hostname))));
      if (!invalid && (configured.startsWith('/') || /^https?:\/\//.test(configured))) {
        const base = url.pathname === '/' && site?.origin === url.origin ? `${url.origin}/api` : url.href.replace(/\/+$/, '');
        return `${base}${path}`;
      }
    } catch {}
  }

  // Mesmo endereço do site, tanto por localhost quanto pelo IP da rede.
  // O Next local encaminha /api ao Express; a Vercel usa a função serverless.
  if (browser) {
    return `/api${path}`;
  }

  // No SSR (Node.js):
  if (process.env.BACKEND_URL) {
    return `${process.env.BACKEND_URL.replace(/\/+$/, '')}${path}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/api${path}`;
  }
  return `http://localhost:3000${path}`;
};

export default getApiUrl;
