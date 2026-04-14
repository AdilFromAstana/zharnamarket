import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Оптимизированный вывод для Docker — уменьшает размер образа
  output: "standalone",
  // Prisma и pg-адаптер — серверные пакеты, не должны проходить через браузерный резолвер
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"],
};

export default nextConfig;
