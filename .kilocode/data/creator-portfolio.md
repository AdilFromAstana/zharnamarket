# 💾 Структура данных: Портфолио креатора MVP

[← Назад к оглавлению](../README.md)

---

## Модель данных `CreatorProfile`

> **Важно:** В MVP портфолио креатора — это простая публичная карточка для каталога, через которую бизнес может выйти на прямой контакт. Не тяжелая аналитическая сущность.

---

## Базовая связь с аккаунтом

```typescript
interface User {
  id: string;
  email: string;
  phone: string;
  passwordHash: string;

  isCreator: boolean;
  isAdvertiser: boolean;
  activeRole: 'creator' | 'advertiser';
}
```

---

## Основная схема `CreatorProfile`

```typescript
interface CreatorProfile {
  userId: string;

  fullName: string;
  username: string | null;
  avatar: string | null;
  bio: string | null;

  city: string;
  age: number | null;

  availability: 'available' | 'busy' | 'partially_available';
  verified: boolean;

  platforms: Platform[];
  contentCategories: string[];
  portfolio: PortfolioItem[];

  pricing: Pricing;
  contacts: Contacts;  // Обязательно для публикации

  metadata: Metadata;
}
```

---

## Вложенные структуры

### `Platform`

```typescript
interface Platform {
  name: 'TikTok' | 'Instagram' | 'YouTube';
  handle: string;
  url: string;
  followers: number | null;
}
```

### `PortfolioItem`

```typescript
interface PortfolioItem {
  id: string;
  platform: 'TikTok' | 'Instagram' | 'YouTube';
  thumbnail: string;
  videoUrl: string;
  category: string;
  description: string | null;
  views: number | null;
}
```

### `Pricing`

```typescript
interface Pricing {
  minimumRate: number;
  negotiable: boolean;
  currency: 'KZT';
}
```

### `Contacts`

> **Важно:** Контакты — ключевое поле. Без контактов профиль не публикуется в каталоге. Через них бизнес выходит напрямую.

```typescript
interface Contacts {
  telegram: string | null;
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
}
```

### `Metadata`

```typescript
interface Metadata {
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string;
  featured: boolean;
}
```

---

## Что убрано из MVP-модели

В MVP **не считаем обязательными**:
- автоматические метрики охватов;
- retention rate;
- engagement rate как системную истину;
- total earned через платформу;
- average order value;
- preferred payment models как ядро платформы;
- сложные отзывы и многоуровневую репутацию;
- тяжелую аналитическую metadata;
- автозаполнение через API соцсетей.

Если какие-то цифры и указываются, то они:
- либо вручную вводятся креатором;
- либо проверяются вручную;
- либо вообще остаются необязательными.

---

## Минимальные требования для публикации профиля

Профиль можно публиковать в каталоге, если есть:

```typescript
{
  fullName: '...',
  city: '...',
  platforms: [{ name: 'TikTok', handle: '@creator', url: '...' }],
  contentCategories: ['Мемы'],
  portfolio: [{...}, {...}, {...}],
  pricing: { minimumRate: 15000, negotiable: true, currency: 'KZT' },
  contacts: { telegram: '@creator', whatsapp: null, phone: null, email: null }
}
```

Минимум нужен такой:
- имя;
- город;
- хотя бы 1 платформа;
- хотя бы 1 категория;
- минимум 3 работы;
- минимальная ставка;
- **хотя бы один контакт для прямой связи** (обязательно).

---

## Рекомендуемые поля

Полезно добавить, но не обязательно:
- аватар;
- био;
- примерные просмотры отдельных работ;
- ссылку на демо-ролик вне платформы;
- WhatsApp или телефон как дополнительный канал связи.

---

## Пример объекта профиля

```typescript
const creatorProfile: CreatorProfile = {
  userId: 'user_123',

  fullName: 'Данияр Креатор',
  username: '@daniyar_creator',
  avatar: null,
  bio: 'Создаю короткие вирусные ролики для TikTok и Reels',

  city: 'Алматы',
  age: 24,

  availability: 'available',
  verified: false,

  platforms: [
    {
      name: 'TikTok',
      handle: '@daniyar_viral',
      url: 'https://tiktok.com/@daniyar_viral',
      followers: 125000
    }
  ],

  contentCategories: ['Мемы', 'Обзоры'],

  portfolio: [
    {
      id: 'p1',
      platform: 'TikTok',
      thumbnail: 'https://cdn.example.com/thumb1.jpg',
      videoUrl: 'https://tiktok.com/@daniyar_viral/video/123456',
      category: 'Мемы',
      description: 'Вирусный мем',
      views: 450000
    },
    {
      id: 'p2',
      platform: 'TikTok',
      thumbnail: 'https://cdn.example.com/thumb2.jpg',
      videoUrl: 'https://tiktok.com/@daniyar_viral/video/123457',
      category: 'Обзоры',
      description: 'Короткий обзор',
      views: 220000
    },
    {
      id: 'p3',
      platform: 'Instagram',
      thumbnail: 'https://cdn.example.com/thumb3.jpg',
      videoUrl: 'https://instagram.com/reel/123',
      category: 'Мемы',
      description: null,
      views: 110000
    }
  ],

  pricing: {
    minimumRate: 15000,
    negotiable: true,
    currency: 'KZT'
  },

  contacts: {
    telegram: '@daniyar_creator',
    whatsapp: '+77011234567',
    phone: null,
    email: null
  },

  metadata: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    featured: false
  }
};
```

---

## Пример базовой валидации

```typescript
function isProfileReady(profile: CreatorProfile): boolean {
  const hasContact = Boolean(
    profile.contacts.telegram ||
    profile.contacts.whatsapp ||
    profile.contacts.phone ||
    profile.contacts.email
  );

  return Boolean(
    profile.fullName &&
    profile.city &&
    profile.platforms.length > 0 &&
    profile.contentCategories.length > 0 &&
    profile.portfolio.length >= 3 &&
    profile.pricing.minimumRate > 0 &&
    hasContact
  );
}
```

---

## Модель объявления `Ad`

Объявления — основная монетизируемая сущность.

```typescript
interface Ad {
  id: string;
  ownerId: string;  // userId рекламодателя

  title: string;
  description: string;
  platform: 'TikTok' | 'Instagram' | 'YouTube';
  city: string;
  category: string;
  budget: string | null;    // текстовое поле, e.g. "50,000 ₸" или "CPV"
  deadline: string | null;
  requirements: string | null;

  contacts: AdContacts;  // Контакты для прямой связи

  tariff: 'basic' | 'boost' | 'featured';
  publishedAt: string | null;
  expiresAt: string | null;
  status: AdStatus;

  metadata: AdMetadata;
}

type AdStatus =
  | 'draft'
  | 'pending_payment'
  | 'active'
  | 'paused'
  | 'expired'
  | 'archived'
  | 'deleted';

interface AdContacts {
  telegram: string | null;
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
}

interface AdMetadata {
  createdAt: string;
  updatedAt: string;
  viewCount: number;           // просмотры карточки
  contactClickCount: number;   // нажатия «Связаться»
  featured: boolean;
}
```

---

## MVP API Endpoints (предполагаемые)

### Профили

#### `GET /api/portfolio/:creatorId`
Получить профиль креатора.

#### `POST /api/portfolio`
Создать профиль креатора.

#### `PUT /api/portfolio/:creatorId`
Обновить профиль.

#### `GET /api/portfolios`
Получить каталог креаторов.

**Базовые query params:**
- `city`
- `platform`
- `category`
- `maxRate`
- `sortBy=new|price|alphabet`
- `page`
- `limit`

### Объявления

#### `GET /api/ads`
Получить ленту объявлений.

**Базовые query params:**
- `city`
- `platform`
- `category`
- `sortBy=new|budget`
- `page`
- `limit`

#### `POST /api/ads`
Создать объявление.

#### `PUT /api/ads/:adId`
Обновить объявление.

#### `POST /api/ads/:adId/pause`
Поставить на паузу.

#### `POST /api/ads/:adId/resume`
Возобновить.

#### `POST /api/ads/:adId/archive`
Архивировать.

#### `DELETE /api/ads/:adId`
Удалить.

#### `POST /api/ads/:adId/contact-click`
Фиксировать нажатие «Связаться» (аналитика).

---

## Итог

В MVP профиль и объявление — это не инструменты сложного рекламного workflow.

Это:
- публичная карточка;
- способ быстро показать себя или свое предложение;
- источник прямого контакта.

Платформа сводит стороны. Дальше — они сами.

---

## Связанные документы

- [`roles/creator.md`](../roles/creator.md) - роль креатора
- [`processes/creator-flow.md`](../processes/creator-flow.md) - путь креатора
- [`algorithms/ranking.md`](../algorithms/ranking.md) - простая сортировка каталога
- [`rate-business-mvp.md`](../rate-business-mvp.md) - основная MVP-логика

[← Назад к оглавлению](../README.md)
