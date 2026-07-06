/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  experimental: { serverComponentsExternalPackages: ['playwright'] },
  webpack: (config, { isServer }) => {
    if (isServer) config.externals.push('playwright');
    return config;
  },
};
