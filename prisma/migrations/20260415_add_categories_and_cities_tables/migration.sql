-- Migration: Add Category and City tables, replace enum fields with relations

-- Create categories table
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- Create cities table
CREATE TABLE "cities" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- Add foreign key columns to existing tables
ALTER TABLE "creator_profiles" ADD COLUMN "cityId" TEXT;
ALTER TABLE "ads" ADD COLUMN "cityId" TEXT;
ALTER TABLE "ads" ADD COLUMN "categoryId" TEXT;
ALTER TABLE "portfolio_items" ADD COLUMN "categoryId" TEXT;

-- Create indexes
CREATE UNIQUE INDEX "categories_key_key" ON "categories"("key");
CREATE UNIQUE INDEX "cities_key_key" ON "cities"("key");
CREATE INDEX "creator_profiles_cityId_idx" ON "creator_profiles"("cityId");
CREATE INDEX "ads_cityId_idx" ON "ads"("cityId");
CREATE INDEX "ads_categoryId_idx" ON "ads"("categoryId");
CREATE INDEX "portfolio_items_categoryId_idx" ON "portfolio_items"("categoryId");

-- Add foreign key constraints
ALTER TABLE "creator_profiles" ADD CONSTRAINT "creator_profiles_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ads" ADD CONSTRAINT "ads_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ads" ADD CONSTRAINT "ads_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;