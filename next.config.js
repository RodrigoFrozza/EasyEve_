/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    outputFileTracingIncludes: {
      '/_next/static/**': true,
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.evetools.dev',
      },
      {
        protocol: 'https',
        hostname: 'images.evetools.dev',
      },
    ],
  },
}

module.exports = nextConfig
