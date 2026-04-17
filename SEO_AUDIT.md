# Technical SEO + AI Crawlability Audit — Zharnamarket

**Проект:** `zharnamarket.kz` | **Стек:** Next.js 16.1.7 (App Router), React 19, Prisma, Tailwind v4, Ant Design
**Дата:** 2026-04-17

---

## 1. Сводная таблица проблем

| # | Issue | Severity | Where | Why it matters | Exact fix |
|---|-------|----------|-------|----------------|-----------|
| 1 | **favicon.ico отсутствует** | HIGH | `app/layout.tsx:30` | Layout ссылается на `/favicon.ico`, файла нет. Браузер -> 404 на каждой странице. Увеличивает server load и даёт error в логах. | Добавить `public/favicon.ico` 32x32 или убрать строку из `icons` |
| 2 | ~~**27 raw `<img>` вместо `next/image`**~~ | ✅ DONE | ~~19 файлов~~ → 1 файл (admin) | ~~Нет lazy loading, нет WebP/AVIF конвертации.~~ **Решено:** остался 1 `<img>` в `app/admin/submissions/page.tsx` — внутренняя страница, не индексируется, замена не требуется. | — |
| 3 | ~~**proxy.ts не добавляет security headers**~~ | ✅ DONE | `proxy.ts` | ~~Proxy существует и защищает маршруты, но не устанавливает security headers.~~ **Решено:** добавлены 6 заголовков в `proxy.ts`: HSTS (2 года + preload), X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy (камера/микрофон/гео запрещены), CSP (self + dicebear для аватаров, Google/Telegram OAuth в form-action). | — |
| 4 | **ai-plugin.json -> несуществующий openapi.json** | MEDIUM | `public/.well-known/ai-plugin.json:12` | Ссылка на `https://zharnamarket.kz/api/openapi.json` — этого endpoint нет в проекте. AI-агенты получают 404 при попытке узнать API. | Создать endpoint или убрать блок `api` из ai-plugin.json |
| 5 | **Organization.sameAs пуст (TODO)** | MEDIUM | `components/seo/JsonLd.tsx:35-39` | Без `sameAs` Google не связывает сайт с соцсетями — Knowledge Panel не покажет Instagram/TikTok/Telegram. | Раскомментировать и заполнить реальными URL |
| 6 | ~~**Нет twitter:site / twitter:creator**~~ | ⏭ SKIP | `app/layout.tsx:56-59` | ~~Twitter Card без привязки к аккаунту.~~ **Пропущено:** у проекта нет аккаунта в X, добавлять некуда. OG-теги покрывают Threads и другие платформы. | — |
| 7 | ~~**SEOPagination теряет фильтры в href**~~ | ✅ DONE | `components/ads/SEOPagination.tsx` | ~~`hrefFor(page)` игнорировал фильтры.~~ **Решено:** компонент принимает `searchParams` и сохраняет все фильтры в `hrefFor()` через `URLSearchParams`. | — |
| 8 | ~~**/terms не в sitemap**~~ | ✅ DONE | `app/sitemap.ts` | ~~Страница условий не индексируется.~~ **Решено:** добавлен футер (`AppFooter`) со ссылкой на `/terms` на всех публичных страницах. Google найдёт через internal link, sitemap не нужен. | — |
| 9 | ~~**SiteNavigationElement -> disallowed URLs**~~ | ✅ DONE | `components/seo/JsonLd.tsx:67-69` | ~~Schema ссылалась на `/ads/new`, `/auth/register`, `/auth/login` — все заблокированы в robots.txt.~~ **Решено:** оставлены только `/`, `/ads`, `/creators` в навигационной схеме. | — |
| 10 | **force-dynamic на всех публичных страницах** | 📋 BACKLOG | `app/page.tsx`, `app/ads/page.tsx`, `app/sitemap.ts` | Каждый запрос = Prisma query. При росте трафика — нагрузка на БД. **Отложено:** пока трафик небольшой, force-dynamic даёт свежие данные. Переходить на ISR когда БД начнёт тормозить. | Использовать ISR (`revalidate: 60-300`) для листингов, `revalidate: 3600` для sitemap |
| 11 | **Нет rel="canonical" на пагинированных страницах в sitemap** | LOW | `app/sitemap.ts:74` | Sitemap включает `/ads?page=2`, `/ads?page=3` etc. как отдельные URL. Canonical в generateMetadata для page=1 должен быть `/ads` (без ?page=1). | Проверить: canonical для page=1 не должен содержать `?page=1` — **уже реализовано корректно** |
| 12 | ~~**Нет alt-text на части `<img>`**~~ | ✅ DONE | ~~AdCard, CreatorCard, Gallery~~ | ~~Часть `<img>` без alt.~~ **Проверено:** единственный `<img>` в проекте — в админке (`app/admin/submissions/page.tsx:344`), не индексируется. | — |
| 13 | **Canonical на деталях — относительный путь** | LOW | `app/ads/[id]/page.tsx`, `app/creators/[id]/page.tsx` | Canonical как `/ads/{id}` (relative). Next.js с `metadataBase` корректно разрешает это в absolute URL, но relative canonicals считаются плохой практикой по спеке. | Использовать `https://zharnamarket.kz/ads/${id}` (absolute) |
| 14 | **Нет loading.tsx / streaming SSR** | LOW | Все SSR-страницы | При медленном Prisma query пользователь видит белый экран. Нет Suspense boundary -> нет streaming. | Добавить `loading.tsx` с skeleton UI для `/ads`, `/creators`, главной |
| 15 | ~~**Нет error.tsx**~~ | ✅ DONE | Все маршруты | ~~Ошибка -> 500 без graceful fallback.~~ **Решено:** добавлен `app/error.tsx` с retry-кнопкой, стиль как у `not-found.tsx`. | — |
| 16 | ~~**Ads/Creators description — обрезка отсутствует**~~ | ✅ DONE | generateMetadata в `ads/[id]`, `creators/[id]` | ~~Если `ad.description` > 160 символов, обрезка непредсказуема.~~ **Решено:** description обрезается до 155 символов с `…` | — |
| 17 | ~~**Нет nofollow на внешних ссылках**~~ | ⏭ SKIP | Telegram/WhatsApp ссылки в карточках | ~~Ссылки на t.me/wa.me передают PageRank наружу.~~ **Пропущено:** это функциональные контактные ссылки, не платные/спамные. nofollow не нужен. `noopener` добавляется Next.js автоматически. | — |
| 18 | ~~**Нет structured data на /terms**~~ | ⏭ SKIP | `app/terms/page.tsx` | ~~Нет breadcrumb schema.~~ **Пропущено:** статичная юридическая страница, breadcrumb не даёт ничего в выдаче. Google понимает структуру из sitemap. | — |

---

## 2. Что реализовано хорошо

| Аспект | Оценка | Детали |
|--------|--------|--------|
| **Metadata** | 9/10 | Все публичные страницы: title, description, OG, Twitter, keywords (ru+kk), canonical, hreflang |
| **Structured Data** | 9/10 | 8 типов schema: Organization, WebSite, SearchAction, SiteNavigation, Breadcrumb, FAQ, Offer, ProfilePage |
| **robots.ts** | 9/10 | Правильный disallow для приватных маршрутов, AI-боты явно разрешены |
| **sitemap.ts** | 8/10 | Динамический, hreflang, пагинация, все active ads + published creators |
| **SSR/CSR разделение** | 10/10 | Все SEO-страницы SSR (/, /ads, /ads/[id], /creators, /creators/[id], /terms). Приватные — CSR |
| **Canonical** | 9/10 | Умная обработка фильтров, search param исключён, hreflang на всех страницах |
| **Dynamic OG Images** | 10/10 | Кастомные OG-изображения 1200x630 для каждого объявления и креатора |
| **AI Crawlability** | 9/10 | llms.txt + llms-full.txt + ai-plugin.json + .well-known/security.txt + явный allow AI-ботов |
| **PWA** | 9/10 | manifest.webmanifest, maskable icons, screenshots |
| **404 page** | 8/10 | Кастомная страница с навигацией обратно |
| **SEO Pagination** | 8/10 | Dual-mode: `<Link>` для SEO, `<button>` для клиентского режима |
| **Heading hierarchy** | 9/10 | h1 -> h2 -> h3 без пропусков на основных страницах |
| **Geo-targeting** | 10/10 | geo.region, geo.position, ICBM для Казахстана |
| **Fonts** | 10/10 | System font stack — ноль FOUT/FOIT, быстрая загрузка |

---

## 3. Critical Fixes (делать первыми)

### ~~3.1. Заменить `<img>` на `next/image`~~ ✅ DONE

~~27 экземпляров в 19 файлах.~~ **Проверено:** остался 1 `<img>` в `app/admin/submissions/page.tsx:344` — внутренняя админ-панель, не индексируется, замена не требуется.

### 3.2. Добавить favicon.ico

В `app/layout.tsx:30` убрать или заменить:
```ts
// Убрать эту строку если нет favicon.ico:
{ url: "/favicon.ico", sizes: "32x32" },
```

### 3.3. Исправить SEOPagination — сохранять фильтры

В `components/ads/SEOPagination.tsx` `hrefFor` нужно принимать текущие searchParams:

```tsx
interface SEOPaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl?: string;
  searchParams?: Record<string, string>; // добавить
  onPageChange?: (page: number) => void;
}

const hrefFor = (page: number) => {
  if (!searchParams || Object.keys(searchParams).length === 0) {
    return page === 1 ? baseUrl : `${baseUrl}?page=${page}`;
  }
  const params = new URLSearchParams(searchParams);
  if (page === 1) params.delete("page");
  else params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${baseUrl}?${qs}` : baseUrl;
};
```

---

## 4. Quick Wins (за 1 день)

| # | Что сделать | Файл | Время |
|---|-------------|------|-------|
| 1 | ~~Добавить `/terms` в sitemap~~ ✅ футер со ссылкой | `components/layout/AppFooter.tsx` | — |
| 2 | Раскомментировать `sameAs` в Organization schema | `components/seo/JsonLd.tsx:35-39` | 5 мин |
| 3 | ~~Добавить twitter:site~~ ⏭ нет аккаунта в X | `app/layout.tsx:56` | — |
| 4 | ~~Убрать `/ads/new`, `/auth/*` из SiteNavigationElement~~ ✅ | `components/seo/JsonLd.tsx:67-69` | — |
| 5 | Удалить или создать favicon.ico | `app/layout.tsx:30` | 10 мин |
| 6 | ~~Обрезать meta description до 155 символов~~ ✅ | `app/ads/[id]/page.tsx`, `app/creators/[id]/page.tsx` | — |
| 7 | Удалить `api` блок из ai-plugin.json (или создать openapi.json) | `public/.well-known/ai-plugin.json` | 5 мин |
| 8 | ~~Добавить `rel="nofollow noopener"` на t.me/wa.me~~ ⏭ не нужно | Компоненты карточек | — |
| 9 | ~~Добавить breadcrumb schema на /terms~~ ⏭ не нужно | `app/terms/page.tsx` | — |
| 10 | Добавить `loading.tsx` скелетоны | `app/ads/`, `app/creators/` | 30 мин |

---

## 5. Файлы, которые нужно изменить

| Файл | Что менять |
|------|-----------|
| `app/layout.tsx` | favicon.ico строка |
| `components/seo/JsonLd.tsx` | sameAs ~~, SiteNavigationElement URLs~~ ✅ |
| `app/sitemap.ts` | Добавить /terms |
| ~~`components/ads/SEOPagination.tsx`~~ | ~~Передавать searchParams~~ ✅ уже сделано |
| ~~`components/ads/AdCard.tsx`~~ | ~~img -> Image~~ ✅ Не требуется |
| ~~`components/creators/CreatorCard.tsx`~~ | ~~img -> Image~~ ✅ Не требуется |
| ~~`app/ads/[id]/AdPhotoGallery.tsx`~~ | ~~img -> Image~~ ✅ Не требуется |
| ~~`app/creators/[id]/CreatorProfileSidebar.tsx`~~ | ~~img -> Image~~ ✅ Не требуется |
| `public/.well-known/ai-plugin.json` | Убрать api блок или создать openapi.json |
| ~~`app/terms/page.tsx`~~ | ~~Breadcrumb schema~~ ⏭ SKIP |
| `app/ads/[id]/page.tsx` | Обрезка description |
| `app/creators/[id]/page.tsx` | Обрезка description |
| `proxy.ts` | Добавить security headers |
| **Создать:** `app/ads/loading.tsx` | Skeleton UI |
| **Создать:** `app/creators/loading.tsx` | Skeleton UI |
| **Создать:** `app/error.tsx` | Graceful error fallback |
| **Создать или удалить:** `public/favicon.ico` | Favicon |

---

## 6. Нет данных — нужна проверка на проде

| Что проверить | Почему из кода не видно | Как проверить |
|--------------|------------------------|---------------|
| **Реальный HTML-ответ SSR** | Не видно, отдаёт ли сервер полный HTML или fallback shell | `curl -s https://zharnamarket.kz/ads \| grep -c "<h1>"` |
| **HTTP заголовки** | Security headers добавлены в proxy.ts, но CDN/nginx может перезаписывать | `curl -I https://zharnamarket.kz` — проверить HSTS, CSP, X-Frame-Options, X-Content-Type-Options |
| **Core Web Vitals** | Код не показывает реальные метрики | PageSpeed Insights / CrUX Dashboard |
| **Redirect chains** | next.config.ts имеет 4 redirect, но CDN/nginx могут добавлять свои | `curl -sL -w "%{url_effective}" https://zharnamarket.kz` |
| **Индексация в Google** | Код правильный, но нужно подтверждение | `site:zharnamarket.kz` в Google + Search Console |
| **Yandex.Webmaster** | Казахстан = важен Yandex | Проверить Yandex.Webmaster: индексация, turbo-pages |
| **Soft 404** | Если deleted ad -> SSR возвращает 200 с "не найдено" вместо 404 | Проверить response code для несуществующего ID |
| **Render budget** | Googlebot рендерит JS 5-15 сек — если SSR работает, не проблема | Google Search Console -> URL Inspection -> Live test |
| **Server logs** | Частота обхода Googlebot, crawl errors | Nginx/CloudFlare access logs |
| **Image sizes** | Реальный вес user-uploaded изображений | DevTools Network tab |
| **Security headers (CSP) — после деплоя** | proxy.ts добавляет CSP/HSTS/etc, но нужно убедиться что на проде всё работает | См. чеклист ниже ↓ |

### Чеклист: проверка security headers после деплоя

- [ ] **Google OAuth** — залогиниться через Google, убедиться что редирект не заблокирован CSP `form-action`
- [ ] **Telegram OAuth** — залогиниться через Telegram, убедиться что редирект работает
- [ ] **Аватарки dicebear** — открыть страницу с аватарами (EscrowApplicationPanel), убедиться что `api.dicebear.com` картинки грузятся
- [ ] **Консоль браузера** — DevTools → Console → искать ошибки `Refused to load`, `Blocked by Content-Security-Policy`
- [ ] **curl заголовки** — `curl -I https://zharnamarket.kz` → должны быть: `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy`, `Referrer-Policy`, `Permissions-Policy`
- [ ] **unsafe-inline** — после проверки попробовать убрать `'unsafe-eval'` из `script-src` в `proxy.ts` и проверить что Ant Design не ломается. Если работает — убрать для усиления CSP

---

## 7. AI Crawlability — детальная оценка

| Аспект | Статус | Комментарий |
|--------|--------|-------------|
| robots.txt allow AI bots | **OK** | 9 AI User-Agents явно разрешены |
| llms.txt | **OK** | 62 строки, структурированный overview |
| llms-full.txt | **OK** | 170 строк, полная документация с FAQ |
| .well-known/ai-plugin.json | **Частично** | Есть, но ссылается на несуществующий openapi.json |
| .well-known/security.txt | **OK** | Контакт, язык, expiry |
| SSR content для AI | **OK** | Все публичные страницы SSR — контент доступен без JS |
| JSON-LD extraction | **OK** | FAQ schema = прямые ответы для AI |
| Heading structure | **OK** | Чёткая иерархия h1->h2->h3 для extraction |
| Прямые ответы в контенте | **Средне** | FAQ на главной хороший, но страницы листингов — только карточки без пояснительного текста |

**Рекомендация для AI extraction:** Добавить 1-2 параграфа контекстного текста на страницы `/ads` и `/creators` (выше карточек). Пример: "На Zharnamarket {count} активных объявлений от бизнеса в {cities} городах. Выберите платформу (TikTok, Instagram, YouTube) и формат видео для фильтрации." Это даёт AI-агентам текстовый контекст для extraction.

---

## 8. Видимые AI-агентам страницы

- `/` — главная с объявлениями, креаторами, FAQ
- `/ads` — каталог объявлений с фильтрами
- `/ads/[id]` — каждое активное объявление (Offer schema с ценой, городом, категорией)
- `/creators` — каталог креаторов
- `/creators/[id]` — каждый опубликованный профиль (ProfilePage + Person schema)
- `/terms` — условия использования
- `/llms.txt` — краткая документация для AI
- `/llms-full.txt` — полная документация для AI (170 строк)
- `/sitemap.xml` — динамическая карта сайта со всеми URL

## 9. Заблокированные страницы (правильно)

- `/cabinet/*` — личный кабинет
- `/ads/new`, `/ads/manage`, `/ads/[id]/edit` — управление объявлениями
- `/creators/new`, `/creators/manage`, `/creators/edit` — управление профилями
- `/auth/*` — авторизация
- `/api/*` — API-эндпоинты
- `/onboarding` — онбординг
