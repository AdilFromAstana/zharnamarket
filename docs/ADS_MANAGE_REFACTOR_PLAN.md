# План рефакторинга страницы /ads/manage

**Дата:** 2026-04-18
**Целевой файл:** [app/ads/manage/page.tsx](../app/ads/manage/page.tsx)
**Связанные файлы:** [components/ads/AdManagementCard.tsx](../components/ads/AdManagementCard.tsx), [lib/mappers/ad.ts](../lib/mappers/ad.ts)
**Смежный план:** [MANAGE_PAGE_REFACTOR_PLAN.md](./MANAGE_PAGE_REFACTOR_PLAN.md), [BOOST_PLACEMENT_PLAN.md](./BOOST_PLACEMENT_PLAN.md)
**Цель:** привести экран к стандартам дашбордов (Fiverr, Shopify, Google Ads), убрать дубли, вывести критические действия из overflow, добавить сигналы о состоянии размещения (отклики, escrow, сроки).

---

## 0. Что уже неплохо (не ломать)

- `AdManagementCard` уже вынесен в компонент — можно наращивать без декомпозиции.
- Баннер незавершённой оплаты публикации ([page.tsx:418-455](../app/ads/manage/page.tsx#L418-L455)) — полезная UX-фича, которой нет на creators.
- Блок «Статистика» (4 карточки) включает «Всего обращений» — это **сигнал**, а не просто дубль таб-счётчика.
- BudgetType с иконкой уже отображается на карточке.

---

## 1. Acceptance criteria (общие)

- Критические действия доступны не более чем за 1 клик.
- При активном бусте пользователь видит статус и имеет путь к продлению.
- Бейджи активных бустов показывают остаток дней, а не только тип.
- Состояние фильтра синхронизировано между mobile и desktop и сохраняется в URL.
- Страница корректно обрабатывает все 9 значений `AdStatus` (включая `budget_exhausted`, `cancelled`).
- Нет регрессий: pause/resume/archive/delete/edit/boost работают как раньше.
- Нет эмодзи в UI (использовать иконки `@ant-design/icons`).

---

## 2. Этап 1 — P0. Буст: вынос CTA и days-left

**Цель:** зеркалирование того, что уже сделано в `/creators/manage` (см. [BOOST_PLACEMENT_PLAN.md](./BOOST_PLACEMENT_PLAN.md), Этап 1).

### Задачи

1. **Маппер — сохранить `expiresAt`.**
   - Файл: [lib/mappers/ad.ts:37-39](../lib/mappers/ad.ts#L37-L39).
   - Сейчас режет до `boostType[]`. Добавить параллельное поле `activeBoostDetails: { boostType, activatedAt, expiresAt }[]`.
   - Расширить тип `Ad` в [lib/types/ad.ts](../lib/types/ad.ts).
   - API `/api/tasks/my` уже возвращает `expiresAt` ([app/api/tasks/my/route.ts:36-39](../app/api/tasks/my/route.ts#L36-L39)) — доработок бэка не требуется.

2. **Helper функции** в новом `app/ads/manage/_lib/boost.ts`:
   - `getTopBoost(details)` — высший по приоритету premium > vip > rise.
   - `formatDaysLeft(expiresAt)` — «5 дней», «1 день», «<1 дн.».

3. **Desktop-таблица — вынести CTA из dropdown.**
   - Файл: [app/ads/manage/page.tsx:278-281](../app/ads/manage/page.tsx#L278-L281).
   - Убрать пункт `"boost"` из `menuItems`.
   - В колонке actions — добавить primary-кнопку `Продвинуть` (purple) рядом с `EllipsisOutlined`. При активном бусте — «Продлить» (инверт: фон белый, бордер/текст purple).
   - Ширину колонки увеличить до ~180px.

4. **Desktop — Status-колонка с днями.**
   - Файл: [app/ads/manage/page.tsx:216-232](../app/ads/manage/page.tsx#L216-L232).
   - При активном бусте — `Tag` с иконкой ракеты и лейблом «VIP · 5 дней».

5. **Mobile — не скрывать кнопку при активном бусте.**
   - Файл: [components/ads/AdManagementCard.tsx:168-175](../components/ads/AdManagementCard.tsx#L168-L175).
   - Сейчас условие `!hasBoosts` — заменить на показывать всегда для `status === "active"`, лейбл переключать на «Продлить буст».
   - Перекрасить из dashed-border в primary purple (как у креаторов).

6. **Mobile — бейдж буста с днями.**
   - Файл: [components/ads/AdManagementCard.tsx:127-137](../components/ads/AdManagementCard.tsx#L127-L137).
   - Заменить массив тэгов на один `Tag` «VIP · 5 дней» через `getTopBoost`.

### Acceptance

- CTA буста виден на карточке и в таблице без открытия dropdown.
- При активном бусте в строке/карточке виден бейдж с остатком дней.
- «Продлить» ведёт на существующий `/ads/[id]/boost` — API не меняется.

### Риски

| Риск | Вероятность | Митигация |
|---|---|---|
| Двойная покупка буста поверх активного | средняя | На чекауте `/ads/[id]/boost` показывать «у вас уже есть активный» и предлагать продление (отдельная задача в BOOST_PLACEMENT_PLAN, Этап 3) |
| Длинный лейбл «Premium · 15 дней» ломает верстку на узких карточках | низкая | `white-space: nowrap` + truncate на контейнере; proof на 360px viewport |
| Поле `expiresAt` приходит как string, а не Date | средняя | В маппере унифицировать к ISO-строке (как в creators) |

---

## 3. Этап 2 — P1. Единый стейт фильтра + URL persistence

**Цель:** убрать рассинхрон между мобилкой и десктопом, сохранять состояние при перезагрузке, покрыть новые статусы.

### Задачи

1. Объединить `activeFilter` и `activeTab` в единый `filter: FilterKey` ([page.tsx:67-68](../app/ads/manage/page.tsx#L67-L68)).
2. Сохранять в URL через `useSearchParams` + `router.replace`: `/ads/manage?filter=active`.
3. Жёстко валидировать значение против `FilterKey`, фолбэк на `all`.
4. **Расширить фильтры** с учётом полного `AdStatus`:
   - Добавить `"budget_exhausted"` — группировать с `expired`? Или отдельным тaбом? Решить по данным (см. Этап 5).
   - `"cancelled"` — добавить в `all`, не выделять отдельным табом (редкое состояние).
   - Не показывать `"draft"` и `"pending_payment"` как отдельные табы — они уже покрыты баннером незавершённой оплаты.

### Acceptance

- URL содержит актуальный фильтр, deep-link работает.
- Mobile-чипы и desktop-tabs переключают один и тот же стейт.
- Все значения `AdStatus` где-то отображаются (не теряются).

### Риски

| Риск | Митигация |
|---|---|
| `useSearchParams` требует Suspense (уже есть в [page.tsx:553-558](../app/ads/manage/page.tsx#L553-L558)) | Ничего не делать, Suspense уже обёрнут |
| Невалидный query-параметр | Валидация против `FilterKey`, fallback на `all` |

---

## 4. Этап 3 — P1. Сигналы об активности

**Цель:** превратить карточку объявления из «заголовок + статус» в дашборд состояния рекламной кампании.

### 4.1. Отклики (applications / submissions) — **P3, не в этот рефакторинг**

- Поля `applicationsCount` и `submissionsCount` уже в типе `Ad` и в маппере ([lib/mappers/ad.ts:72-73](../lib/mappers/ad.ts#L72-L73)), но **нигде не отображаются**.
- **Решение (2026-04-18):** проверить git blame. Если причины не найдём — **не возвращаем в этот эпик**. Advertiser-value #1 — освоение эскроу, а не счётчик заявок. Отклики — отдельный next-level дашборд после валидации UX на escrow.

### 4.2. Escrow-бюджет — **P1, главный сигнал этапа** (только для `paymentMode === "escrow"`)

- Поле `escrowAccount` есть в `Ad` ([lib/types/ad.ts](../lib/types/ad.ts)), но не показывается.
- Показать mini progress bar: `spentAmount / initialAmount` с цветом (зелёный > 50%, янтарь 20-50%, красный < 20%).
- При `available < 20%` — инлайн-CTA «Пополнить» → `/ads/[id]/escrow-topup`.
- **Вырезать в отдельный PR** — требует расширения API-ответа полями `escrowAccount.available/initialAmount/spentAmount`, иначе получим over-engineering в одном релизе.

### 4.3. Дедлайн приёма заявок (escrow)

- Поле `submissionDeadline`.
- Показывать «До дедлайна: 3 дн.» или «Дедлайн прошёл» со стилем предупреждения.

### Acceptance

- На карточке и в таблице видны ключевые сигналы: количество откликов, процент освоения эскроу (если применимо).
- Advertiser понимает состояние кампании без клика внутрь.

### Риски

| Риск | Митигация |
|---|---|
| Карточка становится перегруженной | Приоритизировать: отклики — всегда; эскроу — только если `paymentMode === "escrow"`; deadline — только если осталось < 7 дней |
| Extension API для эскроу ломает другие экраны | Добавлять поля как опциональные в маппере |
| `applicationsCount` / `submissionsCount` — были убраны сознательно | Проверить git blame перед возвратом; если сопротивление — оставить только escrow |

---

## 5. Этап 4 — P2. Inline-действия + плотность таблицы

**Цель:** довести таблицу до уровня дашборда.

### 5.1. Inline-иконки в колонке actions

Файл: новый `app/ads/manage/_components/AdRowActions.tsx`.

- `EyeOutlined` — просмотр
- `EditOutlined` — редактировать
- `RocketOutlined` — буст (primary-акцент purple; «Продлить» при активном)
- `PauseOutlined` / `PlayCircleOutlined` — pause/resume (видно для active/paused)
- Overflow (`EllipsisOutlined`): Архивировать, Удалить
- Tooltip на каждую иконку (mouseEnterDelay 0.3s).

### 5.2. Визуальные параметры

- `size="small"` у `<Table>`.
- `pagination={{ pageSize: 20, showSizeChanger: true }}`.
- `scroll={{ x: 900 }}` для узких экранов.
- Skeleton/loading state через проп `loading` (уже частично есть).

### 5.3. Пустое состояние

- Компонент `<Empty>` с CTA «Создать задание» при 0 объявлений.
- Разные тексты для «нет объявлений вообще» и «нет под текущий фильтр».

### Acceptance

- Все критические действия доступны за 1 клик.
- Таблица вмещает ≥8 строк на стандартном окне.
- Empty state c CTA.

### Риски

| Риск | Митигация |
|---|---|
| 5-6 inline-иконок перегружают строку | Скрывать pause/resume — они редко используются; оставить только Eye/Edit/Rocket/Overflow |
| Overflow-меню становится пустым | Скрывать `EllipsisOutlined` если `items.length === 0` |

---

## 6. Этап 5 — P2. Данные: проверить наличие новых статусов

**Цель:** не тратить время на поддержку статусов, которых нет в БД.

### Задачи

1. Выполнить запрос (или через admin-панель): сколько объявлений со статусом `budget_exhausted` и `cancelled` существует сейчас.
2. Если < 1% от всех — не создавать отдельный таб, включить в «Истёкшие».
3. Если появляются регулярно — отдельный фильтр + визуальный бейдж.
4. **Проверить pending-payment для бустов.** Сейчас баннер в [page.tsx:418-455](../app/ads/manage/page.tsx#L418-L455) ловит только публикацию. Запрос: сколько зависших `PaymentSession` с `type='ad_boost' AND status='pending'` за последние 30 дней?

### Acceptance

- Решение «добавлять таб/баннер или нет» принято на основе данных, не предположений.

---

## 7. Этап 6 — P2. Декомпозиция

**Цель:** привести к структуре, аналогичной `/creators/manage` после рефакторинга ([app/creators/manage/_components/](../app/creators/manage/_components/) + [_hooks/](../app/creators/manage/_hooks/)).

### Целевая структура

```
app/ads/manage/
  page.tsx                            // только контейнер + layout
  _components/
    AdTable.tsx                       // десктоп-таблица
    AdCardList.tsx                    // мобильный список
    AdRowActions.tsx                  // inline actions в строке
    AdStatusCell.tsx                  // Status + буст-бейдж + дни
    AdStatsCell.tsx                   // просмотры/обращения/отклики
    PendingPaymentBanner.tsx          // уже существующий баннер
  _hooks/
    useMyAds.ts                       // fetch + payment redirect
    useAdActions.ts                   // pause/resume/archive/delete/publish
  _lib/
    boost.ts                          // getTopBoost, formatDaysLeft
    filter.ts                         // FilterKey, FILTER_STATUSES
```

### Задачи

1. Вынести оба `useEffect` ([page.tsx:75-93, 96-113, 116-126](../app/ads/manage/page.tsx)) в `useMyAds`.
2. Вынести `handleAction` в `useAdActions`.
3. Вынести `columns`, `tabItems` в `AdTable`.
4. `AdManagementCard` уже вынесен → оставить, переименовать в `AdCard` для консистентности (опционально).

### Acceptance

- `page.tsx` ≤ 100 строк.
- Каждый компонент ≤ 250 строк.
- `npm run lint` и `tsc --noEmit` без ошибок.

### Риски

| Риск | Митигация |
|---|---|
| Over-engineering без явной пользы | Декомпозицию делать **только если** этапы 1-5 реально выросли по строкам, а не превентивно |
| Регрессия `Modal.confirm` в промисе | Переписать на отдельную стейт-модалку (как в creators refactor) |

---

## 8. Порядок релизов

| Релиз | Этапы | Оценка | Обязательное условие |
|---|---|---|---|
| R1 | Этап 1 (P0 буст) | 1 день | — |
| R2 | Этап 2 (URL state) + Этап 6 (декомпозиция hooks/actions) | 2 дня | R1 ушёл в прод, нет регрессий |
| R3 | Этап 3 (сигналы) + Этап 5 (проверка данных) | 3 дня | По данным решить, что делать |
| R4 | Этап 4 (inline-actions) + остаток Этапа 6 | 2 дня | R3 валидирован пользователями |

Между релизами — минимум 3 дня на прод.

---

## 9. Прожарка собственного плана

1. **Декомпозиция сама по себе — не цель.** `AdManagementCard` уже вынесен. Дальнейший split делать **только** если handlers и hooks станут реально мешать. Не тащить паттерн `/creators/manage` механически.

2. **Escrow — отдельный эпик, не пихать в manage refactor.** Показ остатка требует расширения API (`escrowAccount.available/spentAmount/initialAmount`), progress-bar компонента, правил предупреждений. Это неделя работы. Вырезать в отдельный PR, иначе план разрастётся до 3-4 недель.

3. **`applicationsCount` / `submissionsCount` — сначала найти причину отсутствия.** Маппер их возвращает, UI игнорирует. Это может быть сознательный выбор (перегруз), а не баг. Перед добавлением — git blame + обсуждение с продуктом.

4. **`budget_exhausted` / `cancelled` в фильтрах** — сначала SQL-запрос: возможно, таких объявлений в БД нет. Оптимизация ради 0 реальных строк — трата времени.

5. **Pending-payment буста** — может быть интересно, но сколько раз это реально случалось? Без baseline (N зависших сессий / месяц) — преждевременно.

6. **«Inline-actions 5-6 иконок» — анти-паттерн.** Если таблица уже делает `scroll={{ x: 900 }}`, добавление 5 иконок сделает её шире. Не больше 3 иконок + overflow. Pause/Resume — в overflow, они редкие.

7. **Срок оптимистичен.** Если делать все 6 этапов — это 2-3 недели ОДНОГО исполнителя без отвлечений. Реалистично — месяц с учётом код-ревью и багов.

8. **Проект не имеет аналитики** (как выяснено ранее). Без неё невозможно измерить эффект «+40% CTR» или «уменьшение time-to-action». До R2 ввести события:
   - `ads_manage_view`
   - `ads_manage_filter_change` (payload: `filter`)
   - `ads_manage_action_click` (payload: `action`, `placement: "inline" | "overflow"`)
   - `ads_manage_boost_cta_click` (payload: `placement`, `has_active_boost`)

---

## 10. Минимальный полезный релиз (MVP)

Если делать **только P0** (зеркало `/creators/manage`):

1. Расширить `lib/mappers/ad.ts` — сохранить `expiresAt` в `activeBoostDetails`.
2. В `AdManagementCard` и desktop-таблице — бейдж «VIP · 5 дней».
3. Desktop actions: вынести primary «Продвинуть» из dropdown (+«Продлить» при активном бусте).
4. Mobile: не скрывать кнопку при активном бусте, переключать лейбл.

**Оценка:** 1 рабочий день.
**Ценность:** ~80% от всего плана.

Остальное (escrow, applications, URL-state, декомпозиция) — отдельными PR после валидации необходимости.

---

## 11. Чек-лист перед мёрджом каждого этапа

- [ ] Нет эмодзи в коде и текстах UI.
- [ ] `npm run lint` — без warnings по изменённым файлам.
- [ ] `tsc --noEmit` — без ошибок.
- [ ] Ручная проверка: preview, edit, publish, unpublish, pause, resume, archive, delete, boost.
- [ ] Ручная проверка mobile и desktop, включая 360px viewport.
- [ ] Ручная проверка пустого состояния (0 объявлений) и полного (10+).
- [ ] Ручная проверка каждого статуса: `draft`, `pending_payment`, `active`, `paused`, `expired`, `archived`, `budget_exhausted`, `cancelled`.
- [ ] Аналитические события отправляются.

---

## 12. Открытые вопросы

- [ ] Сколько в БД объявлений со статусами `budget_exhausted` и `cancelled`?
- [ ] Почему `applicationsCount` / `submissionsCount` не показываются сейчас?
- [ ] Какой процент пользователей переходит на мобильную vs десктоп версию `/ads/manage`?
- [ ] Есть ли случаи двойной оплаты буста на одном объявлении?
- [ ] Нужны ли bulk-actions (массовая пауза/архивация) в этом рефакторинге или отдельным эпиком?
- [ ] Какую аналитическую платформу ставим (PostHog / GA4 / Amplitude)?
