/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Разрешает сборку проекта даже если есть ошибки TypeScript
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
