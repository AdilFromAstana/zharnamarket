/**
 * Seed-скрипт: заполняет БД демо-данными из mock-файлов.
 * Запуск: npx tsx prisma/seed.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

// Маппинг русских значений → Prisma enum-ключи
const CITY_MAP: Record<string, string> = {
  Алматы: "Almaty",
  Астана: "Astana",
  Шымкент: "Shymkent",
  "Все города": "AllCities",
};
const CAT_MAP: Record<string, string> = {
  "Кино-нарезки": "KinoNarezki",
  Мемы: "Memy",
  Обзоры: "Obzory",
  Подкасты: "Podkasty",
  Геймплей: "Geympley",
  "Музыка/Атмосфера": "MuzykaAtmosfera",
  Авто: "Avto",
  Красота: "Krasota",
  Спорт: "Sport",
  Мультфильмы: "Multfilmy",
};

// ─── Начальные данные справочников категорий ─────────────────────────────────
const VIDEO_FORMAT_SEED = [
  { key: "FilmClips", label: "Нарезки из фильмов", description: "Короткие клипы из фильмов, сериалов, трейлеров — поверх которых идёт реклама", icon: null, sortOrder: 1 },
  { key: "PodcastClips", label: "Нарезки из подкастов", description: "Вырезанные фрагменты из подкаст-разговоров с субтитрами", icon: null, sortOrder: 2 },
  { key: "Memes", label: "Мемы / Приколы", description: "Юмористические видео, мемные ситуации, скетчи, вирусные тренды", icon: null, sortOrder: 3 },
  { key: "Blog", label: "Блог / Влог", description: "Личный дневник, day-in-the-life, рутина — неформальная съёмка из жизни", icon: null, sortOrder: 4 },
  { key: "Reviews", label: "Обзоры", description: "Общие обзоры на место, ресторан, фильм, технику", icon: null, sortOrder: 5 },
  { key: "StreamClips", label: "Нарезки со стримов", description: "Клипы из живых трансляций (Twitch, YouTube Live, Kick)", icon: null, sortOrder: 6 },
  { key: "Gameplay", label: "Геймплей", description: "Игровой контент — прохождения, нарезки из игр, гейм-обзоры", icon: null, sortOrder: 7 },
  { key: "StoryBackground", label: "История + фоновая активность", description: "Рассказ голосом/текстом, на фоне уборка/готовка/рисование/ASMR", icon: null, sortOrder: 8 },
  { key: "ProductReview", label: "Обзор товара (с хуком)", description: "Unboxing, демонстрация, тест товара — с зацепкой в начале", icon: null, sortOrder: 9 },
  { key: "TalkingHead", label: "Говорящая голова", description: "Человек говорит прямо в камеру — отзыв, рекомендация, монолог", icon: null, sortOrder: 10 },
  { key: "Tutorial", label: "Гайд / Обучение", description: "Пошаговая инструкция, лайфхак, how-to контент", icon: null, sortOrder: 11 },
  { key: "Animation", label: "Анимация / Мультфильмы", description: "Полностью анимированный контент, motion graphics, объяснительные ролики", icon: null, sortOrder: 12 },
];

const AD_FORMAT_SEED = [
  { key: "Hook", label: "Хук (зацепка)", description: "Провокационная фраза в первые 3-6 секунд, плавно переходящая в рекламу", icon: null, sortOrder: 1 },
  { key: "BannerOverlay", label: "Баннер на видео", description: "Статичный или анимированный баннер поверх видео — с логотипом, текстом, ценой", icon: null, sortOrder: 2 },
  { key: "Ticker", label: "Бегущая строка", description: "Скроллящийся текст вдоль верха или низа видео, как на новостных каналах", icon: null, sortOrder: 3 },
  { key: "NativeIntegration", label: "Нативная интеграция", description: "Реклама вплетена в контент органично — без явного разделения", icon: null, sortOrder: 4 },
  { key: "TextOverlay", label: "Текст на экране", description: "Рекламное сообщение через текстовые overlay, субтитры или callout-графику", icon: null, sortOrder: 5 },
  { key: "FullTakeover", label: "Полный рекламный ролик", description: "Весь ролик целиком = реклама, оформленная в стиле органического контента", icon: null, sortOrder: 6 },
];

const AD_SUBJECT_SEED = [
  { key: "PhysicalProduct", label: "Физический товар", description: "Конкретный физический продукт — электроника, еда, одежда, косметика", icon: null, sortOrder: 1 },
  { key: "Service", label: "Услуга", description: "Сервис — стоматология, юрист, клининг, ремонт, доставка, салон красоты", icon: null, sortOrder: 2 },
  { key: "Promotion", label: "Акция / Скидка", description: "Временное предложение — промокод, сезонная скидка, flash sale", icon: null, sortOrder: 3 },
  { key: "AppSoftware", label: "Приложение / ПО", description: "Мобильное приложение, SaaS платформа, софт", icon: null, sortOrder: 4 },
  { key: "Course", label: "Курс / Обучение", description: "Онлайн-курс, вебинар, коучинг, информационный продукт", icon: null, sortOrder: 5 },
  { key: "Event", label: "Мероприятие", description: "Концерт, конференция, фестиваль, вечеринка", icon: null, sortOrder: 6 },
  { key: "Restaurant", label: "Ресторан / Еда", description: "Заведение, доставка еды, новое меню", icon: null, sortOrder: 7 },
  { key: "BrandAwareness", label: "Бренд / Узнаваемость", description: "Продвижение бренда в целом — awareness, имидж, позиционирование", icon: null, sortOrder: 8 },
];

async function main() {
  console.log("🌱 Seeding database...");

  // ─── Справочники категорий ─────────────────────────────────────────────────
  console.log("\n📂 Seeding category dimensions...");

  // Seed Categories
  const categorySeeds = [
    { key: "KinoNarezki", label: "Кино-нарезки", sortOrder: 1 },
    { key: "Memy", label: "Мемы", sortOrder: 2 },
    { key: "Obzory", label: "Обзоры", sortOrder: 3 },
    { key: "Podkasty", label: "Подкасты", sortOrder: 4 },
    { key: "Geympley", label: "Геймплей", sortOrder: 5 },
    { key: "MuzykaAtmosfera", label: "Музыка/Атмосфера", sortOrder: 6 },
    { key: "Avto", label: "Авто", sortOrder: 7 },
    { key: "Krasota", label: "Красота", sortOrder: 8 },
    { key: "Sport", label: "Спорт", sortOrder: 9 },
    { key: "Multfilmy", label: "Мультфильмы", sortOrder: 10 },
  ];

  for (const cat of categorySeeds) {
    await prisma.category.upsert({
      where: { key: cat.key },
      update: { label: cat.label, sortOrder: cat.sortOrder },
      create: cat,
    });
  }
  console.log(`  ✓ Categories: ${categorySeeds.length} records`);

  // Seed Cities
  const citySeeds = [
    { key: "Almaty", label: "Алматы", sortOrder: 1 },
    { key: "Astana", label: "Астана", sortOrder: 2 },
    { key: "Shymkent", label: "Шымкент", sortOrder: 3 },
    { key: "Karaganda", label: "Караганда", sortOrder: 4 },
    { key: "Aktau", label: "Актау", sortOrder: 5 },
    { key: "Pavlodar", label: "Павлодар", sortOrder: 6 },
    { key: "AllCities", label: "Все города", sortOrder: 7 },
  ];

  for (const city of citySeeds) {
    await prisma.city.upsert({
      where: { key: city.key },
      update: { label: city.label, sortOrder: city.sortOrder },
      create: city,
    });
  }
  console.log(`  ✓ Cities: ${citySeeds.length} records`);

  // Seed Platforms
  const platformSeeds = [
    { key: "TikTok", label: "TikTok", sortOrder: 1 },
    { key: "Instagram", label: "Instagram", sortOrder: 2 },
    { key: "YouTube", label: "YouTube", sortOrder: 3 },
  ];
  for (const p of platformSeeds) {
    await prisma.platformRef.upsert({
      where: { key: p.key },
      update: { label: p.label, sortOrder: p.sortOrder },
      create: { ...p, iconUrl: null },
    });
  }
  console.log(`  ✓ Platforms: ${platformSeeds.length} records`);

  // Seed BudgetTypes
  const budgetTypeSeeds = [
    { key: "fixed", label: "Фиксированная цена", sortOrder: 1 },
    { key: "per_views", label: "За просмотры", sortOrder: 2 },
    { key: "revenue", label: "Доход", sortOrder: 3 },
    { key: "negotiable", label: "Договорная", sortOrder: 4 },
  ];
  for (const b of budgetTypeSeeds) {
    await prisma.budgetTypeRef.upsert({
      where: { key: b.key },
      update: { label: b.label, sortOrder: b.sortOrder },
      create: b,
    });
  }
  console.log(`  ✓ BudgetTypes: ${budgetTypeSeeds.length} records`);

  // Seed BusinessCategories
  const businessCategorySeeds = [
    { key: "EdaNapitki", label: "Еда и напитки", sortOrder: 1 },
    { key: "Retail", label: "Ретейл", sortOrder: 2 },
    { key: "Uslugi", label: "Услуги", sortOrder: 3 },
    { key: "IT", label: "IT", sortOrder: 4 },
    { key: "KrasotaZdorovie", label: "Красота и здоровье", sortOrder: 5 },
    { key: "SportFitnes", label: "Спорт и фитнес", sortOrder: 6 },
    { key: "Avto", label: "Авто", sortOrder: 7 },
    { key: "Nedvizhimost", label: "Недвижимость", sortOrder: 8 },
    { key: "Drugoe", label: "Другое", sortOrder: 9 },
  ];
  for (const bc of businessCategorySeeds) {
    await prisma.businessCategory.upsert({
      where: { key: bc.key },
      update: { label: bc.label, sortOrder: bc.sortOrder },
      create: bc,
    });
  }
  console.log(`  ✓ BusinessCategories: ${businessCategorySeeds.length} records`);

  for (const vf of VIDEO_FORMAT_SEED) {
    await prisma.videoFormat.upsert({
      where: { key: vf.key },
      update: { label: vf.label, description: vf.description, icon: vf.icon, sortOrder: vf.sortOrder },
      create: vf,
    });
  }
  console.log(`  ✓ VideoFormats: ${VIDEO_FORMAT_SEED.length} records`);

  for (const af of AD_FORMAT_SEED) {
    await prisma.adFormat.upsert({
      where: { key: af.key },
      update: { label: af.label, description: af.description, icon: af.icon, sortOrder: af.sortOrder },
      create: af,
    });
  }
  console.log(`  ✓ AdFormats: ${AD_FORMAT_SEED.length} records`);

  for (const as_ of AD_SUBJECT_SEED) {
    await prisma.adSubject.upsert({
      where: { key: as_.key },
      update: { label: as_.label, description: as_.description, icon: as_.icon, sortOrder: as_.sortOrder },
      create: as_,
    });
  }
  console.log(`  ✓ AdSubjects: ${AD_SUBJECT_SEED.length} records`);

  // ─── Администратор ────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash("Admin123!", 12);
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@viraladds.kz" },
    update: { role: "admin", emailVerified: true },
    create: {
      email: "admin@viraladds.kz",
      name: "Admin",
      password: adminPassword,
      role: "admin",
      emailVerified: true,
    },
  });
  console.log(`  ✓ Admin: ${adminUser.email} (role: admin)`);

  // ─── Пользователи ──────────────────────────────────────────────────────────
  const password = await bcrypt.hash("password123", 12);

  const users: Array<{ key: string; email: string; name: string }> = [
    // Старые пользователи (бизнес)
    { key: "user-business-1", email: "zara@test.kz", name: "Zara KZ" },
    { key: "user-business-2", email: "coffee@test.kz", name: "Coffee Almaty" },
    { key: "user-business-3", email: "auto@test.kz", name: "AutoService Nur" },
    { key: "user-business-4", email: "it@test.kz", name: "IT Startup KZ" },
    {
      key: "user-business-5",
      email: "game@test.kz",
      name: "Game Cafe Shymkent",
    },
    // Креаторы
    {
      key: "user-creator-1",
      email: "daniyar@test.kz",
      name: "Данияр Сейткали",
    },
    {
      key: "user-creator-2",
      email: "aigeriim@test.kz",
      name: "Айгерим Нурланова",
    },
    { key: "user-creator-3", email: "marat@test.kz", name: "Марат Джумабеков" },
    // Новые заказчики (оплата за просмотры)
    {
      key: "user-views-1",
      email: "glamourstyle@test.kz",
      name: "GlamourStyle KZ",
    },
    { key: "user-views-2", email: "damdikafe@test.kz", name: "Damdi Kafe" },
    {
      key: "user-views-3",
      email: "cleanmaster@test.kz",
      name: "CleanMaster Almaty",
    },
    {
      key: "user-views-4",
      email: "speakenglish@test.kz",
      name: "SpeakEnglish Academy",
    },
    { key: "user-views-5", email: "parhouse@test.kz", name: "ParHouse Sauna" },
  ];

  const userMap: Record<string, string> = {};

  for (const u of users) {
    const existing = await prisma.user.findUnique({
      where: { email: u.email },
    });
    if (!existing) {
      const created = await prisma.user.create({
        data: {
          email: u.email,
          name: u.name,
          password,
          phone: null,
        },
      });
      userMap[u.key] = created.id;
      console.log(`  ✓ User: ${u.name}`);
    } else {
      userMap[u.key] = existing.id;
      console.log(`  ~ User already exists: ${u.name}`);
    }
  }

  // ─── Объявления ────────────────────────────────────────────────────────────
  const mockAds = [
    {
      ownerKey: "user-business-1",
      companyName: "Zara KZ",
      title: "Нужны TikTok-видео обзоры одежды",
      description:
        "Ищем креаторов для создания коротких видео-обзоров нашей коллекции. Нужен живой и честный контент.",
      platform: "TikTok",
      city: "Алматы",
      category: "Обзоры",
      budgetType: "fixed",
      budgetFrom: 30000,
      budgetTo: 50000,
      contactTelegram: "@zara_kz_marketing",
      contactWhatsapp: "+77011234567",
    },
    {
      ownerKey: "user-business-2",
      companyName: "Coffee Almaty",
      title: "Reels для кофейни в центре Алматы",
      description:
        "Нужен автор атмосферных Reels для нашей кофейни. Снимаем уютные ролики с кофе и завтраками.",
      platform: "Instagram",
      city: "Алматы",
      category: "Музыка/Атмосфера",
      budgetType: "fixed",
      budgetFrom: 15000,
      budgetTo: 15000,
      contactTelegram: "@coffee_almaty_collab",
      contactWhatsapp: null,
    },
    {
      ownerKey: "user-business-3",
      companyName: "AutoService Nur",
      title: "YouTube Shorts для автосервиса",
      description:
        "Ищем автора для YouTube Shorts про автотематику. Показываем процесс диагностики и советы автовладельцам.",
      platform: "YouTube",
      city: "Астана",
      category: "Авто",
      budgetType: "negotiable",
      budgetFrom: 20000,
      budgetTo: null,
      budgetDetails: "Договорная (ориентир 20 000 ₸)",
      contactTelegram: "@autoservice_nur",
      contactWhatsapp: "+77019876543",
    },
    {
      ownerKey: "user-business-4",
      companyName: "IT Startup KZ",
      title: "Мемы и контент для IT-продукта",
      description:
        "Стартап ищет автора мемного контента для продвижения в TikTok. Нужен юмор и актуальные тренды.",
      platform: "TikTok",
      city: "Алматы",
      category: "Мемы",
      budgetType: "fixed",
      budgetFrom: 25000,
      budgetTo: 25000,
      budgetDetails: "в месяц",
      contactTelegram: "@it_startup_kz",
      contactWhatsapp: null,
    },
    {
      ownerKey: "user-business-5",
      companyName: "Game Cafe Shymkent",
      title: "Геймплей-контент для игрового кафе",
      description:
        "Геймерское кафе ищет стримера для Shorts-контента. Показываем атмосферу, турниры и популярные игры.",
      platform: "YouTube",
      city: "Шымкент",
      category: "Геймплей",
      budgetType: "fixed",
      budgetFrom: 10000,
      budgetTo: 10000,
      budgetDetails: "за серию роликов",
      contactTelegram: "@game_cafe_shymkent",
      contactWhatsapp: "+77712345678",
    },
  ];

  for (const ad of mockAds) {
    const ownerId = userMap[ad.ownerKey];
    if (!ownerId) continue;

    const existing = await prisma.ad.findFirst({
      where: { ownerId, title: ad.title },
    });
    if (!existing) {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Look up city and category IDs
      const cityKey = CITY_MAP[ad.city] ?? ad.city;
      const categoryKey = CAT_MAP[ad.category] ?? ad.category;

      const cityRecord = await prisma.city.findUnique({ where: { key: cityKey } });
      const categoryRecord = await prisma.category.findUnique({ where: { key: categoryKey } });

      await prisma.ad.create({
        data: {
          ownerId,
          companyName: ad.companyName,
          title: ad.title,
          description: ad.description,
          platform: ad.platform as any,
          cityId: cityRecord?.id,
          categoryId: categoryRecord?.id,
          budgetType: ad.budgetType as any,
          budgetFrom: ad.budgetFrom ?? null,
          budgetTo: ad.budgetTo ?? null,
          budgetDetails: (ad as any).budgetDetails ?? null,
          contactTelegram: ad.contactTelegram,
          contactWhatsapp: ad.contactWhatsapp ?? null,
          images: [],
          status: "active",
          publishedAt: now,
          expiresAt,
        },
      });
      console.log(`  ✓ Ad: ${ad.title}`);
    } else {
      console.log(`  ~ Ad already exists: ${ad.title}`);
    }
  }

  // ─── Объявления с оплатой за просмотры (per_views) ─────────────────────────
  const mockViewAds = [
    {
      ownerKey: "user-views-1",
      companyName: "GlamourStyle KZ",
      title: "Развлекательное видео с промокодом — женская одежда GlamourStyle",
      description: `<h2><strong>GlamourStyle KZ — трендовая женская одежда с доставкой по всему Казахстану</strong></h2><p>Ищем креатора для создания развлекательного TikTok-видео, в котором органично упоминается наш бренд.</p><h2><strong>Требования к видео:</strong></h2><ul><li><p>Формат: вертикальное видео <strong>15–60 секунд</strong>, развлекательный или юмористический контент (скетч, лайфхак, тренд, сторителлинг).</p></li><li><p>В видео должна появляться бегущая строка или всплывающая плашка через 5–10 секунд: <strong>«Промокод GLAM15 — скидка 15% на всё в @glamourstyle.kz»</strong>.</p></li><li><p>Промокод: <strong>GLAM15</strong> (даёт скидку 15% на первый заказ на нашем сайте).</p></li><li><p>Видео должно быть нативным и <strong>не выглядеть как прямая реклама</strong>. Главное — развлечь зрителя, а промокод подать как приятный бонус.</p></li><li><p>Без мата, провокаций, политики.</p></li></ul><h2><strong>Оплата:</strong></h2><p>За каждые 100 000 просмотров — от <strong>3 000 до 5 000 ₸</strong> (зависит от вовлечённости и качества). Просмотры считаются по статистике TikTok через 7 дней после публикации.</p><p><strong>Это ПЛАТНОЕ объявление — размещение оплачено заказчиком.</strong></p>`,
      platform: "TikTok",
      city: "Все города",
      category: "Мемы",
      budgetType: "per_views",
      budgetFrom: 3000,
      budgetTo: 5000,
      budgetDetails:
        "3 000–5 000 ₸ за каждые 100 000 просмотров. Промокод: GLAM15",
      contactTelegram: "@glamourstyle_collab",
      contactWhatsapp: "+77051112233",
      featured: true,
    },
    {
      ownerKey: "user-views-2",
      companyName: "Damdi Kafe",
      title: "Весёлое видео с промокодом — кафе Damdi в Алматы",
      description: `<h2><strong>Damdi Kafe — семейное кафе казахской и европейской кухни в центре Алматы</strong></h2><p>Мы готовим настоящие домашние блюда: бешбармак, лагман, стейки и десерты ручной работы. Адрес: ул. Абая, 52.</p><h2><strong>Требования к видео:</strong></h2><ul><li><p>Формат: Instagram Reels или TikTok, <strong>20–60 секунд</strong>. Жанр — развлекательный: скетч, челлендж «угадай блюдо», ASMR-еда, юмор или мини-сториз.</p></li><li><p>Бегущая строка / плашка ближе к середине или концу видео: <strong>«Промокод DAMDI20 — скидка 20% на любой заказ в Damdi Kafe»</strong>.</p></li><li><p>Промокод: <strong>DAMDI20</strong> (скидка 20% при заказе от 3 000 ₸, действует 30 дней).</p></li><li><p>Видео должно вызывать аппетит и позитивные эмоции. <strong>Не нужно делать рекламный обзор</strong> — нужен живой, вирусный контент.</p></li><li><p>Желательно показать интерьер или блюда (можем предоставить <strong>бесплатный обед</strong> для съёмки).</p></li></ul><h2><strong>Оплата:</strong></h2><p>От <strong>3 500 до 5 500 ₸</strong> за каждые 100 000 просмотров. Статистика проверяется через 7 дней.</p><p><strong>Это ПЛАТНОЕ объявление — размещение оплачено заказчиком.</strong></p>`,
      platform: "Instagram",
      city: "Алматы",
      category: "Музыка/Атмосфера",
      budgetType: "per_views",
      budgetFrom: 3500,
      budgetTo: 5500,
      budgetDetails:
        "3 500–5 500 ₸ за каждые 100 000 просмотров. Промокод: DAMDI20. Бесплатный обед для съёмки.",
      contactTelegram: "@damdi_kafe_pr",
      contactWhatsapp: "+77073334455",
      featured: true,
    },
    {
      ownerKey: "user-views-3",
      companyName: "CleanMaster Almaty",
      title: "Смешное видео с промокодом — клининг CleanMaster",
      description: `CleanMaster — профессиональный клининг-сервис в Алматы и Астане. Генеральная уборка квартир, химчистка мебели, мойка окон, уборка после ремонта. Работаем быстро, чисто и с гарантией.

📌 Требования к видео:
• Формат: TikTok или YouTube Shorts, 15–45 секунд. Развлекательный жанр: юмористический скетч «до и после уборки», мем-формат про грязную квартиру, трансформация комнаты за 30 секунд, или лайфхак по уборке с неожиданным финалом.
• Бегущая строка / текст на экране (появляется через 8–12 секунд): «Промокод CLEAN10 — скидка 10% на первую уборку в CleanMaster 🧹 cleanmaster.kz».
• Промокод: CLEAN10 (скидка 10% на любую услугу для новых клиентов).
• Видео должно быть смешным и залипательным. Формат «satisfying cleaning» тоже приветствуется. Главное — чтобы хотелось досмотреть и поделиться.
• Без демонстрации конкурентов, без негатива.

💰 Оплата: от 3 000 до 4 500 ₸ за каждые 100 000 просмотров. Статистика фиксируется на 7-й день после публикации.`,
      platform: "TikTok",
      city: "Все города",
      category: "Обзоры",
      budgetType: "per_views",
      budgetFrom: 3000,
      budgetTo: 4500,
      budgetDetails:
        "3 000–4 500 ₸ за каждые 100 000 просмотров. Промокод: CLEAN10",
      contactTelegram: "@cleanmaster_alm",
      contactWhatsapp: "+77019998877",
      featured: false,
    },
    {
      ownerKey: "user-views-4",
      companyName: "SpeakEnglish Academy",
      title:
        "Развлекательный ролик с промокодом — курсы английского SpeakEnglish",
      description: `SpeakEnglish Academy — онлайн-школа английского языка для казахстанцев. Обучаем с нуля до свободного разговорного за 4 месяца. Занятия в мини-группах и индивидуально, с носителями и казахстанскими преподавателями.

📌 Требования к видео:
• Формат: TikTok / Instagram Reels, 20–60 секунд. Жанр — юмор и развлечение: скетч «казах пытается говорить по-английски», мем про ошибки в английском, забавная ситуация с иностранцем, челлендж «переведи фразу» или любой тренд с обучающим/развлекательным уклоном.
• Бегущая строка или текстовая плашка (всплывает внизу через 7–15 секунд): «Промокод SPEAK25 — скидка 25% на первый месяц в SpeakEnglish Academy 🎓 speakenglish.kz».
• Промокод: SPEAK25 (даёт скидку 25% на первый месяц обучения, любой формат).
• Видео должно быть жизненным и смешным — аудитория 18–35 лет, которая хочет подтянуть английский, но пока стесняется или откладывает. Мотивируйте через юмор!
• Допускается казахский и русский язык в видео.

💰 Оплата: от 4 000 до 6 000 ₸ за каждые 100 000 просмотров. Оплата производится после верификации статистики на 7-й день.`,
      platform: "TikTok",
      city: "Все города",
      category: "Подкасты",
      budgetType: "per_views",
      budgetFrom: 4000,
      budgetTo: 6000,
      budgetDetails:
        "4 000–6 000 ₸ за каждые 100 000 просмотров. Промокод: SPEAK25",
      contactTelegram: "@speakenglish_kz",
      contactWhatsapp: "+77082223344",
      featured: false,
    },
    {
      ownerKey: "user-views-5",
      companyName: "ParHouse Sauna & SPA",
      title: "Вирусное видео с промокодом — сауна ParHouse в Астане",
      description: `ParHouse — премиальная сауна и SPA-комплекс в Астане. У нас: финская сауна, хаммам, русская баня на дровах, бассейн, комнаты отдыха с караоке и банкетный зал. Идеальное место для отдыха компанией, дня рождения или корпоратива.

📌 Требования к видео:
• Формат: TikTok или YouTube Shorts, 20–60 секунд. Жанр — развлекательный: юмор про «пацаны в бане», скетч «ожидание vs реальность в сауне», мем-формат про отдых, трансформация «уставший → отдохнувший» или вайб-видео с паром, бассейном, атмосферой.
• Бегущая строка / текстовая плашка (появляется снизу экрана ближе к середине ролика): «Промокод PARHOUSE15 — скидка 15% на аренду сауны в ParHouse 🧖‍♂️ parhouse.kz».
• Промокод: PARHOUSE15 (скидка 15% на бронирование сауны в будние дни).
• Видео должно передавать атмосферу и кайф от отдыха. Можем предоставить бесплатное посещение для съёмки (до 3 часов).
• Без алкоголя в кадре, без обнажения, контент должен подходить для всех возрастов.

💰 Оплата: от 3 500 до 5 000 ₸ за каждые 100 000 просмотров. Просмотры фиксируются через 7 дней после публикации.

Это ПЛАТНОЕ объявление — размещение оплачено заказчиком.`,
      platform: "TikTok",
      city: "Астана",
      category: "Музыка/Атмосфера",
      budgetType: "per_views",
      budgetFrom: 3500,
      budgetTo: 5000,
      budgetDetails:
        "3 500–5 000 ₸ за каждые 100 000 просмотров. Промокод: PARHOUSE15. Бесплатное посещение для съёмки.",
      contactTelegram: "@parhouse_astana",
      contactWhatsapp: "+77015556677",
      featured: true,
    },
  ];

  for (const ad of mockViewAds) {
    const ownerId = userMap[ad.ownerKey];
    if (!ownerId) continue;

    const existing = await prisma.ad.findFirst({
      where: { ownerId, title: ad.title },
    });
    if (!existing) {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 дней

      // Look up city and category IDs
      const cityKey = CITY_MAP[ad.city] ?? ad.city;
      const categoryKey = CAT_MAP[ad.category] ?? ad.category;

      const cityRecord = await prisma.city.findUnique({ where: { key: cityKey } });
      const categoryRecord = await prisma.category.findUnique({ where: { key: categoryKey } });

      await prisma.ad.create({
        data: {
          ownerId,
          companyName: ad.companyName,
          title: ad.title,
          description: ad.description,
          platform: ad.platform as any,
          cityId: cityRecord?.id,
          categoryId: categoryRecord?.id,
          budgetType: ad.budgetType as any,
          budgetFrom: ad.budgetFrom ?? null,
          budgetTo: ad.budgetTo ?? null,
          budgetDetails: ad.budgetDetails ?? null,
          contactTelegram: ad.contactTelegram,
          contactWhatsapp: ad.contactWhatsapp ?? null,
          images: [],
          status: "active",
          featured: ad.featured,
          publishedAt: now,
          expiresAt,
        },
      });
      console.log(`  ✓ Ad (per_views): ${ad.title}`);
    } else {
      console.log(`  ~ Ad (per_views) already exists: ${ad.title}`);
    }
  }

  // ─── Профили креаторов ─────────────────────────────────────────────────────
  const mockCreators = [
    {
      userKey: "user-creator-1",
      title: "Мастер нарезок и мемов",
      fullName: "Данияр Сейткали",
      city: "Алматы",
      bio: "Создаю вирусные мемы и нарезки для TikTok. Специализируюсь на локальном Казахстанском контенте.",
      categories: ["Мемы", "Кино-нарезки"],
      platforms: [
        {
          name: "TikTok",
          handle: "@daniyar_viral",
          url: "https://tiktok.com/@daniyar_viral",
          followers: 125000,
        },
        {
          name: "Instagram",
          handle: "@daniyar_viral",
          url: "https://instagram.com/daniyar_viral",
          followers: 18000,
        },
      ],
      minimumRate: 10000,
      isPublished: true,
      priceItems: [
        { label: "TikTok-ролик (до 1 мин)", price: 10000, sortOrder: 0 },
        { label: "Instagram Reels", price: 12000, sortOrder: 1 },
        { label: "Серия из 3 видео", price: 25000, sortOrder: 2 },
      ],
    },
    {
      userKey: "user-creator-2",
      title: "Beauty и lifestyle контент",
      fullName: "Айгерим Нурланова",
      city: "Астана",
      bio: "Lifestyle и beauty контент. Помогаю брендам рассказывать их истории через красивый визуал.",
      categories: ["Красота", "Музыка/Атмосфера"],
      platforms: [
        {
          name: "Instagram",
          handle: "@aigeriim_reels",
          url: "https://instagram.com/aigeriim_reels",
          followers: 85000,
        },
        {
          name: "TikTok",
          handle: "@aigeriim_tiktok",
          url: "https://tiktok.com/@aigeriim_tiktok",
          followers: 42000,
        },
      ],
      minimumRate: 25000,
      isPublished: true,
      priceItems: [
        { label: "Instagram Reels (до 30 сек)", price: 25000, sortOrder: 0 },
        { label: "Instagram Reels (до 60 сек)", price: 35000, sortOrder: 1 },
        { label: "TikTok-ролик", price: 28000, sortOrder: 2 },
        { label: "Подборка сторис (5 шт)", price: 15000, sortOrder: 3 },
      ],
    },
    {
      userKey: "user-creator-3",
      title: "Авто-обзоры и тест-драйвы",
      fullName: "Марат Джумабеков",
      city: "Алматы",
      bio: "Авто-контент, обзоры и тест-драйвы. 5 лет в теме, снимаю честно и интересно.",
      categories: ["Авто", "Обзоры"],
      platforms: [
        {
          name: "YouTube",
          handle: "@marat_auto_kz",
          url: "https://youtube.com/@marat_auto_kz",
          followers: 67000,
        },
        {
          name: "TikTok",
          handle: "@marat_auto",
          url: "https://tiktok.com/@marat_auto",
          followers: 38000,
        },
      ],
      minimumRate: 20000,
      isPublished: true,
      priceItems: [
        { label: "YouTube-интеграция (до 2 мин)", price: 20000, sortOrder: 0 },
        { label: "YouTube-обзор (полный)", price: 40000, sortOrder: 1 },
        { label: "TikTok тест-драйв", price: 22000, sortOrder: 2 },
      ],
    },
  ];

  for (const creator of mockCreators) {
    const userId = userMap[creator.userKey];
    if (!userId) continue;

    const existing = await prisma.creatorProfile.findFirst({
      where: { userId, title: creator.title },
    });
    if (!existing) {
      // Look up city ID
      const cityKey = CITY_MAP[creator.city] ?? creator.city;
      const cityRecord = await prisma.city.findUnique({ where: { key: cityKey } });

      // Look up category IDs
      const categoryIds: string[] = [];
      for (const catLabel of creator.categories) {
        const catKey = CAT_MAP[catLabel] ?? catLabel;
        const catRecord = await prisma.category.findUnique({ where: { key: catKey } });
        if (catRecord) {
          categoryIds.push(catRecord.id);
        }
      }

      await prisma.creatorProfile.create({
        data: {
          userId,
          title: creator.title,
          fullName: creator.fullName,
          cityId: cityRecord?.id,
          bio: creator.bio,
          categories: {
            connect: categoryIds.map(id => ({ id })),
          },
          minimumRate: creator.minimumRate,
          negotiable: true,
          isPublished: creator.isPublished,
          publishedAt: new Date(),
          contactTelegram: "@contact",
          contactWhatsapp: null,
          platforms: {
            create: creator.platforms.map((p) => ({
              name: p.name as any,
              handle: p.handle,
              url: p.url,
              followers: p.followers,
            })),
          },
          priceItems: {
            create: creator.priceItems.map((item) => ({
              label: item.label,
              price: item.price,
              sortOrder: item.sortOrder,
            })),
          },
        },
      });
      console.log(`  ✓ Creator: ${creator.fullName} - ${creator.title}`);
    } else {
      // Обновляем priceItems если профиль уже существует
      const existingItems = await prisma.creatorPriceItem.count({
        where: { profileId: existing.id },
      });
      if (existingItems === 0) {
        await prisma.creatorPriceItem.createMany({
          data: creator.priceItems.map((item) => ({
            profileId: existing.id,
            label: item.label,
            price: item.price,
            sortOrder: item.sortOrder,
          })),
        });
        console.log(`  ✓ Added price items to: ${creator.fullName}`);
      }
      console.log(`  ~ Creator already exists: ${creator.fullName}`);
    }
  }

  // ─── Портфолио для Марата (8 работ — видно карусель + кнопку «Подробнее») ──
  console.log("\n📂 Seeding portfolio items...");
  const maratProfile = await prisma.creatorProfile.findFirst({
    where: { fullName: "Марат Джумабеков" },
    select: { id: true },
  });
  if (maratProfile) {
    const existingCount = await prisma.portfolioItem.count({
      where: { profileId: maratProfile.id },
    });
    if (existingCount < 8) {
      // Удаляем старые и пересоздаём все 8
      await prisma.portfolioItem.deleteMany({ where: { profileId: maratProfile.id } });
      // Get category IDs for portfolio items
      const avtoCategory = await prisma.category.findUnique({ where: { key: "Avto" } });
      const obzoryCategory = await prisma.category.findUnique({ where: { key: "Obzory" } });
      const podkastyCategory = await prisma.category.findUnique({ where: { key: "Podkasty" } });

      const portfolioItems = [
        {
          platform: "YouTube" as const,
          categoryId: avtoCategory?.id,
          thumbnail: "https://picsum.photos/seed/marat1/400/711",
          videoUrl: "https://youtube.com/watch?v=example1",
          description: "Toyota Camry 75 — обзор + тест-драйв (Toyota KZ)",
          views: 210000,
        },
        {
          platform: "YouTube" as const,
          categoryId: avtoCategory?.id,
          thumbnail: "https://picsum.photos/seed/marat2/400/711",
          videoUrl: "https://youtube.com/watch?v=example2",
          description: "Shell Kazakhstan — интеграция в обзор автомоек",
          views: 95000,
        },
        {
          platform: "TikTok" as const,
          categoryId: avtoCategory?.id,
          thumbnail: "https://picsum.photos/seed/marat3/400/711",
          videoUrl: "https://tiktok.com/@marat_auto/video/example3",
          description: "Camry 100K км — хук + нарратив (Kolesa.kz)",
          views: 450000,
        },
        {
          platform: "TikTok" as const,
          categoryId: obzoryCategory?.id,
          thumbnail: "https://picsum.photos/seed/marat4/400/711",
          videoUrl: "https://tiktok.com/@marat_auto/video/example4",
          description: "Топ-5 авто до 5 млн тенге — разбор",
          views: 320000,
        },
        {
          platform: "YouTube" as const,
          categoryId: obzoryCategory?.id,
          thumbnail: "https://picsum.photos/seed/marat5/400/711",
          videoUrl: "https://youtube.com/watch?v=example5",
          description: "Честный обзор Kia K5 после 50К пробега",
          views: 180000,
        },
        {
          platform: "TikTok" as const,
          categoryId: avtoCategory?.id,
          thumbnail: "https://picsum.photos/seed/marat6/400/711",
          videoUrl: "https://tiktok.com/@marat_auto/video/example6",
          description: "BMW vs Mercedes — что берут в KZ?",
          views: 520000,
        },
        {
          platform: "YouTube" as const,
          categoryId: obzoryCategory?.id,
          thumbnail: "https://picsum.photos/seed/marat7/400/711",
          videoUrl: "https://youtube.com/watch?v=example7",
          description: "Автосервис в Алматы — скрытая камера",
          views: 140000,
        },
        {
          platform: "YouTube" as const,
          categoryId: podkastyCategory?.id,
          thumbnail: "https://picsum.photos/seed/marat8/400/711",
          videoUrl: "https://youtube.com/watch?v=example8",
          description: "Подкаст: как я стал авто-блогером в Казахстане",
          views: 67000,
        },
      ];
      await prisma.portfolioItem.createMany({
        data: portfolioItems.map((item) => ({
          profileId: maratProfile.id,
          ...item,
        })),
      });
      console.log(`  ✓ Added ${portfolioItems.length} portfolio items to Марат`);
    } else {
      console.log(`  ~ Portfolio already exists for Марат (${existingCount} items)`);
    }
  }

  // ─── Миграция: ContentCategory → VideoFormat для существующих объявлений ────
  // NOTE: Migration commented out since we're changing to new Category/City relations
  // This would need to be updated to work with the new schema
  console.log("\n🔄 Migration skipped - new schema uses Category/City relations");

  console.log("\n✅ Seed completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
