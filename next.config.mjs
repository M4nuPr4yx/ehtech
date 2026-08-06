/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  async rewrites() {
    return [{
      source: '/uploads/:path*',
      destination: 'http://localhost:3000/uploads/:path*',
    }];
  },
};

export default nextConfig;
