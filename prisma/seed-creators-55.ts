/**
 * Seed-скрипт: добавляет 55 креаторских профилей с детальными данными.
 * Часть профилей имеет активные бусты (rise/vip/premium).
 *
 * Запуск: npx tsx prisma/seed-creators-55.ts
 *
 * Данные разделены на 2 файла:
 *   prisma/creators-data-1.ts  — профили 1–28
 *   prisma/creators-data-2.ts  — профили 29–55
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { CREATORS_DATA_1 } from "./creators-data-1";
import { CREATORS_DATA_2 } from "./creators-data-2";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

// Объединяем оба массива
const CREATORS_DATA = [...CREATORS_DATA_1, ...CREATORS_DATA_2];

// Набор градиентов для аватарок (для тех у кого нет фото)
const AVATAR_GRADIENTS = [
  "from-sky-400 to-blue-500",
  "from-violet-400 to-purple-500",
  "from-rose-400 to-pink-500",
  "from-amber-400 to-orange-500",
  "from-emerald-400 to-green-500",
  "from-cyan-400 to-teal-500",
  "from-fuchsia-400 to-pink-600",
  "from-indigo-400 to-blue-600",
  "from-lime-400 to-green-600",
  "from-red-400 to-rose-600",
];

// ──────────────────────────────────────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🌱 Seeding ${CREATORS_DATA.length} creator profiles...\n`);

  const password = await bcrypt.hash("password123", 12);

  // 1. Создаём всех уникальных пользователей
  const uniqueEmails = [...new Set(CREATORS_DATA.map((c) => c.email))];
  const userMap: Record<string, string> = {};

  for (const email of uniqueEmails) {
    const creatorData = CREATORS_DATA.find((c) => c.email === email)!;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
      const created = await prisma.user.create({
        data: {
          email,
          name: creatorData.name,
          password,
          phone: null,
          avatarColor: AVATAR_GRADIENTS[Math.floor(Math.random() * AVATAR_GRADIENTS.length)],
        },
      });
      userMap[email] = created.id;
      console.log(`  ✓ User: ${creatorData.name}`);
    } else {
      userMap[email] = existing.id;
      console.log(`  ~ User exists: ${creatorData.name}`);
    }
  }

  console.log(`\n📋 Users ready: ${Object.keys(userMap).length}\n`);

  // 2. Создаём профили
  const now = new Date();
  let created = 0;
  let skipped = 0;
  let boostsCreated = 0;

  for (const c of CREATORS_DATA) {
    const userId = userMap[c.email];
    if (!userId) continue;

    // Проверяем существование
    const existing = await prisma.creatorProfile.findFirst({
      where: { userId, title: c.title },
    });

    if (existing) {
      skipped++;
      continue;
    }

    // Создаём профиль
    const profile = await prisma.creatorProfile.create({
      data: {
        userId,
        title: c.title,
        fullName: c.fullName,
        bio: c.bio,
        city: c.city as any,
        age: c.age,
        availability: c.availability as any,
        verified: c.verified,
        contentCategories: c.categories as any[],
        minimumRate: c.minimumRate,
        negotiable: true,
        isPublished: true,
        publishedAt: now,
        contactTelegram: c.contactTelegram,
        contactWhatsapp: c.contactWhatsapp,
        averageRating: c.averageRating,
        reviewCount: c.reviewCount,
        contactClickCount: Math.floor(Math.random() * 50) + 5,
        // Если есть бусты — устанавливаем raisedAt для сортировки
        raisedAt: c.boosts.length > 0 ? now : null,
        platforms: {
          create: c.platforms.map((p) => ({
            name: p.name as any,
            handle: p.handle,
            url: p.url,
            followers: p.followers,
          })),
        },
        priceItems: {
          create: c.priceItems.map((item) => ({
            label: item.label,
            price: item.price,
            sortOrder: item.sortOrder,
          })),
        },
      },
    });

    // 3. Создаём бусты
    for (const boostType of c.boosts) {
      const boostExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      await prisma.creatorBoost.create({
        data: {
          creatorProfileId: profile.id,
          boostType: boostType as any,
          activatedAt: now,
          expiresAt: boostExpires,
        },
      });
      boostsCreated++;
    }

    created++;
    if (created % 10 === 0) {
      console.log(`  ✓ ${created} профилей создано...`);
    }
  }

  console.log(`\n✅ Готово!`);
  console.log(`   Создано профилей: ${created}`);
  console.log(`   Пропущено (уже существуют): ${skipped}`);
  console.log(`   Создано бустов: ${boostsCreated}`);
  console.log(`   Всего профилей в БД: ${await prisma.creatorProfile.count()}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
