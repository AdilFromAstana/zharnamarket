import Link from "next/link";
import PublicLayout from "@/components/layout/PublicLayout";
import JsonLd, {
  organizationSchema,
  webSiteSchema,
  siteNavigationSchema,
  faqSchema,
} from "@/components/seo/JsonLd";

export const dynamic = "force-dynamic";
import AdCard from "@/components/ads/AdCard";
import CreatorCard from "@/components/creators/CreatorCard";
import HomeHero from "@/components/home/HomeHero";
import TrustStripSection from "@/components/home/TrustStripSection";
import ContentFormatsSection from "@/components/home/ContentFormatsSection";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import PricingSection from "@/components/home/PricingSection";
import FaqSection from "@/components/home/FaqSection";
import FinalCta from "@/components/home/FinalCta";
import EmptyListState from "@/components/home/EmptyListState";
import {
  fetchLatestAds,
  fetchLatestCreators,
  fetchHomeCounts,
  fetchVideoFormats,
} from "@/lib/home/fetch-home-data";
import { ADS_LISTING_FAQ } from "@/lib/seo/faq";

const HOME_FAQ = ADS_LISTING_FAQ.filter(
  (item) =>
    !/эскроу/i.test(item.question) && !/эскроу/i.test(item.answer),
);

export const metadata = {
  metadataBase: new URL("https://zharnamarket.kz"),
  title: "Zharnamarket — реклама через блогеров в Казахстане",
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
    "UGC креаторы Казахстан",
    "заказать видеорекламу",
    "продакт-плейсмент Алматы",
    "хук реклама",
    "обзор блогер заказать",
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
      ru: "https://zharnamarket.kz",
      kk: "https://zharnamarket.kz",
      "x-default": "https://zharnamarket.kz",
    },
  },
  openGraph: {
    title: "Zharnamarket — реклама через блогеров в Казахстане",
    description:
      "Маркетплейс для рекламы через TikTok, Instagram и YouTube-блогеров. " +
      "Бизнес размещает задания, креаторы откликаются напрямую.",
    type: "website",
    url: "https://zharnamarket.kz",
    locale: "ru_KZ",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Zharnamarket — реклама через блогеров в Казахстане",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Zharnamarket",
    description:
      "Маркетплейс для рекламы через TikTok, Instagram и YouTube-блогеров в Казахстане.",
  },
};

export default async function HomePage() {
  const [latestAds, latestCreators, counts, videoFormats] = await Promise.all([
    fetchLatestAds(),
    fetchLatestCreators(),
    fetchHomeCounts(),
    fetchVideoFormats(),
  ]);

  return (
    <PublicLayout>
      <JsonLd
        data={[
          organizationSchema(),
          webSiteSchema(),
          ...siteNavigationSchema(),
          faqSchema(HOME_FAQ),
        ]}
      />
      <HomeHero variant="A" />

      <TrustStripSection
        adsCount={counts.ads}
        creatorsCount={counts.creators}
      />

      <section className="mb-10 md:mb-12">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">
            Свежие объявления
          </h2>
          {latestAds.length > 0 && (
            <Link
              href="/ads"
              className="text-sky-600 text-sm hover:underline shrink-0 ml-4"
            >
              Все →
            </Link>
          )}
        </div>
        {latestAds.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {latestAds.map((ad) => (
              <AdCard key={ad.id} ad={ad} />
            ))}
          </div>
        ) : (
          <EmptyListState
            title="Пока нет объявлений"
            description="Будьте первым бизнесом на платформе — получите отклики от авторов контента уже сегодня."
            ctaLabel="Разместить объявление"
            ctaHref="/ads/new"
          />
        )}
      </section>

      <ContentFormatsSection formats={videoFormats} />

      <section className="mb-10 md:mb-12">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">
            Свежие авторы контента
          </h2>
          {latestCreators.length > 0 && (
            <Link
              href="/creators"
              className="text-sky-600 text-sm hover:underline shrink-0 ml-4"
            >
              Все →
            </Link>
          )}
        </div>
        {latestCreators.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {latestCreators.map((creator) => (
              <CreatorCard key={creator.id} creator={creator} />
            ))}
          </div>
        ) : (
          <EmptyListState
            title="Пока нет авторов в каталоге"
            description="Создайте профиль бесплатно и станьте одним из первых авторов контента на платформе."
            ctaLabel="Создать профиль"
            ctaHref="/creators/new"
          />
        )}
      </section>

      <HowItWorksSection />

      <PricingSection />

      <FaqSection items={HOME_FAQ} />

      <FinalCta />
    </PublicLayout>
  );
}
