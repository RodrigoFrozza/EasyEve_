/** @type {import('next').NextConfig} */
const nextConfig = {
  swcMinify: false, // Disabling SWC minification helps with OOM during build on low-RAM servers
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
    cpus: 1,
    workerThreads: false,
    webpackBuildWorker: true,
  },
  output: 'standalone',
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
