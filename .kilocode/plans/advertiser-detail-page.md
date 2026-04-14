# План: Страница детали заказчика `/customers/[id]`

## Контекст и цель

Пользователь (блогер/креатор) заходит на страницу конкретного заказчика (человека или бизнеса) и видит:
- Публичный профиль — имя/фамилия или название компании
- Все активные объявления этого заказчика
- Контакты для связи

Маршрут: **`/customers/[id]`** — где `id` = `ownerId` заказчика в объявлениях (например `user-business-1`).

### Почему `/customers`, а не `/advertisers`

Заказчик — это не всегда бизнес. Это может быть:
- **Частное лицо**: зарегистрировался, указал имя/фамилию, публикует объявления от своего имени
- **Бизнес**: при регистрации заполнил `AdvertiserProfile` с `companyName`

`/advertisers` звучит как «только компании», `/customers` нейтрально охватывает оба случая.

### Логика отображения имени (displayName)

```ts
// По убыванию приоритета:
const displayName =
  advertiserProfile?.companyName ||   // Бизнес: "Zara KZ"
  user?.name ||                        // Частное лицо: "Алишер Каримов"
  ad.companyName ||                    // Fallback из объявления
  "Заказчик"                           // Дженерик
```

---

## Анализ существующей архитектуры

### Существующие паттерны (референсы)

| Референс | Паттерн |
|---|---|
| [`app/creators/[id]/page.tsx`](../../app/creators/[id]/page.tsx) | SSR page + `generateMetadata` + `notFound()` |
| [`app/creators/[id]/CreatorDetailClient.tsx`](../../app/creators/[id]/CreatorDetailClient.tsx) | `"use client"`, двухколоночный layout, sticky sidebar, sticky bottom CTA (mobile) |
| [`app/ads/[id]/AdDetailClient.tsx`](../../app/ads/[id]/AdDetailClient.tsx) | Сайдбар с инфо о компании, карточка контактов, `ContactModal` |
| [`components/ads/RelatedAdCard.tsx`](../../components/ads/RelatedAdCard.tsx) | Карточка объявления для списка |
| [`lib/mock/ads.ts`](../../lib/mock/ads.ts) | `getAdsByOwner(ownerId)` — уже существует |

### Ключевые типы данных

- **`AdvertiserProfile`** ([`lib/types/user.ts:17`](../../lib/types/user.ts:17)) — профиль рекламодателя: `companyName`, `companyType`, `city`, `description`, `telegram`, `whatsapp`, `website`
- **`Ad`** ([`lib/types/ad.ts:59`](../../lib/types/ad.ts:59)) — объявление с `ownerId`, `companyName`, `status`, `metadata`
- **`getAdsByOwner(ownerId)`** ([`lib/mock/ads.ts:275`](../../lib/mock/ads.ts:275)) — уже реализована

---

## Новые файлы для создания

### 1. `lib/mock/advertisers.ts`

Новый мок-файл с данными рекламодателей и вспомогательными функциями.

```ts
// Массив mock-профилей рекламодателей
export const mockAdvertiserProfiles: AdvertiserProfilePublic[] = [ ... ]

// Получить профиль по ownerId
export function getAdvertiserById(ownerId: string): AdvertiserProfilePublic | undefined

// Получить рекламодателя по ownerId из объявлений (fallback из Ad.companyName)
export function getAdvertiserFromAds(ownerId: string): AdvertiserProfilePublic | null
```

**Тип `AdvertiserProfilePublic`** — расширение существующего [`AdvertiserProfile`](../../lib/types/user.ts:17), добавляется в `lib/types/user.ts`:
```ts
export interface AdvertiserProfilePublic extends AdvertiserProfile {
  id: string;           // = userId (ownerId)
  totalAds: number;     // количество активных объявлений
  memberSince: string;  // дата регистрации (ISO string)
  verified: boolean;    // верифицирован ли
}
```

**Mock-данные для каждого ownerId** из `lib/mock/ads.ts`:
- `user-business-1` — Zara KZ / FitClub Almaty (2 объявления)
- `user-business-2` — Coffee Almaty
- `user-business-3` — AutoService Nur
- `user-business-4` — IT Startup KZ
- `user-business-5` — Game Cafe Shymkent

---

### 2. `app/customers/[id]/page.tsx`

SSR page по паттерну [`app/creators/[id]/page.tsx`](../../app/creators/[id]/page.tsx):

```tsx
// generateMetadata — SEO: "Zara KZ — Заказчик на ViralAds"
// Если заказчик не найден → notFound()
// Оборачивает в PublicLayout + CustomerDetailClient
```

---

### 3. `app/customers/[id]/CustomerDetailClient.tsx`

Главный клиентский компонент. Layout по образцу [`CreatorDetailClient.tsx`](../../app/creators/[id]/CreatorDetailClient.tsx).

---

## Детальный UI-план страницы

### Мобильный layout (< lg)
```
[Назад к объявлениям]
[── Карточка компании (sticky sidebar сверху) ──]
  Аватар (инициалы) + имя компании + verified badge
  Тип бизнеса · город
  Описание компании
  [Связаться]  ← кнопка
  Сайт / Telegram / WhatsApp
[── Объявления ──]
  Заголовок "Объявления (N)"
  Список AdCard или специальная мини-карточка
[── Sticky bottom CTA ──]  ← фиксированный внизу
  "Написать заказчику" → ContactModal
```

### Десктопный layout (≥ lg)
```
┌─[Breadcrumbs: Главная / Заказчики / Zara KZ]──────────┐
│                                                         │
│  ┌──[Sidebar sticky 320px]──┐  ┌──[Основной контент]──┐│
│  │ Аватар + имя + бейджи    │  │ "Объявления (N)"      ││
│  │ Тип компании + город     │  │ ┌────┐ ┌────┐ ┌────┐  ││
│  │ Описание                 │  │ │ Ad │ │ Ad │ │ Ad │  ││
│  │ Сайт / соцсети           │  │ └────┘ └────┘ └────┘  ││
│  │ ────────────────         │  │ [пусто-стейт если нет]││
│  │ Детали компании          │  │                        ││
│  │  • Тип: IT              │  └───────────────────────┘│
│  │  • Город: Алматы        │                            │
│  │  • Объявлений: 3        │                            │
│  │  • На платформе с: март │                            │
│  │ ────────────────         │                            │
│  │ [Связаться]              │                            │
│  │ Telegram · WhatsApp      │                            │
│  └──────────────────────────┘                            │
│  [Пожаловаться]                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Секции страницы (подробно)

### A. Навигация
- **Мобиль**: кнопка `← Назад к объявлениям` (link на `/ads`)
- **Десктоп**: Breadcrumbs `Главная / Заказчики / {companyName}`
  - «Заказчики» — пока нет каталога, ссылка на `/ads`

### B. Сайдбар (sticky на десктопе, блок сверху на мобиле)

#### B1. Шапка профиля
```
[Аватар — градиент с инициалами компании, w-20 h-20]
[companyName]  ✓ (verified badge если verified=true)
[Tag: "Топ рекламодатель" | "Проверенный бизнес" | "Рекламодатель"]
  — логика по boost-бейджам: если у любого объявления есть "premium" → "Топ рекламодатель"
[city] [·] [companyType]
```

#### B2. Описание
```
{description}  — если есть
```

#### B3. Ссылки / контакты в сайдбаре
```
🌐 website       → <a href target="_blank">
✈️ telegram      → t.me/{handle}
📱 whatsapp      → wa.me/{phone}
```
*Отображаются только заполненные поля*

#### B4. Детали (только десктоп)
```
Тип компании:  IT
Город:         Алматы
Активных объявлений: 2
На платформе с: Март 2026
```

#### B5. CTA-кнопка
```
[Связаться]  → открывает ContactModal
Telegram · WhatsApp  (подпись, какие каналы доступны)
```

---

### C. Основной контент — список объявлений

#### C1. Заголовок секции
```
Объявления (3)
[Фильтр: Активные | Все]  — toggle
```
- По умолчанию показываются только **активные** объявления (`status === "active"`)
- Переключатель «Все» показывает также `paused`
- `archived`, `deleted`, `draft` — **не показываются никогда**

#### C2. Сетка объявлений

**Мобиль**: `flex flex-col gap-3` — вертикальный список  
**Десктоп**: `grid grid-cols-2 gap-4`

Каждая карточка — компонент `AdvertiserAdCard` (новый, см. ниже) или переиспользование [`RelatedAdCard`](../../components/ads/RelatedAdCard.tsx) с небольшим расширением.

#### C3. Пустой стейт
```
Если нет объявлений:
[иконка]
"У этого заказчика нет активных объявлений"
[Смотреть все объявления] → /ads
```

---

### D. Sticky bottom bar (только мобиль)
```
[companyName (truncate)]  |  [Связаться →]
```
По паттерну [`CreatorDetailClient.tsx:384`](../../app/creators/[id]/CreatorDetailClient.tsx:384).

---

### E. Пожаловаться
Внизу страницы, мелкий текст:
```
🚩 Пожаловаться на профиль
```
`toast.info("Жалоба отправлена на рассмотрение")` — без реального API.

---

## Новый компонент: `components/ads/CustomerAdCard.tsx`

Карточка объявления в списке на странице заказчика.  
Отличие от [`RelatedAdCard`](../../components/ads/RelatedAdCard.tsx): **не показывает компанию** (она уже показана в шапке страницы), но показывает **статус** и **метаданные** (просмотры, дата).

```
┌──────────────────────────────┐
│ [TikTok]  [active: "Активно"]│
│ Нужны TikTok-видео обзоры... │
│                               │
│ 30 000 – 50 000 ₸            │
│ 📍 Алматы                    │
│ 👁 234 просмотра · 3 дня назад│
│                    Подробнее →│
└──────────────────────────────┘
```

Пропсы:
```ts
interface CustomerAdCardProps {
  ad: Ad;
  className?: string;
}
```

---

## Изменения в существующих файлах

### `lib/types/user.ts`
Добавить новый тип `CustomerPublicProfile` (нейтральное имя — подходит и для бизнеса, и для частного лица):
```ts
export interface CustomerPublicProfile {
  id: string;            // = ownerId
  displayName: string;   // companyName || user.name || "Заказчик"
  isCompany: boolean;    // есть ли AdvertiserProfile
  companyType: string | null;
  city: string;
  description: string | null;
  telegram: string | null;
  whatsapp: string | null;
  website: string | null;
  memberSince: string;
  verified: boolean;
}
```

### `lib/mock/customers.ts` (новый файл)
Mock-данные + функции:
```ts
export function getCustomerById(id: string): CustomerPublicProfile | undefined
export function getCustomerFromAds(ownerId: string): CustomerPublicProfile | null
```

### `app/ads/[id]/AdDetailClient.tsx`
В карточке компании (сайдбар, строка [`~276`](../../app/ads/[id]/AdDetailClient.tsx:276)) добавить ссылку:
```tsx
<Link href={`/customers/${ad.ownerId}`}>
  Посмотреть профиль заказчика →
</Link>
```

---

## Итоговый список файлов

| Файл | Действие | Описание |
|---|---|---|
| [`lib/types/user.ts`](../../lib/types/user.ts) | Изменить | +`CustomerPublicProfile` |
| `lib/mock/customers.ts` | Создать | Mock-данные + `getCustomerById` |
| `app/customers/[id]/page.tsx` | Создать | SSR page + metadata |
| `app/customers/[id]/CustomerDetailClient.tsx` | Создать | Клиентский компонент |
| `components/ads/CustomerAdCard.tsx` | Создать | Карточка объявления для профиля |
| [`app/ads/[id]/AdDetailClient.tsx`](../../app/ads/[id]/AdDetailClient.tsx) | Изменить | Ссылка «Профиль заказчика» |

---

## Ссылки на профиль заказчика из других страниц

После реализации добавить ссылки:
1. **[`app/ads/[id]/AdDetailClient.tsx:276`](../../app/ads/[id]/AdDetailClient.tsx:276)** — сайдбар, под именем компании: «Профиль заказчика →`/customers/{ownerId}`»
2. **[`components/ads/AdCard.tsx`](../../components/ads/AdCard.tsx)** — опционально: `companyName` как кликабельная ссылка

---

## Поведение при отсутствии данных (fallback)

| Ситуация | Поведение |
|---|---|
| `getCustomerById(id)` есть + объявления есть | Полная страница |
| Профиля нет, но есть объявления с `ownerId` | Страница с данными из `ad.companyName` + `ad.contacts`, без `description`/`website`/`companyType` |
| Ни профиля ни объявлений нет | `notFound()` → страница 404 |

---

## Мета-теги (SEO)

```ts
generateMetadata:
  title: `${displayName} — Заказчик на ViralAds`
  description: `${description || `${displayName}, ${city} — заказчик. Объявлений: ${totalAds}`}`
```

---

## Порядок реализации (для Code режима)

1. [`lib/types/user.ts`](../../lib/types/user.ts) — добавить `CustomerPublicProfile`
2. `lib/mock/customers.ts` — создать mock-данные для 5 заказчиков
3. `components/ads/CustomerAdCard.tsx` — карточка объявления
4. `app/customers/[id]/CustomerDetailClient.tsx` — основной клиентский компонент
5. `app/customers/[id]/page.tsx` — SSR page
6. [`app/ads/[id]/AdDetailClient.tsx`](../../app/ads/[id]/AdDetailClient.tsx) — добавить ссылку «Профиль заказчика»
