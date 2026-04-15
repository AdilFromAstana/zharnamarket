-- Add new values to the Platform enum.
-- ALTER TYPE ... ADD VALUE must run outside a transaction in Postgres,
-- so each statement is committed separately by Prisma.
ALTER TYPE "Platform" ADD VALUE IF NOT EXISTS 'Threads';
ALTER TYPE "Platform" ADD VALUE IF NOT EXISTS 'Telegram';
ALTER TYPE "Platform" ADD VALUE IF NOT EXISTS 'VK';

-- Add iconUrl column to the platforms reference table.
ALTER TABLE "platforms" ADD COLUMN IF NOT EXISTS "iconUrl" TEXT;

-- Seed the new reference rows (idempotent).
INSERT INTO "platforms" ("id", "key", "label", "sortOrder", "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'Threads',  'Threads',  4, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'Telegram', 'Telegram', 5, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'VK',       'VK',       6, true, NOW(), NOW())
ON CONFLICT ("key") DO NOTHING;
