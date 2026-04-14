-- Make email optional (Telegram-only accounts don't have email)
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;

-- Add Telegram auth columns
ALTER TABLE "users" ADD COLUMN "telegramId" TEXT;
ALTER TABLE "users" ADD COLUMN "telegramUsername" TEXT;

CREATE UNIQUE INDEX "users_telegramId_key" ON "users"("telegramId");
