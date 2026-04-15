import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Оптимизированный вывод для Docker — уменьшает размер образа
  output: "standalone",
  // Prisma и pg-адаптер — серверные пакеты, не должны проходить через браузерный резолвер
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"],
  async redirects() {
    return [
      { source: "/balance", destination: "/cabinet/balance", permanent: true },
      { source: "/balance/:path*", destination: "/cabinet/balance/:path*", permanent: true },
      { source: "/settings", destination: "/cabinet/settings", permanent: true },
      { source: "/settings/:path*", destination: "/cabinet/settings/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
