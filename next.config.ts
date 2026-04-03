import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Experimental features
  experimental: {
    // Enable server component external packages
    serverComponentsExternalPackages: ['xml2js'],
  },
  
  // Set the Turbopack root to help Next.js find the correct workspace root
  turbopack: {
    root: './',
  },
  
  // Environment variables that should be available on the client side
  env: {
    NODE_ENV: process.env.NODE_ENV || 'development',
  },
  
  // Webpack configuration for better production builds
  webpack: (config, { isServer }) => {
    // Handle node modules that might cause issues in production
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        dns: false,
        child_process: false,
        tls: false,
      };
    }
    
    return config;
  },
  
  // Output configuration for better compatibility
  output: 'standalone',
  
  // TypeScript configuration
  typescript: {
    // Dangerously allow production builds to successfully complete even if type errors
    ignoreBuildErrors: false,
  },
  
  // ESLint is now handled via standard CLI, so the 'eslint' block is removed.
};
