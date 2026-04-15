# Критический долг доверия: аудит 2026-04-16

Набор проблем, при которых платформа показывает пользователям **неверные или необоснованные сигналы доверия** (social proof / метрики / бейджи). Это не баги в коде, а расхождения между тем, что видит пользователь, и тем, что реально происходит на бэке. Для MVP-роста критично, потому что разрушает восприятие честности платформы.

**Контекст аудита:** страница `/creators/[id]`, sidebar профиля, карточка объявления `/ads/[id]`. Проверено сверкой UI-рендеров с Prisma-схемой, сидами и API-роутами.

**Порядок задач:** сверху вниз = приоритет. Первые три — блокирующие для честного запуска публички.

---

## 1. `contactClickCount` — вводящая в заблуждение публичная метрика

**Что сейчас:**
- На публичной странице креатора и объявления отображалось «N обращений» (`CreatorProfileSidebar`, `AdDetailClient`).
- На деле это счётчик кликов на кнопку «Связаться», увеличивается даже от анонимов (rate-limit 5/мин на IP).
- В сиде [prisma/seed-creators-55.ts:124](prisma/seed-creators-55.ts#L124) поле заполняется случайным числом `5..55`.

**Уже сделано (2026-04-16):**
- Публичный рендер убран и заменён на `«N просмотров за 30 дней»` из новых моделей `ProfileView` / `AdView` (порог публикации N ≥ 20).
- В приватных surfaces (кабинет, `/ads/manage`) поле пока остаётся — не ломаем.

**Осталось:**
- Через 1–2 недели, когда накопятся реальные данные в `ProfileView` / `AdView`:
  - Переключить сортировку `sortBy=popular` ([app/api/creators/route.ts:128](app/api/creators/route.ts#L128)) с `contactClickCount DESC` на `COUNT(ProfileView WHERE createdAt >= now() - 30d)`.
  - Переключить приватные рендеры (кабинет, менеджмент объявлений) на агрегаты из новых таблиц.
  - После — **удалить поля** `CreatorProfile.contactClickCount` и `Ad.viewCount` из схемы.
  - Удалить/переосмыслить `app/api/creators/[id]/contact-click` и `app/api/tasks/[id]/contact-click` (инкремент больше не нужен; `ContactInteraction` для отзывов — оставить).

---

## 2. Seed рандомит бизнес-метрики в prod-БД

**Что сейчас:**
- [prisma/seed-creators-55.ts:124](prisma/seed-creators-55.ts#L124): `contactClickCount: Math.floor(Math.random() * 50) + 5`.
- Если сид запускался на prod — у реальных креаторов в БД лежат поддельные `5..55`.
- Эти цифры использовались в сортировке «популярные» и отображались пользователям.

**Что сделать:**
1. Проверить на prod-БД:
   ```sql
   SELECT id, "contactClickCount" FROM creator_profiles ORDER BY RANDOM() LIMIT 50;
   ```
   Если распределение равномерное в диапазоне 5–55 — значения фейковые.
2. Если фейковые — обнулить реальным креаторам:
   ```sql
   UPDATE creator_profiles SET "contactClickCount" = 0 WHERE "contactClickCount" BETWEEN 5 AND 55;
   ```
   (или по конкретным признакам — seed-креаторы создавались скриптом и могут отличаться по `createdAt`).
3. Аудитировать все другие seed-файлы (`prisma/seed*.ts`) на подобный рандом в метриках, которые уходят в публичку. Искать `Math.random` рядом с полями, показываемыми пользователю: `viewCount`, `reviewCount`, `averageRating`, `followers`, `portfolio.views`.
4. Добавить защиту: `prisma/seed*.ts` не должен запускаться в prod. Завести env-guard (`if (process.env.NODE_ENV === "production") throw new Error(...)`) или требовать флаг `--seed-demo`.

---

## 3. Нет трекинга реальных сделок вне escrow

**Проблема:**
- `completedOrders` на странице креатора считается только из `VideoSubmission` со `status=approved` ([app/creators/[id]/page.tsx:28-49](app/creators/[id]/page.tsx#L28-L49)).
- Это **только escrow-заказы**. Сценарий «клиент увидел профиль → написал в Telegram → договорились» для системы невидим.
- Креаторы без escrow всегда показывают «0 заказов», `successRate = null` — выглядят «пустыми» даже при реальной работе.

**Что сделать (варианты по сложности):**

**A. Минимум — само-декларируемые «вне-escrow сделки»:**
- Дать креатору кнопку «У меня была сделка с клиентом» в кабинете → запись `OfflineDeal { creatorProfileId, clientUserId?, amount?, description, createdAt, disputed?: bool }`.
- Показывать на профиле: «N сделок всего, из них N через платформу (escrow)».
- Клиент (если авторизован) может **подтвердить или отклонить** сделку → в публике показываем только подтверждённые.
- Плюсы: работает для любых флоу. Минусы: креатор может приписывать себе.

**B. Лучше — флоу «счёт через платформу»:**
- Рекламодатель после Telegram-договорённости создаёт на платформе «быстрый заказ» (сумма + описание, без escrow). Оплата может идти вне платформы, но сам факт подтверждается обеими сторонами.
- Создаёт `DirectOrder { creatorId, advertiserId, amount, confirmedByBoth: bool }`.
- После подтверждения — открывается возможность отзыва.

**C. Идеал — плавно выдавить в escrow:**
- Бейдж «сделка через платформу» — только для escrow или подтверждённых DirectOrder.
- Комиссия на offline-сделки 0%, но они не дают «бейдж надёжности» → экономический стимул использовать escrow.

**Решение о варианте — до имплементации.** Требует обсуждения с продуктом.

---

## 4. Отзыв требует `ContactInteraction` — ломает цикл для внешних клиентов

**Проблема:**
- [app/api/creators/[id]/reviews/route.ts:95-106](app/api/creators/[id]/reviews/route.ts#L95-L106) требует наличия `ContactInteraction` (клика «Связаться» на платформе) перед постановкой отзыва.
- Реальный клиент, пришедший из Telegram / по рекомендации, этот клик не делал → оставить отзыв не может.
- Ломает базовый цикл доверия: платформа не знает про клиента, клиент не знает про платформу.

**Что сделать:**

**Минимум:**
- Разрешить оставить отзыв любому авторизованному пользователю, не запрашивая `ContactInteraction`.
- Но добавить помечаение отзыва: `Review.source: "contact_click" | "manual" | "escrow" | "direct_order"`.
- В UI — подсветить отзыв от проверенного источника (escrow/direct) другим цветом; `manual` — тусклее.

**Лучше (привязка к задаче 3):**
- Отзыв можно оставить только при наличии подтверждённой `OfflineDeal` / `DirectOrder` / завершённого `VideoSubmission`.
- Это усложняет клиенту путь, но отзывы становятся реально привязаны к сделкам.

**Важно:** текущая уникальность «один отзыв от юзера на профиль» (`@@unique([userId, creatorProfileId])`) должна сохраниться в любом варианте.

---

## 5. Верификация — поле без процесса

**Что сейчас:**
- В схеме есть `CreatorProfile.verified` ([prisma/schema.prisma:510](prisma/schema.prisma#L510)) и `verificationStatus: "none" | "pending" | "approved" | "rejected"` с полями `verificationRequestedAt`, `verificationNote`.
- В UI бейдж рендерится (`VerifiedBadge`).
- **API для approve/reject — нет.** Креатор не может запросить верификацию; админ не может подтвердить / отклонить.
- На prod галка либо всегда `false`, либо ставится руками в БД.

**Что сделать:**
1. Креатор:
   - `POST /api/creators/[id]/verification/request` — переводит `verificationStatus` в `pending`, ставит `verificationRequestedAt`, опционально прикладывает документы (фото ID + selfie, например в `verificationDocs: String[]`).
   - Требует авторизации владельца.
2. Админ:
   - `GET /api/admin/verification/queue` — список `pending` запросов.
   - `POST /api/admin/verification/[profileId]/approve` — ставит `verified=true`, `verificationStatus=approved`, `verificationNote`.
   - `POST /api/admin/verification/[profileId]/reject` — `verificationStatus=rejected`, комментарий.
3. UI:
   - В кабинете креатора — кнопка «Запросить верификацию» + статус (`none` / `pending` / `approved` / `rejected` с причиной).
   - В админке — очередь заявок.
4. Документы хранить в объектном хранилище с ограниченным доступом (не в публичном `/uploads`).
5. Определить правила: что именно проверяется (соцсети, ID), SLA ответа админа.

---

## 6. Self-reported метрики без верификации

**Проблема:**
- `CreatorPlatform.followers` — число фолловеров, ручной ввод ([prisma/schema.prisma:593](prisma/schema.prisma#L593)).
- `PortfolioItem.views` — просмотры работ, ручной INT.
- `availability` — статус «свободен / занят», вручную.
- Нет никакой сверки с реальными API соцсетей → креатор может писать любые числа.

**Риски:**
- Рекламодатель принимает решение о покупке по липовым цифрам.
- Репутация платформы проседает, если выясняется накрутка.

**Что сделать:**

**Минимум — пометить как self-reported:**
- В UI рядом с цифрой: иконка «⚠ по данным креатора» / tooltip «Креатор указал самостоятельно».
- Текстом: «20k подписчиков (по данным креатора)» вместо «20k подписчиков».

**Средне — верифицировать ссылки:**
- При добавлении платформы (Instagram, TikTok, YouTube и т.п.) — проверять валидность URL и, по возможности, парсить публичные данные (follower count).
- Хранить оба числа: `followersClaimed` (что написал креатор) и `followersVerified` (что спарсилось). Показывать оба.
- Если расхождение >20% — показывать warning.

**Идеал — OAuth / Business API:**
- Для критичных платформ (Instagram, TikTok) — OAuth-подключение аккаунта → официальный follower count.
- Бейдж «подтверждённый аккаунт» рядом с платформой.

**Availability:**
- Добавить автоматическое понижение до `busy`, если креатор активно принимает задания через escrow.
- Добавить `availabilityUpdatedAt` и warning «Статус обновлён N дней назад», если больше 30 дней.

**Portfolio views:**
- Либо убрать из публики вообще (невозможно верифицировать).
- Либо пометить как self-reported и запретить вводить сильно отличающиеся от followers значения (эвристика).

---

## Связанные файлы

**Изменено в ходе аудита (2026-04-16):**
- `prisma/schema.prisma` — модели `ProfileView`, `AdView`
- `prisma/migrations/20260416130000_add_view_tracking/migration.sql`
- `lib/views.ts`, `lib/rate-limit.ts`
- `app/api/creators/[id]/view/route.ts`, `app/api/ads/[id]/view/route.ts`
- `app/api/creators/[id]/view-stats/route.ts`, `app/api/ads/[id]/view-stats/route.ts`
- `app/api/creators/[id]/view-stats/public/route.ts`, `app/api/ads/[id]/view-stats/public/route.ts`
- `app/creators/[id]/CreatorProfileSidebar.tsx`, `app/creators/[id]/CreatorDetailClient.tsx`
- `app/ads/[id]/AdDetailClient.tsx`, `components/ads/AdCard.tsx`
- `app/api/tasks/[id]/route.ts` — убран грязный `viewCount++`

**Переменные окружения:**
- `VIEW_HASH_SALT` — соль для sha256(ip). В prod обязательно сгенерировать свежий: `openssl rand -hex 32`.
