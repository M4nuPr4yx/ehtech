/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  images: {
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
    // Em desenvolvimento local, repassa chamadas /api para o backend local (porta 3000)
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.BACKEND_URL || 'http://localhost:3000'}/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${process.env.BACKEND_URL || 'http://localhost:3000'}/uploads/:path*`,
      },
    ];
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
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
