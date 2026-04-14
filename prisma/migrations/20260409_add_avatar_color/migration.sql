-- AlterTable
ALTER TABLE "users" ADD COLUMN "avatarColor" TEXT;

-- Backfill: assign deterministic gradient based on full hash of user ID
-- hashtext() gives a proper int32 hash of the entire string for even distribution
UPDATE "users" SET "avatarColor" = CASE (abs(hashtext(id)) % 5)
  WHEN 0 THEN 'from-sky-400 to-blue-500'
  WHEN 1 THEN 'from-violet-400 to-purple-500'
  WHEN 2 THEN 'from-emerald-400 to-teal-500'
  WHEN 3 THEN 'from-rose-400 to-pink-500'
  WHEN 4 THEN 'from-amber-400 to-orange-500'
END
WHERE "avatarColor" IS NULL;
