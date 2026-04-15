import Link from "next/link";
import { Button } from "antd";
import PublicLayout from "@/components/layout/PublicLayout";

export const dynamic = "force-dynamic";
import AdCard from "@/components/ads/AdCard";
import CreatorCard from "@/components/creators/CreatorCard";
import { mapPrismaAdToAd } from "@/lib/mappers/ad";
import { mapCreatorFromApi } from "@/lib/mappers/creator";
import { prisma } from "@/lib/prisma";
import type { Ad } from "@/lib/types/ad";
import type { CreatorProfile } from "@/lib/types/creator";

export const metadata = {
  metadataBase: new URL("https://viraladds.kz"),
  title: "ViralAds PARTNER — реклама через блогеров в Казахстане",
  description:
    "Маркетплейс для рекламы через TikTok, Instagram и YouTube-блогеров. " +
    "Бизнес размещает задания, креаторы откликаются напрямую. Алматы, Астана, Шымкент.",
  keywords: [
    // Русские ключевые слова
    "реклама блогеры Казахстан",
    "TikTok реклама",
    "Instagram блогеры",
    "YouTube реклама Алматы",
    "креаторы контента",
    "маркетплейс инфлюенсеров",
    // Казахские ключевые слова
    "жарнама блогерлер Қазақстан",
    "TikTok жарнама",
    "Instagram блогерлер",
    "YouTube жарнама Алматы",
    "контент жасаушылар",
    "инфлюенсер маркетплейс",
  ],
  alternates: {
    canonical: "/",
    languages: {
      ru: "https://viraladds.kz",
      kk: "https://viraladds.kz",
      "x-default": "https://viraladds.kz",
    },
  },
  openGraph: {
    title: "ViralAds PARTNER — реклама через блогеров в Казахстане",
    description:
      "Маркетплейс для рекламы через TikTok, Instagram и YouTube-блогеров. " +
      "Бизнес размещает задания, креаторы откликаются напрямую.",
    type: "website",
    url: "https://viraladds.kz",
    locale: "ru_KZ",
    images: [
      {
        url: "/og-default.svg",
        width: 1200,
        height: 630,
        alt: "ViralAds PARTNER",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ViralAds PARTNER",
    description:
      "Маркетплейс для рекламы через TikTok, Instagram и YouTube-блогеров в Казахстане.",
  },
};

async function fetchLatestAds(): Promise<Ad[]> {
  try {
    const ads = await prisma.ad.findMany({
      where: { status: "active", deletedAt: null },
      orderBy: [{ publishedAt: "desc" }],
      take: 6,
      include: {
        boosts: {
          where: { expiresAt: { gt: new Date() } },
          select: { boostType: true },
        },
        owner: {
          select: {
            id: true,
            name: true,
            advertiserProfile: {
              select: { companyName: true, displayName: true, verified: true },
            },
          },
        },
        city: true,
        category: true,
        videoFormat: true,
        adFormat: true,
        adSubject: true,
      },
    });
    return ads.map(mapPrismaAdToAd);
  } catch (err) {
    console.error("[fetchLatestAds]", err);
    return [];
  }
}

async function fetchLatestCreators(): Promise<CreatorProfile[]> {
  try {
    const now = new Date();
    const raws = await prisma.creatorProfile.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        platforms: true,
        portfolio: { orderBy: { createdAt: "desc" }, take: 4 },
        priceItems: { orderBy: { sortOrder: "asc" } },
        boosts: { where: { expiresAt: { gte: now } } },
        user: { select: { avatarColor: true } },
        city: { select: { id: true, key: true, label: true } },
        categories: { select: { id: true, key: true, label: true } },
      },
    });
    return raws.map(mapCreatorFromApi);
  } catch (err) {
    console.error("[fetchLatestCreators]", err);
    return [];
  }
}

export default async function HomePage() {
  const [latestAds, latestCreators, adsCount, creatorsCount] =
    await Promise.all([
      fetchLatestAds(),
      fetchLatestCreators(),
      prisma.ad.count({ where: { status: "active", deletedAt: null } }),
      prisma.creatorProfile.count({ where: { isPublished: true } }),
    ]);

  const stats = [
    { label: "Объявлений", value: String(adsCount) },
    { label: "Креаторов", value: `${creatorsCount}+` },
    { label: "Городов", value: "6" },
    { label: "Платформ", value: "3" },
  ];

  return (
    <PublicLayout>
      {/* Hero — один primary CTA, один secondary как текстовая ссылка */}
      <section className="text-center py-10 md:py-14 mb-8 md:mb-12">
        <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
          Бизнес и креаторы{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-blue-600">
            без посредников
          </span>
        </h1>
        <p className="text-base md:text-lg text-gray-500 max-w-xl mx-auto mb-2 px-4">
          Опубликуй объявление — получи прямые обращения от креаторов. Найди
          проект — напиши бизнесу напрямую.
        </p>
        {/* Казахский SEO-текст — помогает ранжироваться по кз-запросам */}
        <p className="text-xs text-gray-400 max-w-xl mx-auto mb-8 px-4">
          Жарнама беріп, блогерлермен тікелей байланысыңыз. TikTok, Instagram,
          YouTube — Қазақстан бойынша жарнама іздеу платформасы.
        </p>
        {/* Mobile: primary на всю ширину, secondary текстом */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 px-4">
          <Link href="/ads" className="w-full sm:w-auto">
            <Button
              type="primary"
              size="large"
              className="w-full sm:w-auto"
              style={{
                background: "#0EA5E9",
                borderColor: "#0EA5E9",
                height: 48,
                fontSize: 16,
                minWidth: 200,
              }}
            >
              Найти объявление
            </Button>
          </Link>
          <Link
            href="/ads/new"
            className="text-sm text-gray-500 hover:text-sky-600 underline underline-offset-2 transition-colors"
          >
            Разместить объявление →
          </Link>
        </div>
      </section>

      {/* Stats — реальные данные из БД */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-gray-100 p-3 md:p-4 text-center"
          >
            <div className="text-xl md:text-2xl font-bold text-gray-900">
              {stat.value}
            </div>
            <div className="text-xs md:text-sm text-gray-400 mt-0.5">
              {stat.label}
            </div>
          </div>
        ))}
      </section>

      {/* Новые объявления — единственный основной список */}
      <section className="mb-10 md:mb-12">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">
            Свежие объявления
          </h2>
          <Link
            href="/ads"
            className="text-sky-600 text-sm hover:underline shrink-0 ml-4"
          >
            Все →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {latestAds.map((ad) => (
            <AdCard key={ad.id} ad={ad} />
          ))}
        </div>
      </section>

      {/* Свежие креаторы */}
      {latestCreators.length > 0 && (
        <section className="mb-10 md:mb-12">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">
              Свежие креаторы
            </h2>
            <Link
              href="/creators"
              className="text-sky-600 text-sm hover:underline shrink-0 ml-4"
            >
              Все →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {latestCreators.map((creator) => (
              <CreatorCard key={creator.id} creator={creator} />
            ))}
          </div>
        </section>
      )}

      {/* CTA-баннер — призыв к регистрации */}
      <section className="bg-gradient-to-r from-sky-500 to-blue-600 rounded-2xl p-6 md:p-8 text-center text-white">
        <h2 className="text-xl md:text-2xl font-bold mb-2">Готовы начать?</h2>
        <p className="text-sky-100 text-sm md:text-base mb-5">
          Разместите объявление сегодня и получите первые обращения уже завтра
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/auth/register" className="w-full sm:w-auto">
            <Button
              size="large"
              className="w-full sm:w-auto"
              style={{
                background: "white",
                color: "#0EA5E9",
                borderColor: "white",
                height: 44,
                fontWeight: 600,
              }}
            >
              Зарегистрироваться
            </Button>
          </Link>
          <Link
            href="/creators"
            className="text-sky-100 text-sm hover:text-white underline underline-offset-2"
          >
            Каталог креаторов →
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
