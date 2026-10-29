import lan from './config/lan.cjs';
import privateEnvironment from './config/private-environment.cjs';

privateEnvironment.assertPrivateEnvironment();

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.EHTECH_E2E === '1' ? 'scratch/e2e-next' : '.next',
  allowedDevOrigins: lan.getLanHosts(),
  reactCompiler: true,
  poweredByHeader: false,
  // Ollama local pode levar mais que os 30s padrão do proxy de rewrites.
  // O backend mantém seu próprio prazo de geração, limitado a 180s.
  experimental: { proxyTimeout: 190000 },
  images: {
    qualities: [50, 75],
    remotePatterns: [
      { protocol: 'https', hostname: 'commons.wikimedia.org', port: '', pathname: '/wiki/Special:FilePath/**' },
      { protocol: 'https', hostname: 'upload.wikimedia.org', port: '', pathname: '/wikipedia/commons/**' },
    ],
    localPatterns: [{ pathname: '/uploads/**', search: '' }],
    deviceSizes: [384, 640, 960, 1280],
    imageSizes: [64, 128, 256],
    formats: ['image/webp'],
    minimumCacheTTL: 86400,
    maximumResponseBody: 20000000,
    maximumRedirects: 3,
    dangerouslyAllowLocalIP: false,
    dangerouslyAllowSVG: false,
  },
  async rewrites() {
    const backend = (process.env.BACKEND_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');
    return {
      beforeFiles: [],
      afterFiles: [{
        source: '/uploads/:path*',
        destination: `${backend}/uploads/:path*`,
      }],
      // Mantém os handlers Next existentes; as demais rotas chegam ao Express.
      // Na Vercel, vercel.json já encaminha /api para a função serverless.
      fallback: process.env.VERCEL ? [] : [{
        source: '/api/:path*',
        destination: `${backend}/api/:path*`,
      }],
    };
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'X-XSS-Protection',
            value: '0',
          },
          {
            key: 'Content-Security-Policy',
            value: "base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'",
          },
          ...(process.env.NODE_ENV === 'production' ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000' }] : []),
        ],
      },
      {
        source: '/:path(redefinir-senha|esqueci-senha|login/google)',
        headers: [
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Cache-Control', value: 'no-store' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      {
        source: '/passaportes/publico/:codigo',
        headers: [
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },
};

export default nextConfig;
