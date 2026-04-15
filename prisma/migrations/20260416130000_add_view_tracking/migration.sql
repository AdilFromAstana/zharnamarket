-- CreateTable: profile_views
CREATE TABLE "profile_views" (
    "id" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "userId" TEXT,
    "ipHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ad_views
CREATE TABLE "ad_views" (
    "id" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "userId" TEXT,
    "ipHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "profile_views_creatorProfileId_createdAt_idx" ON "profile_views"("creatorProfileId", "createdAt");
CREATE INDEX "profile_views_creatorProfileId_ipHash_createdAt_idx" ON "profile_views"("creatorProfileId", "ipHash", "createdAt");
CREATE INDEX "ad_views_adId_createdAt_idx" ON "ad_views"("adId", "createdAt");
CREATE INDEX "ad_views_adId_ipHash_createdAt_idx" ON "ad_views"("adId", "ipHash", "createdAt");

-- AddForeignKey
ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ad_views" ADD CONSTRAINT "ad_views_adId_fkey" FOREIGN KEY ("adId") REFERENCES "ads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
