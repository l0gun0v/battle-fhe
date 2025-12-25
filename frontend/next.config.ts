import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Suppress circular dependency warnings from Zama FHE SDK
    config.ignoreWarnings = [
      {
        module: /node_modules\/@zama-fhe\/relayer-sdk/,
      },
      {
        file: /node_modules\/@zama-fhe\/relayer-sdk/,
      },
      (warning: { message?: string }) => {
        return warning.message?.includes('Circular dependency') && 
               warning.message?.includes('@zama-fhe/relayer-sdk')
      },
    ]

    // Optimize chunk splitting to reduce circular dependency issues
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks?.cacheGroups,
            zamaSdk: {
              test: /[\\/]node_modules[\\/]@zama-fhe[\\/]relayer-sdk[\\/]/,
              name: 'zama-sdk',
              chunks: 'async',
              enforce: true,
              priority: 20,
            },
          },
        },
      }
    }

    return config
  },
  // Suppress build warnings for known issues
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
}

export default nextConfig
