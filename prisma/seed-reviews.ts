/**
 * Seed-скрипт: добавляет отзывы для 10 креаторских профилей.
 * Запуск: npx tsx prisma/seed-reviews.ts
 *
 * Для каждого профиля:
 *  1. Создаёт reviewer-юзеров
 *  2. Создаёт ContactInteraction (для API-консистентности)
 *  3. Создаёт Review
 *  4. Пересчитывает averageRating + reviewCount
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

// ── Данные отзывов ───────────────────────────────────────────────────────────

interface ReviewSeed {
  rating: number;
  comment: string;
  reviewerName: string;
}

interface ProfileReviews {
  creatorFullName: string;
  reviews: ReviewSeed[];
}

const REVIEWS_DATA: ProfileReviews[] = [
  {
    creatorFullName: "Асыл Каирбекова",
    reviews: [
      { rating: 5, comment: "Работали с Асыл над серией GRWM для нашего бренда косметики. Результат превзошёл ожидания — охват 150K, ER 11%. Очень профессиональный подход к съёмке и монтажу.", reviewerName: "Алия Нурсеитова" },
      { rating: 5, comment: "Заказывали обзор новой линейки уходовой косметики. Асыл сделала ролик за 3 дня, качество на высоте. Подписчики реально спрашивали ссылку в комментариях — конверсия отличная.", reviewerName: "Марина Ковалёва" },
      { rating: 5, comment: "Уже третий раз работаем с Асыл. Каждый раз стабильно высокое качество и досмотры. Рекомендуем всем beauty-брендам.", reviewerName: "Динара Исмаилова" },
      { rating: 4, comment: "Хороший результат по охватам, но немного затянули со сроками. В остальном — профессионально и красиво.", reviewerName: "Томирис Ахметова" },
      { rating: 5, comment: "Лучший бьюти-блогер в Алматы для коммерческих интеграций. Делает так, что реклама не выглядит как реклама. Наши продажи выросли на 25%.", reviewerName: "Жанна Сериккызы" },
    ],
  },
  {
    creatorFullName: "Ернар Толеуов",
    reviews: [
      { rating: 5, comment: "Сняли полноценный обзор нашего автосалона с тест-драйвом трёх моделей. Ернар — настоящий профи: знает машины, умеет подать информацию интересно. Видео набрало 180K просмотров.", reviewerName: "Бауыржан Касымов" },
      { rating: 5, comment: "Заказывали YouTube Shorts для рекламы шиномонтажа. Быстро, качественно, в срок. Ернар сам предложил сценарий — получилось лучше, чем мы ожидали.", reviewerName: "Руслан Омаров" },
      { rating: 4, comment: "Хороший обзор, но хотелось бы больше динамики в монтаже. Контент информативный, аудитория целевая — наши заявки выросли.", reviewerName: "Айдос Жунусбеков" },
      { rating: 5, comment: "Работали с Ернаром дважды. Оба раза — отличный результат. Профессиональная камера, стедикам, хороший звук. Рекомендую для автобизнеса.", reviewerName: "Мурат Сагинтаев" },
      { rating: 5, comment: "Лучший автообзорщик в Казахстане. Его аудитория реально покупает машины после обзоров. Наш дилерский центр получил 40+ заявок после одного видео.", reviewerName: "Арман Байжанов" },
    ],
  },
  {
    creatorFullName: "Диана Сагынбаева",
    reviews: [
      { rating: 5, comment: "Диана сделала серию TikTok-роликов для нашего приложения. Каждый набрал от 300K просмотров. Она реально чувствует тренды и умеет адаптировать бренд под них.", reviewerName: "Канат Бектуров" },
      { rating: 5, comment: "Лучшая инвестиция в рекламу за год. Диана сделала ролик, который залетел на 1.2M просмотров. Скачивания нашего приложения выросли в 3 раза.", reviewerName: "Лаура Жумабекова" },
      { rating: 5, comment: "Работаем с Дианой на постоянной основе. Каждый месяц — 3-4 ролика. Стабильно высокие охваты, креативные идеи, всё в срок.", reviewerName: "Ержан Кенесбаев" },
      { rating: 5, comment: "Заказывали комплекс TikTok + Reels. Оба ролика залетели в рекомендации. Диана — единственный блогер, с которым мы работаем без правок.", reviewerName: "Айгерим Токтарова" },
      { rating: 5, comment: "Невероятный ER — 14% на наших роликах. Подписчики Дианы реально вовлечены. Для нашего бренда это лучший канал привлечения.", reviewerName: "Самал Нурланова" },
    ],
  },
  {
    creatorFullName: "Камила Нургалиева",
    reviews: [
      { rating: 5, comment: "Интеграция в подкаст Камилы дала нам узнаваемость в целевой аудитории. Формат нативный — слушатели восприняли рекомендацию как личный совет, а не рекламу.", reviewerName: "Тимур Абдрахманов" },
      { rating: 5, comment: "Заказывали отдельную рубрику в выпуске подкаста. Камила подготовила вопросы заранее, провела интервью профессионально. Результат — 15K прослушиваний за неделю.", reviewerName: "Нургуль Сатыбалдина" },
      { rating: 4, comment: "Хороший подкаст с качественной аудиторией. Единственный минус — долгое согласование даты записи. Но результат стоит ожидания.", reviewerName: "Данияр Мухамеджанов" },
    ],
  },
  {
    creatorFullName: "Алина Жуматова",
    reviews: [
      { rating: 5, comment: "Алина сняла серию тренировок с нашим продуктом — протеиновыми батончиками. Результат: 200K охват, 50+ заказов по промокоду из ролика. Рекомендуем!", reviewerName: "Ольга Ким" },
      { rating: 5, comment: "Профессиональный подход к фитнес-контенту. Алина сама придумала концепцию челленджа, который завирусился. Наш бренд получил 500+ упоминаний.", reviewerName: "Алёна Петрова" },
      { rating: 4, comment: "Хороший охват и вовлечённость. Аудитория Алины — наша целевая. Единственное — хотелось бы больше акцента на продукте в ролике.", reviewerName: "Асем Жумагулова" },
      { rating: 5, comment: "Работали с Алиной для рекламы фитнес-приложения. Установки выросли на 30% за неделю после публикации. Качественный контент и надёжный партнёр.", reviewerName: "Кирилл Волков" },
    ],
  },
  {
    creatorFullName: "Тимур Касенов",
    reviews: [
      { rating: 5, comment: "Тимур сделал серию кинонарезок с интеграцией нашего стримингового сервиса. Ролики набрали суммарно 800K просмотров. Формат идеальный — зритель досматривает до конца.", reviewerName: "Аскар Нуржанов" },
      { rating: 4, comment: "Качественный монтаж, хорошие нарезки. Наша реклама встроена нативно. Единственное — хотелось бы больше вариаций в формате.", reviewerName: "Дамир Султанов" },
      { rating: 5, comment: "Лучший в нише кинонарезок. Его ролики стабильно залетают. Заказали 5 нарезок — все набрали 100K+. Будем работать ещё.", reviewerName: "Нурлан Базарбаев" },
    ],
  },
  {
    creatorFullName: "Мадина Оразова",
    reviews: [
      { rating: 5, comment: "Мадина сделала обзор нашего ресторана — честный, красивый, с аппетитной съёмкой. После публикации бронирования выросли на 40% за выходные.", reviewerName: "Ренат Кайыпов" },
      { rating: 4, comment: "Хороший фуд-контент. Мадина знает как снять еду так, чтобы захотелось попробовать. Немного затянули сроки, но результат того стоил.", reviewerName: "Гульмира Есенова" },
    ],
  },
  {
    creatorFullName: "Салтанат Кенжебаева",
    reviews: [
      { rating: 5, comment: "Салтанат сняла try-on нашей новой коллекции. Ролик набрал 120K, 30% трафика на сайт за неделю пришло с её Reels. Стильно и профессионально.", reviewerName: "Аружан Досмухамбетова" },
      { rating: 5, comment: "Работаем с Салтанат уже полгода. Каждый месяц — подборка образов. Её аудитория покупает то, что она показывает. Конверсия стабильно 5-7%.", reviewerName: "Мадина Серикова" },
      { rating: 4, comment: "Красивый контент, хорошо подобранные образы. Наш бренд получил узнаваемость в fashion-сегменте Алматы. Рекомендуем.", reviewerName: "Карина Абдуллина" },
    ],
  },
  {
    creatorFullName: "Ержан Тулегенов",
    reviews: [
      { rating: 5, comment: "Ержан сделал обзор нашего нового смартфона. Подход «для обычных людей» — именно то, что нужно. Видео набрало 95K на YouTube и 60K на TikTok.", reviewerName: "Виталий Цой" },
      { rating: 5, comment: "Заказывали комплекс YouTube + TikTok + Reels для ноутбука. Все три видео вышли в один день — синергия охватов. Отличная работа!", reviewerName: "Александр Ли" },
      { rating: 4, comment: "Качественный обзор наушников. Ержан честно указал и плюсы и минусы — это вызвало доверие у аудитории. Продажи по ссылке — 80+ штук.", reviewerName: "Тамара Есенгельдиева" },
      { rating: 5, comment: "Лучший техноблогер в Казахстане для коммерческих обзоров. Его аудитория доверяет его мнению. Будем работать ещё.", reviewerName: "Дастан Ибрагимов" },
    ],
  },
  {
    creatorFullName: "Динара Султанова",
    reviews: [
      { rating: 5, comment: "Динара сделала нарезку из турецкого сериала с интеграцией нашего приложения. Эмоциональный контент + нативная реклама = 250K просмотров и 2000 установок.", reviewerName: "Айжан Калиева" },
      { rating: 4, comment: "Красивые нарезки, хороший монтаж. Наша реклама органично вписалась в контент. Аудитория Динары — наша целевая.", reviewerName: "Светлана Пак" },
      { rating: 4, comment: "Заказывали серию из 3 нарезок. Все набрали 80K+. Хороший формат для нативной рекламы. Работать комфортно — Динара пунктуальная.", reviewerName: "Куралай Бекмухамбетова" },
    ],
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🌱 Seeding reviews for ${REVIEWS_DATA.length} creator profiles...\n`);

  const password = await bcrypt.hash("password123", 12);
  let totalReviews = 0;
  let totalProfiles = 0;

  for (const profileData of REVIEWS_DATA) {
    // 1. Найти профиль
    const profile = await prisma.creatorProfile.findFirst({
      where: { fullName: profileData.creatorFullName },
      select: { id: true, userId: true, fullName: true },
    });

    if (!profile) {
      console.log(`  ✗ Profile not found: ${profileData.creatorFullName}`);
      continue;
    }

    // Проверяем есть ли уже отзывы
    const existingReviews = await prisma.review.count({
      where: { targetType: "creator_profile", targetId: profile.id },
    });
    if (existingReviews > 0) {
      console.log(`  ~ Reviews already exist for: ${profile.fullName} (${existingReviews} reviews)`);
      totalProfiles++;
      continue;
    }

    // 2. Создаём отзывы
    for (let i = 0; i < profileData.reviews.length; i++) {
      const review = profileData.reviews[i];
      const reviewerEmail = `reviewer-${i + 1}-${profile.id.slice(0, 6)}@review-seed.kz`;

      // Создаём или находим reviewer-юзера
      let reviewer = await prisma.user.findUnique({ where: { email: reviewerEmail } });
      if (!reviewer) {
        reviewer = await prisma.user.create({
          data: {
            email: reviewerEmail,
            name: review.reviewerName,
            password,
            phone: null,
          },
        });
      }

      // Создаём ContactInteraction (для API-консистентности)
      const existingInteraction = await prisma.contactInteraction.findUnique({
        where: {
          userId_creatorProfileId: {
            userId: reviewer.id,
            creatorProfileId: profile.id,
          },
        },
      });
      if (!existingInteraction) {
        await prisma.contactInteraction.create({
          data: {
            userId: reviewer.id,
            creatorProfileId: profile.id,
          },
        });
      }

      // Создаём Review
      await prisma.review.create({
        data: {
          reviewerId: reviewer.id,
          targetType: "creator_profile",
          targetId: profile.id,
          creatorProfileId: profile.id,
          rating: review.rating,
          comment: review.comment,
        },
      });

      totalReviews++;
    }

    // 3. Пересчитываем рейтинг
    const stats = await prisma.review.aggregate({
      where: { targetType: "creator_profile", targetId: profile.id },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const averageRating = Math.round((stats._avg.rating ?? 0) * 10) / 10;
    const reviewCount = stats._count.rating;

    await prisma.creatorProfile.update({
      where: { id: profile.id },
      data: { averageRating, reviewCount },
    });

    console.log(`  ✓ ${profile.fullName}: ${reviewCount} reviews, avg ${averageRating}`);
    totalProfiles++;
  }

  console.log(`\n✅ Готово!`);
  console.log(`   Профилей обработано: ${totalProfiles}`);
  console.log(`   Отзывов создано: ${totalReviews}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
