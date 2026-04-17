/* eslint-disable @typescript-eslint/no-explicit-any */

interface JsonLdProps {
  data: Record<string, any> | Record<string, any>[];
}

export default function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// ─── Schema helpers ──────────────────────────────────────────────────────────

const BASE_URL = "https://zharnamarket.kz";

/** Organization schema — used on every page via layout or homepage */
export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Zharnamarket",
    url: BASE_URL,
    logo: `${BASE_URL}/icon-512.png`,
    description:
      "Маркетплейс видеорекламы в Казахстане. Бизнес размещает задания, авторы видеоконтента откликаются напрямую — вирусные ролики, обзоры, сторителлинг, продакт-плейсмент и любые другие форматы.",
    foundingDate: "2024",
    areaServed: {
      "@type": "Country",
      name: "Kazakhstan",
    },
    // TODO: добавьте реальные ссылки на соцсети Zharnamarket, например:
    // sameAs: [
    //   "https://www.instagram.com/zharnamarket",
    //   "https://www.tiktok.com/@zharnamarket",
    //   "https://t.me/zharnamarket",
    // ],
  };
}

/** WebSite schema with SearchAction — helps Google show sitelinks search */
export function webSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Zharnamarket",
    url: BASE_URL,
    description:
      "Маркетплейс видеорекламы в Казахстане. Бизнес размещает задания на продвижение через видео, авторы контента откликаются напрямую — без посредников.",
    inLanguage: ["ru", "kk"],
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/ads?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/** SiteNavigationElement — hints Google which pages to show as sitelinks */
export function siteNavigationSchema() {
  const nav = [
    { name: "Главная", url: BASE_URL, description: "Маркетплейс видеорекламы в Казахстане" },
    { name: "Объявления", url: `${BASE_URL}/ads`, description: "Каталог рекламных объявлений от бизнеса" },
    { name: "Каталог авторов", url: `${BASE_URL}/creators`, description: "Авторы видеоконтента с портфолио и отзывами" },
  ];

  return nav.map((item) => ({
    "@context": "https://schema.org",
    "@type": "SiteNavigationElement",
    name: item.name,
    url: item.url,
    description: item.description,
  }));
}

/** BreadcrumbList schema */
export function breadcrumbSchema(
  items: { name: string; url: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/** FAQPage schema — helps AI agents extract Q&A */
export function faqSchema(
  items: { question: string; answer: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

/** ItemList schema for catalog/listing pages */
export function itemListSchema(
  name: string,
  items: { url: string; name: string; position: number }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item) => ({
      "@type": "ListItem",
      position: item.position,
      url: item.url,
      name: item.name,
    })),
  };
}

/** Offer/JobPosting-like schema for ad detail */
export function adOfferSchema(ad: {
  id: string;
  title: string;
  description: string;
  platform: string;
  budgetFrom?: number | null;
  budgetTo?: number | null;
  city?: string | null;
  category?: string | null;
  ownerName?: string | null;
  publishedAt?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Offer",
    name: ad.title,
    description: ad.description,
    url: `${BASE_URL}/ads/${ad.id}`,
    category: ad.category || "Реклама",
    ...(ad.budgetFrom && {
      price: ad.budgetFrom,
      priceCurrency: "KZT",
    }),
    ...(ad.budgetTo &&
      ad.budgetFrom && {
        priceSpecification: {
          "@type": "PriceSpecification",
          minPrice: ad.budgetFrom,
          maxPrice: ad.budgetTo,
          priceCurrency: "KZT",
        },
      }),
    availableAtOrFrom: {
      "@type": "Place",
      name: ad.city || "Казахстан",
      address: {
        "@type": "PostalAddress",
        addressCountry: "KZ",
        ...(ad.city && { addressLocality: ad.city }),
      },
    },
    offeredBy: {
      "@type": "Organization",
      name: ad.ownerName || "Рекламодатель",
    },
    ...(ad.publishedAt && { datePublished: ad.publishedAt }),
    additionalType: `Реклама через ${ad.platform}`,
  };
}

/** ProfilePage schema for creator detail */
export function creatorProfileSchema(creator: {
  id: string;
  fullName: string;
  bio?: string | null;
  city?: string | null;
  platforms?: string[];
  avatar?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: creator.fullName,
      url: `${BASE_URL}/creators/${creator.id}`,
      description: creator.bio || `Автор видеоконтента на Zharnamarket`,
      ...(creator.avatar && { image: creator.avatar }),
      ...(creator.city && {
        address: {
          "@type": "PostalAddress",
          addressLocality: creator.city,
          addressCountry: "KZ",
        },
      }),
      ...(creator.platforms?.length && {
        knowsAbout: creator.platforms.map((p) => `${p} контент`),
      }),
      ...(creator.rating && {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: creator.rating,
          bestRating: 5,
          ...(creator.reviewCount && { reviewCount: creator.reviewCount }),
        },
      }),
    },
  };
}
