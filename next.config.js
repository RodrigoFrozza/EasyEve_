/** @type {import('next').NextConfig} */
const nextConfig = {
  swcMinify: true,
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.evetech.net',
      },
      {
        protocol: 'https',
        hostname: 'images.evetools.dev',
      },
    ],
  },
  productionBrowserSourceMaps: false,
}

module.exports = nextConfig
