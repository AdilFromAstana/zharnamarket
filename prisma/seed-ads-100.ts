/**
 * Seed-скрипт: добавляет 100 объявлений с нарративными описаниями.
 * Запуск: npx tsx prisma/seed-ads-100.ts
 *
 * Данные разделены на 2 файла по 50 объявлений:
 *   prisma/ads-data-1.ts  — объявления 1–50
 *   prisma/ads-data-2.ts  — объявления 51–100
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { ADS_DATA_1 } from "./ads-data-1";
import { ADS_DATA_2 } from "./ads-data-2";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

// Объединяем оба массива через spread-оператор
const ADS_DATA = [...ADS_DATA_1, ...ADS_DATA_2];

// ──────────────────────────────────────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding 100 ads...");

  const password = await bcrypt.hash("password123", 12);

  // Создаём всех уникальных пользователей
  const uniqueEmails = [...new Set(ADS_DATA.map((a) => a.ownerEmail))];
  const userMap: Record<string, string> = {};

  for (const email of uniqueEmails) {
    const adData = ADS_DATA.find((a) => a.ownerEmail === email)!;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
      const created = await prisma.user.create({
        data: { email, name: adData.ownerName, password, phone: null },
      });
      userMap[email] = created.id;
      console.log(`  ✓ User: ${adData.ownerName}`);
    } else {
      userMap[email] = existing.id;
      console.log(`  ~ User exists: ${adData.ownerName}`);
    }
  }

  // Создаём объявления
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  let created = 0;
  let skipped = 0;

  for (const ad of ADS_DATA) {
    const ownerId = userMap[ad.ownerEmail];
    if (!ownerId) continue;

    const existing = await prisma.ad.findFirst({
      where: { ownerId, title: ad.title },
    });

    if (!existing) {
      const createdAd = await prisma.ad.create({
        data: {
          ownerId,
          companyName: ad.companyName,
          title: ad.title,
          description: ad.description,
          platform: ad.platform as any,
          city: ad.city as any,
          category: ad.category as any,
          budgetType: ad.budgetType as any,
          budgetFrom: ad.budgetFrom ?? null,
          budgetTo: ad.budgetTo ?? null,
          budgetDetails: (ad as any).budgetDetails ?? null,
          contactTelegram: ad.contactTelegram,
          contactWhatsapp: ad.contactWhatsapp ?? null,
          images: [],
          status: "active",
          featured: ad.featured,
          publishedAt: now,
          expiresAt,
        },
      });

      // Создаём бусты
      for (const boostType of ad.boosts) {
        const boostExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        await prisma.adBoost.create({
          data: {
            adId: createdAd.id,
            boostType: boostType as any,
            activatedAt: now,
            expiresAt: boostExpires,
          },
        });
      }

      created++;
      if (created % 10 === 0) console.log(`  ✓ ${created} объявлений создано...`);
    } else {
      skipped++;
    }
  }

  console.log(`\n✅ Готово! Создано: ${created}, пропущено (уже существуют): ${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
