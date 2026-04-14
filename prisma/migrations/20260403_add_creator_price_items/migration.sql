-- CreateTable
CREATE TABLE "creator_price_items" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "creator_price_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "creator_price_items" ADD CONSTRAINT "creator_price_items_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
