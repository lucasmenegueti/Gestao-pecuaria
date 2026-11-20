import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    typedEnv: true,
    // Seção já visitada volta do cache do navegador por 60 s, sem ir ao servidor.
    // Trocar período/filtro muda a URL e busca de novo.
    staleTimes: { dynamic: 60 },
  },
};

export default nextConfig;
