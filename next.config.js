/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Добавляем принудительную настройку для стилей
  webpack: (config) => {
    return config;
  },
};

module.exports = nextConfig;
