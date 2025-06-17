/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.ignoreWarnings = config.ignoreWarnings || [];
      config.ignoreWarnings.push({
        message: /the request of a dependency is an expression/,
        module: /@supabase[\\/]realtime-js/,
      });
      // Add fallback for buffer if needed
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        buffer: require.resolve('buffer/'),
      };
    }
    return config;
  },
};

module.exports = nextConfig;
