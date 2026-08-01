/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better dev-time warnings
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['@resvg/resvg-js'],
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
}

module.exports = nextConfig
