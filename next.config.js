/** @type {import('next').NextConfig} */
const nextConfig = {
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
