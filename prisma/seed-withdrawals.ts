/**
 * Seed-скрипт: создаёт реалистичные запросы на вывод средств.
 *
 * Логика: креатор сам выводит деньги на карту через платёжный провайдер.
 * Админ НЕ участвует в выводе — только мониторит.
 * Статусы отражают состояние обработки провайдером:
 *   pending    — запрос создан, ждёт обработки провайдером
 *   processing — провайдер обрабатывает перевод
 *   completed  — деньги переведены на карту/Kaspi
 *   failed     — ошибка провайдера (неверные реквизиты, лимит и т.д.), средства возвращены на баланс
 *
 * Запуск: npx tsx prisma/seed-withdrawals.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

// ─── Данные креаторов для вывода ────────────────────────────────────────────

interface WithdrawalSeed {
  email: string;
  name: string;
  phone: string | null;
  withdrawals: Array<{
    amount: number;
    method: "kaspi" | "halyk" | "card";
    details: string;
    status: "pending" | "processing" | "completed" | "failed";
    daysAgo: number;
    /** Причина ошибки от провайдера (только для failed) */
    failReason?: string;
  }>;
  /** Общий заработок (начислено за одобренные видео) */
  totalEarned: number;
}

const SEED_DATA: WithdrawalSeed[] = [
  {
    email: "daniyar@test.kz",
    name: "Данияр Сейткали",
    phone: "+77011234567",
    totalEarned: 185000,
    withdrawals: [
      {
        amount: 15000,
        method: "kaspi",
        details: "+7 701 123 45 67",
        status: "completed",
        daysAgo: 21,
      },
      {
        amount: 25000,
        method: "kaspi",
        details: "+7 701 123 45 67",
        status: "completed",
        daysAgo: 14,
      },
      {
        amount: 35000,
        method: "kaspi",
        details: "+7 701 123 45 67",
        status: "processing",
        daysAgo: 0,
      },
    ],
  },
  {
    email: "aigeriim@test.kz",
    name: "Айгерим Нурланова",
    phone: "+77059876543",
    totalEarned: 320000,
    withdrawals: [
      {
        amount: 50000,
        method: "halyk",
        details: "4003 **** **** 7891",
        status: "completed",
        daysAgo: 30,
      },
      {
        amount: 45000,
        method: "kaspi",
        details: "+7 705 987 65 43",
        status: "completed",
        daysAgo: 18,
      },
      {
        amount: 60000,
        method: "kaspi",
        details: "+7 705 987 65 43",
        status: "completed",
        daysAgo: 7,
      },
      {
        amount: 30000,
        method: "halyk",
        details: "4003 **** **** 7891",
        status: "processing",
        daysAgo: 0,
      },
    ],
  },
  {
    email: "marat@test.kz",
    name: "Марат Джумабеков",
    phone: "+77019998877",
    totalEarned: 240000,
    withdrawals: [
      {
        amount: 20000,
        method: "kaspi",
        details: "+7 701 999 88 77",
        status: "completed",
        daysAgo: 25,
      },
      {
        amount: 40000,
        method: "card",
        details: "5274 **** **** 3344",
        status: "failed",
        daysAgo: 12,
        failReason: "Неверный номер карты",
      },
      {
        amount: 40000,
        method: "kaspi",
        details: "+7 701 999 88 77",
        status: "completed",
        daysAgo: 10,
      },
      {
        amount: 55000,
        method: "kaspi",
        details: "+7 701 999 88 77",
        status: "completed",
        daysAgo: 3,
      },
    ],
  },
  {
    email: "aliya.creator@test.kz",
    name: "Алия Касымова",
    phone: "+77071112233",
    totalEarned: 95000,
    withdrawals: [
      {
        amount: 10000,
        method: "kaspi",
        details: "+7 707 111 22 33",
        status: "completed",
        daysAgo: 15,
      },
      {
        amount: 18000,
        method: "kaspi",
        details: "+7 707 111 22 33",
        status: "completed",
        daysAgo: 5,
      },
    ],
  },
  {
    email: "ruslan.clips@test.kz",
    name: "Руслан Ахметов",
    phone: "+77024445566",
    totalEarned: 410000,
    withdrawals: [
      {
        amount: 100000,
        method: "halyk",
        details: "4405 **** **** 2210",
        status: "completed",
        daysAgo: 28,
      },
      {
        amount: 75000,
        method: "halyk",
        details: "4405 **** **** 2210",
        status: "completed",
        daysAgo: 16,
      },
      {
        amount: 80000,
        method: "kaspi",
        details: "+7 702 444 55 66",
        status: "completed",
        daysAgo: 6,
      },
      {
        amount: 50000,
        method: "kaspi",
        details: "+7 702 444 55 66",
        status: "processing",
        daysAgo: 0,
      },
    ],
  },
  {
    email: "zhanna.kz@test.kz",
    name: "Жанна Сулейменова",
    phone: "+77086667788",
    totalEarned: 75000,
    withdrawals: [
      {
        amount: 8000,
        method: "kaspi",
        details: "+7 708 666 77 88",
        status: "completed",
        daysAgo: 20,
      },
      {
        amount: 12000,
        method: "halyk",
        details: "4400 **** **** 1122",
        status: "failed",
        daysAgo: 9,
        failReason: "Карта заблокирована получателем",
      },
      {
        amount: 12000,
        method: "kaspi",
        details: "+7 708 666 77 88",
        status: "completed",
        daysAgo: 8,
      },
    ],
  },
  {
    email: "timur.content@test.kz",
    name: "Тимур Бекмагамбетов",
    phone: "+77013334455",
    totalEarned: 560000,
    withdrawals: [
      {
        amount: 150000,
        method: "kaspi",
        details: "+7 701 333 44 55",
        status: "completed",
        daysAgo: 35,
      },
      {
        amount: 120000,
        method: "halyk",
        details: "4405 **** **** 8877",
        status: "completed",
        daysAgo: 22,
      },
      {
        amount: 90000,
        method: "kaspi",
        details: "+7 701 333 44 55",
        status: "completed",
        daysAgo: 8,
      },
      {
        amount: 70000,
        method: "card",
        details: "4111 **** **** 9012",
        status: "failed",
        daysAgo: 2,
        failReason: "Превышен дневной лимит переводов",
      },
    ],
  },
  {
    email: "assel.beauty@test.kz",
    name: "Асель Нурпеисова",
    phone: "+77057778899",
    totalEarned: 130000,
    withdrawals: [
      {
        amount: 25000,
        method: "kaspi",
        details: "+7 705 777 88 99",
        status: "completed",
        daysAgo: 12,
      },
      {
        amount: 20000,
        method: "kaspi",
        details: "+7 705 777 88 99",
        status: "processing",
        daysAgo: 0,
      },
    ],
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function daysAgoDate(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(Math.floor(Math.random() * 14) + 8);
  d.setMinutes(Math.floor(Math.random() * 60));
  return d;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("💸 Seeding withdrawal requests (auto-processing flow)...\n");

  const password =
    "$2a$12$LKEqRnmmAYz7O2xNOlSYhOWnQz3rFbPVNR7rJ0ZQBN2LAzZkK5Z.i"; // "password123"

  for (const entry of SEED_DATA) {
    // 1. Найти или создать юзера
    let user = await prisma.user.findUnique({ where: { email: entry.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: entry.email,
          name: entry.name,
          phone: entry.phone,
          password,
          emailVerified: true,
        },
      });
      console.log(`  + Created user: ${entry.name} (${entry.email})`);
    } else {
      if (!user.phone && entry.phone) {
        await prisma.user.update({
          where: { id: user.id },
          data: { phone: entry.phone },
        });
      }
      console.log(`  ~ User exists: ${entry.name}`);
    }

    // 2. Подсчитать баланс
    const completedAmount = entry.withdrawals
      .filter((w) => w.status === "completed")
      .reduce((s, w) => s + w.amount, 0);

    // processing — деньги списаны, перевод в пути
    const processingAmount = entry.withdrawals
      .filter((w) => w.status === "processing")
      .reduce((s, w) => s + w.amount, 0);

    // failed — деньги возвращены на баланс автоматически
    // (не влияет на текущий баланс, т.к. refund уже зачислен)

    const currentBalance =
      entry.totalEarned - completedAmount - processingAmount;

    let balance = await prisma.creatorBalance.findUnique({
      where: { userId: user.id },
    });
    if (!balance) {
      balance = await prisma.creatorBalance.create({
        data: {
          userId: user.id,
          balance: currentBalance,
          totalEarned: entry.totalEarned,
          totalWithdrawn: completedAmount,
          totalTopUp: 0,
          totalSpent: 0,
        },
      });
      console.log(
        `  + Balance: ${currentBalance.toLocaleString("ru")} ₸ (earned: ${entry.totalEarned.toLocaleString("ru")} ₸)`,
      );
    } else {
      await prisma.creatorBalance.update({
        where: { id: balance.id },
        data: {
          balance: currentBalance,
          totalEarned: entry.totalEarned,
          totalWithdrawn: completedAmount,
        },
      });
      console.log(
        `  ~ Updated balance: ${currentBalance.toLocaleString("ru")} ₸`,
      );
    }

    // 3. Очистить старые данные (идемпотентность)
    await prisma.balanceTransaction.deleteMany({
      where: {
        balanceId: balance.id,
        type: { in: ["withdrawal", "earning", "refund"] },
      },
    });
    await prisma.withdrawalRequest.deleteMany({
      where: { userId: user.id },
    });

    // 4. Транзакция earning
    await prisma.balanceTransaction.create({
      data: {
        balanceId: balance.id,
        type: "earning",
        amount: entry.totalEarned,
        description: "Заработок за выполненные задания",
        createdAt: daysAgoDate(45),
      },
    });

    // 5. Withdrawal requests + транзакции
    for (const w of entry.withdrawals) {
      const createdAt = daysAgoDate(w.daysAgo);

      // Авто-обработка: completed/failed обрабатываются за минуты-часы, не дни
      const processedAt =
        w.status === "completed" || w.status === "failed"
          ? new Date(
              createdAt.getTime() +
                (5 + Math.random() * 55) * 60 * 1000, // 5-60 минут
            )
          : null;

      const methodLabel =
        w.method === "kaspi"
          ? "Kaspi"
          : w.method === "halyk"
            ? "Halyk"
            : "Карта";

      const withdrawal = await prisma.withdrawalRequest.create({
        data: {
          balanceId: balance.id,
          userId: user.id,
          amount: w.amount,
          method: w.method,
          details: w.details,
          status: w.status,
          createdAt,
          processedAt,
        },
      });

      // Транзакция списания
      await prisma.balanceTransaction.create({
        data: {
          balanceId: balance.id,
          type: "withdrawal",
          amount: -w.amount,
          description: `Вывод ${w.amount.toLocaleString("ru")} ₸ → ${methodLabel} (${w.details})`,
          withdrawalId: withdrawal.id,
          createdAt,
        },
      });

      // Если failed — автоматический refund от провайдера
      if (w.status === "failed" && processedAt) {
        await prisma.balanceTransaction.create({
          data: {
            balanceId: balance.id,
            type: "refund",
            amount: w.amount,
            description: `Возврат: ${w.failReason ?? "ошибка провайдера"} (${w.details})`,
            withdrawalId: withdrawal.id,
            createdAt: processedAt,
          },
        });
      }

      const icon = {
        pending: "  ",
        processing: "->",
        completed: "OK",
        failed: "XX",
      }[w.status];

      console.log(
        `    [${icon}] ${w.amount.toLocaleString("ru")} ₸ → ${methodLabel} ${w.details} ${w.status === "failed" ? `(${w.failReason})` : ""}`,
      );
    }

    console.log("");
  }

  // ─── Статистика ───────────────────────────────────────────────────────────
  const total = await prisma.withdrawalRequest.count();
  const pending = await prisma.withdrawalRequest.count({
    where: { status: "pending" },
  });
  const processing = await prisma.withdrawalRequest.count({
    where: { status: "processing" },
  });
  const completed = await prisma.withdrawalRequest.count({
    where: { status: "completed" },
  });
  const failed = await prisma.withdrawalRequest.count({
    where: { status: "failed" },
  });

  console.log("--- Итого ---");
  console.log(`  Всего:         ${total}`);
  console.log(`  В очереди:     ${pending}`);
  console.log(`  В обработке:   ${processing}`);
  console.log(`  Завершены:     ${completed}`);
  console.log(`  Ошибки:        ${failed}`);
  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
