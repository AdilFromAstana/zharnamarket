import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    // Sequential execution — tests share a real database
    pool: "forks",
    // Run test files sequentially to avoid DB race conditions
    fileParallelism: false,
    // Load env vars before anything else
    setupFiles: ["./tests/setup.ts"],
    // Generous timeout for DB operations
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Verbose reporter: show each test pass/fail + summary
    reporters: ["verbose"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
