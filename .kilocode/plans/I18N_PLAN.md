# 🌐 План внедрения i18n — русский + казахский (`/ru/*` и `/kk/*`)

> **Статус:** ⬜ Отложено — реализовать после MVP  
> **Дата создания:** 2026-04-01  
> **Оценка:** ~2 рабочих дня  
> **Библиотека:** `next-intl`  
> **Приоритет:** СРЕДНИЙ (SEO для казахскоязычной аудитории)

---

## Зачем

Поисковые запросы на казахском ("жарнама іздеу", "TikTok жарнама Алматы") не покрываются текущими страницами на русском. Google не ранжирует русский контент по казахским запросам. Нужны отдельные URL `/kk/...` с казахским текстом.

---

## Текущее состояние (до реализации плана)

Временное решение (уже в коде на 2026-04-01):
- `hreflang="kk"` + `hreflang="ru"` в [`app/page.tsx`](../../app/page.tsx) metadata
- `alternates.languages` в [`app/sitemap.ts`](../../app/sitemap.ts) — оба указывают на один URL
- Казахский текст в Hero-секции [`app/page.tsx`](../../app/page.tsx)

Это даёт слабый сигнал для kk-аудитории. Для полноценного ранжирования нужны отдельные маршруты.

---

## Шаг 1 — Установка и конфигурация

```bash
npm install next-intl
```

**Создать [`i18n/routing.ts`](../../i18n/routing.ts):**
```ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ru", "kk"],
  defaultLocale: "ru",
});
```

**Создать [`i18n/request.ts`](../../i18n/request.ts):**
```ts
import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = hasLocale(routing.locales, await requestLocale)
    ? await requestLocale
    : routing.defaultLocale;
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

---

## Шаг 2 — Файлы переводов

**Создать [`messages/ru.json`](../../messages/ru.json)** — все тексты UI на русском:

```json
{
  "HomePage": {
    "hero_title": "Бизнес и креаторы без посредников",
    "hero_desc": "Опубликуй объявление — получи прямые обращения от креаторов. Найди проект — напиши бизнесу напрямую.",
    "hero_desc_kk": "Жарнама беріп, блогерлермен тікелей байланысыңыз.",
    "cta_find": "Найти объявление",
    "cta_post": "Разместить объявление →",
    "stats_ads": "Объявлений",
    "stats_creators": "Креаторов",
    "stats_cities": "Городов",
    "stats_platforms": "Платформ",
    "section_new_ads": "Свежие объявления",
    "section_all_ads": "Все →",
    "section_top_creators": "Топ-креаторы",
    "section_catalog": "Каталог →",
    "cta_banner_title": "Готовы начать?",
    "cta_banner_desc": "Разместите объявление сегодня и получите первые обращения уже завтра",
    "cta_register": "Зарегистрироваться",
    "cta_creators": "Каталог креаторов →"
  },
  "AdsPage": {
    "title": "Объявления",
    "subtitle": "Найди подходящий проект и свяжись с бизнесом напрямую"
  },
  "CreatorsPage": {
    "title": "Каталог креаторов",
    "subtitle": "Найди создателя контента для своего проекта"
  },
  "Header": {
    "nav_ads": "Объявления",
    "nav_creators": "Каталог",
    "nav_post": "Разместить",
    "login": "Войти",
    "cabinet": "Кабинет",
    "settings": "Настройки",
    "logout": "Выйти"
  },
  "Common": {
    "currency": "₸",
    "from": "от",
    "city_all": "Все города"
  }
}
```

**Создать [`messages/kk.json`](../../messages/kk.json)** — все те же ключи на казахском:

```json
{
  "HomePage": {
    "hero_title": "Бизнес пен блогерлер делдалсыз",
    "hero_desc": "Жарнама жариялаңыз — блогерлерден тікелей өтінімдер алыңыз. Жоба табыңыз — бизнеске тікелей жазыңыз.",
    "hero_desc_kk": "Жарнама беріп, блогерлермен тікелей байланысыңыз. TikTok, Instagram, YouTube — Қазақстан бойынша жарнама іздеу платформасы.",
    "cta_find": "Жарнама іздеу",
    "cta_post": "Жарнама орналастыру →",
    "stats_ads": "Жарнамалар",
    "stats_creators": "Блогерлер",
    "stats_cities": "Қалалар",
    "stats_platforms": "Платформалар",
    "section_new_ads": "Жаңа жарнамалар",
    "section_all_ads": "Барлығы →",
    "section_top_creators": "Үздік блогерлер",
    "section_catalog": "Каталог →",
    "cta_banner_title": "Бастауға дайынсыз ба?",
    "cta_banner_desc": "Бүгін жарнама орналастырыңыз және ертең бірінші өтінімдерді алыңыз",
    "cta_register": "Тіркелу",
    "cta_creators": "Блогерлер каталогы →"
  },
  "AdsPage": {
    "title": "Жарнамалар",
    "subtitle": "Қолайлы жобаны табыңыз және бизнеспен тікелей байланысыңыз"
  },
  "CreatorsPage": {
    "title": "Блогерлер каталогы",
    "subtitle": "Жобаңыз үшін контент жасаушыны табыңыз"
  },
  "Header": {
    "nav_ads": "Жарнамалар",
    "nav_creators": "Каталог",
    "nav_post": "Орналастыру",
    "login": "Кіру",
    "cabinet": "Кабинет",
    "settings": "Баптаулар",
    "logout": "Шығу"
  },
  "Common": {
    "currency": "₸",
    "from": "бастап",
    "city_all": "Барлық қалалар"
  }
}
```

> ⚠️ Переводы нужно проверить с носителем казахского языка.

---

## Шаг 3 — Middleware

**Создать/обновить [`middleware.ts`](../../middleware.ts):**

> ⚠️ Конфликт с задачей #5 (auth middleware). При реализации i18n нужно объединить оба middleware в один файл.

```ts
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextRequest } from "next/server";

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  // Пропускаем API роуты — они не нуждаются в локали
  if (request.nextUrl.pathname.startsWith("/api")) {
    return;
  }
  return intlMiddleware(request);
}

export const config = {
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
```

---

## Шаг 4 — Реструктурировать `app/`

Переместить все страницы в `app/[locale]/`:

```
app/
├── [locale]/                    ← НОВЫЙ сегмент locale
│   ├── layout.tsx               ← перенести из app/layout.tsx
│   ├── page.tsx                 ← перенести из app/page.tsx
│   ├── not-found.tsx
│   ├── ads/
│   │   ├── page.tsx
│   │   ├── AdsListClient.tsx
│   │   └── [id]/
│   │       ├── page.tsx
│   │       ├── AdDetailClient.tsx
│   │       ├── AdPhotoGallery.tsx
│   │       ├── ContactModal.tsx
│   │       ├── boost/page.tsx
│   │       └── edit/page.tsx
│   ├── creators/
│   │   ├── page.tsx
│   │   ├── CreatorsListClient.tsx
│   │   └── [id]/
│   │       ├── page.tsx
│   │       └── CreatorDetailClient.tsx
│   │   ├── edit/page.tsx
│   │   ├── manage/page.tsx
│   │   └── new/page.tsx
│   ├── profile/[id]/
│   │   ├── page.tsx
│   │   └── ProfileClient.tsx
│   ├── auth/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── google/success/page.tsx
│   ├── cabinet/page.tsx
│   ├── settings/page.tsx
│   ├── onboarding/business/page.tsx
│   └── ads/
│       ├── manage/page.tsx
│       └── new/page.tsx
├── api/                         ← НЕ ТРОГАЕМ (без локали)
├── robots.ts                    ← уже создан (без изменений)
└── sitemap.ts                   ← обновить (см. Шаг 7)
```

---

## Шаг 5 — Обновить LocaleLayout

**[`app/[locale]/layout.tsx`](../../app/[locale]/layout.tsx):**

```tsx
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import "../globals.css";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className="antialiased">
        <NextIntlClientProvider messages={messages}>
          <AntdRegistry>
            <AuthProvider>{children}</AuthProvider>
          </AntdRegistry>
          <Toaster position="top-right" richColors />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

---

## Шаг 6 — Обновить компоненты

Каждый компонент с хардкодным текстом меняется:

```tsx
// ДО:
<h1>Бизнес и креаторы без посредников</h1>

// ПОСЛЕ:
import { useTranslations } from "next-intl";
// ...
const t = useTranslations("HomePage");
<h1>{t("hero_title")}</h1>
```

**Файлы с текстом (приоритет):**

| Файл | Строк с текстом | Приоритет |
|------|----------------|-----------|
| [`app/[locale]/page.tsx`](../../app/page.tsx) | ~15 | 🔴 |
| [`components/layout/AppHeader.tsx`](../../components/layout/AppHeader.tsx) | ~20 | 🔴 |
| [`app/[locale]/ads/page.tsx`](../../app/ads/page.tsx) | ~5 | 🟠 |
| [`app/[locale]/creators/page.tsx`](../../app/creators/page.tsx) | ~5 | 🟠 |
| [`app/[locale]/ads/[id]/AdDetailClient.tsx`](../../app/ads/[id]/AdDetailClient.tsx) | ~40 | 🟡 |
| [`app/[locale]/creators/[id]/CreatorDetailClient.tsx`](../../app/creators/[id]/CreatorDetailClient.tsx) | ~40 | 🟡 |
| [`components/ads/AdCard.tsx`](../../components/ads/AdCard.tsx) | ~15 | 🟡 |
| [`components/ads/AdFilters.tsx`](../../components/ads/AdFilters.tsx) | ~25 | 🟡 |
| [`components/creators/CreatorFilters.tsx`](../../components/creators/CreatorFilters.tsx) | ~25 | 🟡 |

---

## Шаг 7 — Обновить `sitemap.ts`

После появления `/ru/*` и `/kk/*` маршрутов:

```ts
// app/sitemap.ts — после реализации i18n
adRoutes = ads.map((ad) => {
  const urlRu = `${BASE_URL}/ru/ads/${ad.id}`;
  const urlKk = `${BASE_URL}/kk/ads/${ad.id}`;
  return {
    url: urlRu,
    lastModified: ad.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
    alternates: {
      languages: {
        ru: urlRu,
        kk: urlKk,
        "x-default": urlRu,
      },
    },
  };
});
```

---

## Шаг 8 — SEO redirects

Добавить в [`next.config.ts`](../../next.config.ts) редиректы для уже проиндексированных URL:

```ts
async redirects() {
  return [
    { source: "/ads/:path*", destination: "/ru/ads/:path*", permanent: true },
    { source: "/creators/:path*", destination: "/ru/creators/:path*", permanent: true },
  ];
},
```

---

## ⚠️ Ключевые риски

| Риск | Митигация |
|------|-----------|
| Конфликт `middleware.ts` (i18n + auth #5) | Объединить в одном файле — сначала auth-проверка, потом i18n |
| Перевод ~500 строк на казахский | DeepL/GPT для черновика, проверка нейтивом |
| `generateMetadata` нуждается в `locale` | Использовать `getTranslations({ locale, namespace })` вместо `useTranslations` |
| SEO: старые `/ads/[id]` URL уже проиндексированы | 301 redirect в `next.config.ts` |
| `useTranslations` только в Server/Client Components | API routes не нуждаются в переводе |

---

## ⏱ Оценка трудозатрат

| Этап | Время |
|------|-------|
| Установка + конфиг (шаги 1–3) | 1 час |
| Реструктурирование `app/` (шаги 4–5) | 3–4 часа |
| Перевод `messages/kk.json` | 4–6 часов |
| Обновление всех компонентов (шаг 6) | 4–6 часов |
| Обновление `sitemap.ts` + redirects (шаги 7–8) | 30 мин |
| Тестирование + исправление | 2 часа |
| **Итого** | **~2 рабочих дня** |

---

## 🔗 Связанные задачи

- Задача #5 из `PROJECT_AUDIT_REPORT.md` — middleware для auth (нужно объединить с i18n middleware)
- Задача #17 — [`app/robots.ts`](../../app/robots.ts) — при i18n нужно обновить disallow пути с `/ru/`
- Задача #16 — [`app/sitemap.ts`](../../app/sitemap.ts) — обновить URL после реализации i18n (см. Шаг 7)
- Задача #20 — [`app/page.tsx`](../../app/page.tsx) — текущий hreflang — временное решение до i18n

---

*Создан: 2026-04-01. Статус: Отложено до завершения MVP.*
