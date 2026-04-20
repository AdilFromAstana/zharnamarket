import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Конфиг ТОЛЬКО для email-тестов.
 *
 * Запуск: `npm run test:email` → tests/email/REPORT.md.
 */
export default defineConfig({
  test: {
    pool: "forks",
    fileParallelism: false,
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    include: ["tests/email/**/*.test.ts"],
    reporters: ["default", "./scripts/email-report.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
