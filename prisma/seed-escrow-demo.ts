/**
 * Seed-скрипт: создаёт демо-данные для escrow-задания с одобренными видео.
 * Запуск: npx tsx prisma/seed-escrow-demo.ts
 *
 * Создаёт:
 * - Рекламодатель MoreViews
 * - Escrow-задание (RPM=50₸, бюджет 100k₸)
 * - 2 креатора + заявки + одобренные подачи (Instagram reels)
 * - EscrowAccount, CreatorBalance, BalanceTransaction
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

const PLATFORM_COMMISSION_RATE = 0.2;

async function main() {
  console.log("🌱 Seeding escrow demo data...");

  const password = await bcrypt.hash("password123", 12);

  // ─── 1. Рекламодатель MoreViews ────────────────────────────────────────────
  let advertiser = await prisma.user.findUnique({
    where: { email: "moreviews@test.kz" },
  });
  if (!advertiser) {
    advertiser = await prisma.user.create({
      data: {
        email: "moreviews@test.kz",
        name: "MoreViews",
        password,
      },
    });
    console.log("  ✓ Advertiser: MoreViews");
  } else {
    console.log("  ~ Advertiser already exists: MoreViews");
  }

  // ─── 2. Два креатора ───────────────────────────────────────────────────────
  let creator1 = await prisma.user.findUnique({
    where: { email: "aidana@test.kz" },
  });
  if (!creator1) {
    creator1 = await prisma.user.create({
      data: { email: "aidana@test.kz", name: "Айдана Бекова", password },
    });
    console.log("  ✓ Creator 1: Айдана Бекова");
  } else {
    console.log("  ~ Creator 1 already exists: Айдана Бекова");
  }

  let creator2 = await prisma.user.findUnique({
    where: { email: "nurzhan@test.kz" },
  });
  if (!creator2) {
    creator2 = await prisma.user.create({
      data: { email: "nurzhan@test.kz", name: "Нуржан Сатыбалды", password },
    });
    console.log("  ✓ Creator 2: Нуржан Сатыбалды");
  } else {
    console.log("  ~ Creator 2 already exists: Нуржан Сатыбалды");
  }

  // ─── 3. Escrow-задание ─────────────────────────────────────────────────────
  const adTitle = "Баннеры для MoreViews | Кино Юмор Подкасты";
  let ad = await prisma.ad.findFirst({
    where: { ownerId: advertiser.id, title: adTitle },
    include: { escrowAccount: true },
  });

  if (!ad) {
    const now = new Date();
    const deadline = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 дней

    ad = await prisma.ad.create({
      data: {
        ownerId: advertiser.id,
        companyName: "MoreViews",
        title: adTitle,
        description: `<h2><strong>Добро пожаловать в официальное баннерное задание MoreViews!</strong></h2><h2><strong>Что нужно сделать для получения выплаты?</strong></h2><p>Создайте и опубликуйте вертикальный ролик с баннером MoreViews на одной из поддерживаемых площадок.</p><p>Баннер должен быть виден на протяжении всего видео — без обрезки, без перекрытия элементами интерфейса. Запрещено уменьшать исходный размер баннера более чем на 10%.</p><p>Ваше видео должно представлять собой нарезку из русскоязычных фильмов или сериалов. Также принимается юмористический контент: нарезки из стендапов, развлекательных шоу и подкастов.</p><h2><strong>Основные правила:</strong></h2><ul><li><p>Принимаются только ролики с <strong>контентом на русском языке</strong>, ориентированные на <strong>русскоязычную аудиторию</strong>.</p></li><li><p>Не уменьшайте исходный размер баннера более чем <strong>на 10%</strong></p></li><li><p>Баннер должен полностью проиграться <strong>не менее 1 раза</strong></p></li><li><p>Соблюдайте <strong>требования к описанию и названию</strong> видео, указанные ниже.</p></li><li><p>Проверяются только ролики, опубликованные в <strong>TikTok, Instagram и YouTube Shorts</strong>.</p></li><li><p>Принимаются только ролики с баннерной интеграцией бренда MoreViews.</p></li><li><p>Элементы интерфейса приложения не должны перекрывать баннер.</p></li></ul><h2><strong>Требования к описанию видео:</strong></h2><ul><li><p>Для TikTok и Instagram в описании необходимо отметить аккаунт — @moreviews.kz</p></li><li><p>Для YouTube роликов в названии видео обязательно отметьте — @moreviews.marketplace (отметка должна быть кликабельной)</p></li></ul><p>Вы можете добавить свой текст в описание или название видео, но только после нашей отметки.</p><p><strong>Проверяйте, что отметки нашего аккаунта в соц. сетях кликабельны и ведут именно на наши страницы.</strong></p><h2><strong>В этом задании разрешено:</strong></h2><ul><li><p>Перезаливать одно видео несколько раз, в том числе на разные площадки — каждый ролик может быть оплачен.</p></li><li><p>Перезаливать видео других участников (учитывайте риск жалоб за нарушение авторских прав).</p></li><li><p>По желанию в описании профиля можно указать ссылку — <a target="_blank" rel="noopener noreferrer nofollow" href="https://moreviews.kz">moreviews.kz</a></p></li></ul><h2><strong>За контент с мультфильмами выплата не производится.</strong></h2><h2><strong>Ввиду большого количества роликов с низким вовлечением, мы оставляем за собой право отказать в выплате при экстремально низких показателях.</strong></h2><p><strong>Помните: оплата за 1 ролик — 1 раз.</strong></p><h2><strong>Всем удачи и больших просмотров!</strong></h2><p><strong>P.S. Обязательно читайте чат задания — там отвечаем на вопросы и даём советы для набора просмотров.</strong></p>`,
        platform: "Instagram",
        city: "AllCities",
        category: "KinoNarezki",
        budgetType: "per_views",
        budgetDetails: "50 ₸ за 1 000 просмотров",
        paymentMode: "escrow",
        rpm: 50,
        minViews: 10000,
        maxViewsPerCreator: 2000000,
        totalBudget: 100000,
        submissionDeadline: deadline,
        status: "active",
        publishedAt: now,
        images: [],
      },
      include: { escrowAccount: true },
    });
    console.log(`  ✓ Ad: ${adTitle}`);
  } else {
    console.log(`  ~ Ad already exists: ${adTitle}`);
  }

  // ─── 4. EscrowAccount ──────────────────────────────────────────────────────
  // gross выплачено: 10000 (reel1) + 5100 (reel2) = 15100
  // payout (80%):    8000 + 4080 = 12080
  // reservedAmount = 0 (уже одобрены)
  const GROSS_REEL1 = 10000;
  const GROSS_REEL2 = 5100;
  const TOTAL_GROSS = GROSS_REEL1 + GROSS_REEL2;
  const TOTAL_BUDGET = 100000;

  let escrow = await prisma.escrowAccount.findUnique({
    where: { adId: ad.id },
  });
  if (!escrow) {
    escrow = await prisma.escrowAccount.create({
      data: {
        adId: ad.id,
        initialAmount: TOTAL_BUDGET,
        spentAmount: TOTAL_GROSS,
        reservedAmount: 0,
        available: TOTAL_BUDGET - TOTAL_GROSS,
        status: "active",
      },
    });
    console.log("  ✓ EscrowAccount created");
  } else {
    console.log("  ~ EscrowAccount already exists");
  }

  // ─── 5. Подача #1 — DWbwtXekR5f (200k просмотров) ─────────────────────────
  const app1 = await prisma.taskApplication.upsert({
    where: { adId_creatorId: { adId: ad.id, creatorId: creator1.id } },
    update: {},
    create: {
      adId: ad.id,
      creatorId: creator1.id,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 дней назад
    },
  });

  const existing1 = await prisma.videoSubmission.findFirst({
    where: { applicationId: app1.id },
  });

  const APPROVED_VIEWS_1 = 200000;
  const GROSS_1 = (APPROVED_VIEWS_1 / 1000) * 50; // 10000
  const COMMISSION_1 = GROSS_1 * PLATFORM_COMMISSION_RATE; // 2000
  const PAYOUT_1 = GROSS_1 - COMMISSION_1; // 8000
  const moderated1 = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 дня назад

  if (!existing1) {
    await prisma.videoSubmission.create({
      data: {
        applicationId: app1.id,
        adId: ad.id,
        creatorId: creator1.id,
        videoUrl: "https://www.instagram.com/reels/DWbwtXekR5f/",
        screenshotUrl: "https://picsum.photos/seed/reel-dwb/400/700",
        claimedViews: 200000,
        approvedViews: APPROVED_VIEWS_1,
        grossAmount: GROSS_1,
        commissionAmount: COMMISSION_1,
        payoutAmount: PAYOUT_1,
        reservedAmount: 0,
        status: "approved",
        moderatedAt: moderated1,
        slaDeadline: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        submittedAt: new Date(Date.now() - 4.5 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 4.5 * 24 * 60 * 60 * 1000),
      },
    });
    console.log("  ✓ Submission #1: DWbwtXekR5f (200k views, 8 000₸ payout)");
  } else {
    console.log("  ~ Submission #1 already exists");
  }

  // ─── 6. Подача #2 — DWYPRo0CHJh (102k просмотров) ─────────────────────────
  const app2 = await prisma.taskApplication.upsert({
    where: { adId_creatorId: { adId: ad.id, creatorId: creator2.id } },
    update: {},
    create: {
      adId: ad.id,
      creatorId: creator2.id,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 дня назад
    },
  });

  const existing2 = await prisma.videoSubmission.findFirst({
    where: { applicationId: app2.id },
  });

  const APPROVED_VIEWS_2 = 102000;
  const GROSS_2 = (APPROVED_VIEWS_2 / 1000) * 50; // 5100
  const COMMISSION_2 = GROSS_2 * PLATFORM_COMMISSION_RATE; // 1020
  const PAYOUT_2 = GROSS_2 - COMMISSION_2; // 4080
  const moderated2 = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // 1 день назад

  if (!existing2) {
    await prisma.videoSubmission.create({
      data: {
        applicationId: app2.id,
        adId: ad.id,
        creatorId: creator2.id,
        videoUrl: "https://www.instagram.com/reels/DWYPRo0CHJh/",
        screenshotUrl: "https://picsum.photos/seed/reel-dwy/400/700",
        claimedViews: 105000,
        approvedViews: APPROVED_VIEWS_2,
        grossAmount: GROSS_2,
        commissionAmount: COMMISSION_2,
        payoutAmount: PAYOUT_2,
        reservedAmount: 0,
        status: "approved",
        moderatedAt: moderated2,
        slaDeadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        submittedAt: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000),
      },
    });
    console.log("  ✓ Submission #2: DWYPRo0CHJh (102k views, 4 080₸ payout)");
  } else {
    console.log("  ~ Submission #2 already exists");
  }

  // ─── 7. CreatorBalance + BalanceTransaction для каждого ────────────────────
  // Creator 1
  const bal1 = await prisma.creatorBalance.upsert({
    where: { userId: creator1.id },
    update: {},
    create: {
      userId: creator1.id,
      balance: PAYOUT_1,
      totalEarned: PAYOUT_1,
      totalWithdrawn: 0,
    },
  });

  const tx1Exists = await prisma.balanceTransaction.findFirst({
    where: { balanceId: bal1.id, type: "earning" },
  });
  if (!tx1Exists) {
    await prisma.balanceTransaction.create({
      data: {
        balanceId: bal1.id,
        type: "earning",
        amount: PAYOUT_1,
        description: `Задание: ${adTitle} — 200 000 просмотров`,
      },
    });
    console.log(`  ✓ BalanceTransaction for Айдана: ${PAYOUT_1}₸`);
  }

  // Creator 2
  const bal2 = await prisma.creatorBalance.upsert({
    where: { userId: creator2.id },
    update: {},
    create: {
      userId: creator2.id,
      balance: PAYOUT_2,
      totalEarned: PAYOUT_2,
      totalWithdrawn: 0,
    },
  });

  const tx2Exists = await prisma.balanceTransaction.findFirst({
    where: { balanceId: bal2.id, type: "earning" },
  });
  if (!tx2Exists) {
    await prisma.balanceTransaction.create({
      data: {
        balanceId: bal2.id,
        type: "earning",
        amount: PAYOUT_2,
        description: `Задание: ${adTitle} — 102 000 просмотров`,
      },
    });
    console.log(`  ✓ BalanceTransaction for Нуржан: ${PAYOUT_2}₸`);
  }

  // Вывести ID объявления для удобства
  console.log(`\n✅ Escrow demo seed completed!`);
  console.log(`   Ad ID: ${ad.id}`);
  console.log(`   URL: /ads/${ad.id}`);
  console.log(`\n   Credentials:`);
  console.log(`   Advertiser: moreviews@test.kz / password123`);
  console.log(`   Creator 1:  aidana@test.kz / password123`);
  console.log(`   Creator 2:  nurzhan@test.kz / password123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
