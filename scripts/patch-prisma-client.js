#!/usr/bin/env node
/**
 * Патч для Prisma v7.5 + Next.js 16 (Turbopack) + PrismaPg (driver adapter).
 *
 * Проблема: Turbopack при SSR использует `browser` condition при резолвинге пакетов.
 * `@prisma/client/package.json` имеет `"browser": "default.js"`.
 * `default.js` делает `require('#main-entry-point')`, которое Node.js ищет в `imports`
 * пакета `@prisma/client` — но там `imports` пустое.
 * Реальные сгенерированные файлы находятся в `.prisma/client/`.
 *
 * Решение:
 * 1. Добавить `#main-entry-point` в `@prisma/client/package.json`
 * 2. Скопировать сгенерированные WASM/runtime файлы из `.prisma/client/` в `@prisma/client/`
 */

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const generatedDir = path.join(root, "node_modules", ".prisma", "client");
const clientDir = path.join(root, "node_modules", "@prisma", "client");

const generatedPkg = path.join(generatedDir, "package.json");
const clientPkg = path.join(clientDir, "package.json");

if (!fs.existsSync(generatedPkg)) {
  console.error("[patch-prisma] .prisma/client/package.json not found. Run prisma generate first.");
  process.exit(0);
}

// 1. Патч imports в @prisma/client/package.json
const client = JSON.parse(fs.readFileSync(clientPkg, "utf-8"));
client.imports = client.imports || {};
client.imports["#main-entry-point"] = {
  require: {
    node: "./index.js",
    "edge-light": "./edge.js",
    workerd: "./edge.js",
    worker: "./edge.js",
    browser: "./index-browser.js",
    default: "./index.js",
  },
  import: {
    node: "./index.js",
    "edge-light": "./edge.js",
    workerd: "./edge.js",
    worker: "./edge.js",
    browser: "./index-browser.js",
    default: "./index.js",
  },
  default: "./index.js",
};
client.imports["#wasm-compiler-loader"] = {
  "edge-light": "./wasm-edge-light-loader.mjs",
  workerd: "./wasm-worker-loader.mjs",
  worker: "./wasm-worker-loader.mjs",
  default: "./wasm-worker-loader.mjs",
};
fs.writeFileSync(clientPkg, JSON.stringify(client, null, 2));
console.log("[patch-prisma] Patched @prisma/client/package.json imports");

// 2. Копируем сгенерированные runtime-файлы из .prisma/client/ в @prisma/client/
const filesToCopy = [
  "query_compiler_fast_bg.js",
  "query_compiler_fast_bg.wasm",
  "query_compiler_fast_bg.wasm-base64.js",
  "wasm-worker-loader.mjs",
  "wasm-edge-light-loader.mjs",
];

for (const file of filesToCopy) {
  const src = path.join(generatedDir, file);
  const dst = path.join(clientDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dst);
    console.log(`[patch-prisma] Copied ${file}`);
  }
}

console.log("[patch-prisma] Done. @prisma/client is now patched for Turbopack SSR.");
