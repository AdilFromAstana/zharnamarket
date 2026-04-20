# Zharnamarket

MVP-платформа для соединения бизнеса и креаторов в Казахстане. Платная доска объявлений с прямым контактом.

## Технологический стек

| Слой | Технологии |
|------|-----------|
| Фреймворк | Next.js 16 (App Router), TypeScript |
| База данных | PostgreSQL, Prisma ORM 7 |
| UI | Ant Design 5, Tailwind CSS 4 |
| Аутентификация | Custom JWT (jose, HS256), Google OAuth 2.0, email OTP |
| Email | Nodemailer (SMTP) |
| Оплата | Абстракция PaymentProvider (mock-режим, готово к Kaspi/Halyk) |
| Тесты | Vitest 4, интеграционные тесты с реальной БД |
| Защита маршрутов | proxy.ts (Next.js 16 Edge) |

## Быстрый старт

```bash
# 1. Установить зависимости
npm install

# 2. Настроить переменные окружения
cp .env.example .env
# Заполнить DATABASE_URL, JWT_SECRET, GOOGLE_CLIENT_ID/SECRET и т.д.

# 3. Применить схему к БД
npx prisma db push

# 4. Запустить dev сервер
npm run dev
```

Приложение будет доступно на `http://localhost:3000`.

## Переменные окружения

| Переменная | Описание | Обязательная |
|-----------|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string | Да |
| `JWT_SECRET` | Секрет для подписи JWT токенов | Да |
| `NEXT_PUBLIC_APP_URL` | URL приложения (http://localhost:3000) | Да |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Нет (для Google login) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Нет (для Google login) |
| `GOOGLE_REDIRECT_URI` | Google OAuth redirect URI | Нет (для Google login) |
| `SMTP_HOST` | SMTP сервер для email | Нет (fallback в console) |
| `SMTP_PORT` | SMTP порт | Нет (default: 587) |
| `SMTP_USER` | SMTP логин | Нет |
| `SMTP_PASS` | SMTP пароль | Нет |
| `SMTP_FROM` | Email отправителя | Нет |
| `PAYMENT_PROVIDER` | Платёжный провайдер (mock/kaspi/halyk) | Нет (default: mock) |

## Структура проекта

```
viral-wall-frontend/
├── app/                    # Next.js App Router
│   ├── api/                # API routes (45 endpoints)
│   │   ├── auth/           # register, login, verify-email, resend-code, google, logout, refresh, forgot/reset-password
│   │   ├── admin/          # stats, promo CRUD
│   │   ├── payments/       # ads/creators publish, boost, webhook, mock
│   │   ├── tasks/          # CRUD объявлений, статусы, фильтры
│   │   ├── creators/       # CRUD профилей, каталог, отзывы
│   │   ├── users/          # me, settings
│   │   └── ...
│   ├── auth/               # Страницы: login, register, verify-email, forgot/reset-password
│   ├── ads/                # Каталог, создание (wizard), управление, буст
│   ├── creators/           # Каталог, создание, управление, редактирование
│   ├── admin/              # Админ-панель: дашборд, промокоды
│   ├── cabinet/            # Личный кабинет
│   └── settings/           # Настройки аккаунта
├── lib/                    # Утилиты, типы, абстракции
│   ├── auth.ts             # JWT verify/sign, helpers
│   ├── prisma.ts           # Prisma client singleton
│   ├── payment-client.ts   # PaymentProvider абстракция
│   ├── email.ts            # Nodemailer: reset password, verification code
│   ├── verification.ts     # 6-digit code generation, SHA-256 hash
│   ├── promo.ts            # Promo code validation/application
│   ├── cookies.ts          # Auth cookie management
│   ├── sessions.ts         # Server-side session management
│   └── types/              # TypeScript типы
├── prisma/
│   └── schema.prisma       # Модели: User, Ad, CreatorProfile, PaymentSession, PromoCode, Review...
├── proxy.ts                # Серверная защита маршрутов (Next.js 16)
├── contexts/               # React contexts (AuthContext)
├── hooks/                  # useRequireAuth, useRequireAdmin
├── components/             # UI компоненты (layout, cards, forms)
├── tests/                  # Интеграционные тесты (Vitest)
│   ├── helpers.ts          # Test utilities (createTestUser, buildRequest, cleanup)
│   └── api/                # 13 тест-файлов, 137 тестов
└── .kilocode/              # Проектная документация (бизнес-процессы, TODO, роли)
```

## Тесты

```bash
# Запустить все тесты
npm test

# Watch mode
npm run test:watch
```

137 интеграционных тестов по 5 доменам:
- **Auth** — регистрация, логин, email верификация
- **Payments** — оплата публикации креатора, промокоды, webhook, идемпотентность
- **Reviews** — создание, обновление, удаление, eligibility, рейтинг
- **Admin** — авторизация, статистика, CRUD промокодов
- **Contact** — клик "Связаться", ContactInteraction

Тесты используют реальную PostgreSQL БД. Запуск последовательный (`fileParallelism: false`).

## Основная функциональность

### Реализовано

- Регистрация (email + пароль, Google OAuth) с email верификацией (6-значный код)
- JWT аутентификация (access 15мин + refresh 30дн) + управление сессиями
- Сброс пароля через email
- Объявления: 5-шаговый wizard, 7 статусов (draft/active/paused/expired/archived/deleted/pending_payment)
- Автоистечение объявлений через cron (7 дней)
- Профили креаторов: CRUD, множественные профили, публикация/снятие
- Каталоги с фильтрами (платформа, город, категория, бюджет)
- Оплата публикации объявлений и профилей (mock-провайдер, промокоды)
- Буст объявлений (3 типа: rise, highlight, premium)
- Отзывы и рейтинг (1-5 звёзд, ответы, пересчёт)
- Подача жалоб (спам, фейк, мошенничество и др.)
- Серверная защита маршрутов (proxy.ts)
- Админ-панель: дашборд со статистикой, CRUD промокодов

### В процессе / планируется

- Реальный платёжный провайдер (Kaspi/Halyk)
- Админ: управление пользователями, модерация контента, обработка жалоб
- Текстовый поиск по каталогам
- Верификация креаторов (workflow)
- Облачное хранилище файлов (S3/R2)
- Email-уведомления

## Документация

Проектная документация (бизнес-процессы, роли, монетизация) находится в `.kilocode/`. Начните с [`.kilocode/README.md`](.kilocode/README.md).

## Лицензия

Proprietary. All rights reserved.
