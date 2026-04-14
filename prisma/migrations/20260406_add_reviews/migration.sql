-- Фаза 1: Система отзывов для CreatorProfile

-- Enum для типа цели отзыва (с заделом на фазу 2 — отзывы на заказчиков)
CREATE TYPE "ReviewTargetType" AS ENUM ('creator_profile');

-- Enum роли пользователя (admin / user)
CREATE TYPE "Role" AS ENUM ('user', 'admin');

-- Добавить role в users
ALTER TABLE "users" ADD COLUMN "role" "Role" NOT NULL DEFAULT 'user';

-- Добавить поля рейтинга в creator_profiles
ALTER TABLE "creator_profiles" ADD COLUMN "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "creator_profiles" ADD COLUMN "reviewCount" INTEGER NOT NULL DEFAULT 0;

-- Таблица отзывов
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "targetType" "ReviewTargetType" NOT NULL DEFAULT 'creator_profile',
    "targetId" TEXT NOT NULL,
    "creatorProfileId" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "reply" TEXT,
    "repliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- Уникальный индекс: один отзыв на пару (reviewer → target)
CREATE UNIQUE INDEX "reviews_reviewerId_targetType_targetId_key" ON "reviews"("reviewerId", "targetType", "targetId");

-- Индексы для быстрого поиска
CREATE INDEX "reviews_targetType_targetId_idx" ON "reviews"("targetType", "targetId");
CREATE INDEX "reviews_reviewerId_idx" ON "reviews"("reviewerId");
CREATE INDEX "reviews_creatorProfileId_idx" ON "reviews"("creatorProfileId");

-- FK: reviewer → users
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewerId_fkey"
    FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FK: creatorProfile → creator_profiles
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_creatorProfileId_fkey"
    FOREIGN KEY ("creatorProfileId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Таблица взаимодействий (contact-click с авторизацией)
CREATE TABLE "contact_interactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_interactions_pkey" PRIMARY KEY ("id")
);

-- Уникальный индекс: один interaction на пару (user → creatorProfile)
CREATE UNIQUE INDEX "contact_interactions_userId_creatorProfileId_key" ON "contact_interactions"("userId", "creatorProfileId");

-- Индексы
CREATE INDEX "contact_interactions_userId_idx" ON "contact_interactions"("userId");
CREATE INDEX "contact_interactions_creatorProfileId_idx" ON "contact_interactions"("creatorProfileId");

-- FK: user → users
ALTER TABLE "contact_interactions" ADD CONSTRAINT "contact_interactions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FK: creatorProfile → creator_profiles
ALTER TABLE "contact_interactions" ADD CONSTRAINT "contact_interactions_creatorProfileId_fkey"
    FOREIGN KEY ("creatorProfileId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
