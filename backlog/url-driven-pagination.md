# URL-driven пагинация и фильтры

**Статус:** backlog
**Приоритет:** HIGH (SEO)
**Затрагивает:** AdsListClient, CreatorsListClient, SEOPagination

---

## Проблема

Сейчас `AdsListClient` и `CreatorsListClient` работают по схеме **"SSR seed → клиент берёт управление"**. URL — косметический, не источник правды. Пагинация рендерит `<Link>` с `e.preventDefault()` — ссылка есть в HTML (краулер видит), но без JS переход не работает. Client-fetch дублирует серверную логику через API-роут.

---

## Что убираем и почему

### 1. `fetchAds` / `fetchCreators` — client-fetch через API

- `app/ads/AdsListClient.tsx:169-234` — `fetch("/api/tasks?...")`
- `app/creators/CreatorsListClient.tsx:141-176` — `fetch("/api/creators?...")`

**Почему:** серверная страница (`page.tsx`) уже делает ту же работу через Prisma напрямую. Client-fetch дублирует логику через API-роут, который ходит в ту же БД. Два пути получения данных — лишняя сложность.

### 2. `useState` для filters, page, totalPages, totalCount, facets

- `app/ads/AdsListClient.tsx:120-131` — 6 useState
- `app/creators/CreatorsListClient.tsx:104-115` — 6 useState

**Почему:** дублирование серверного состояния. Серверная страница уже парсит searchParams, делает запрос и передаёт `initialData`, `initialFilters`, `currentPage`, `totalPages`, `totalCount`, `initialFacets` как пропсы. Client state их копирует и потом живёт своей жизнью — два источника правды.

### 3. `isSyncingFromServer` ref + sync effect

- `app/ads/AdsListClient.tsx:142-162`
- `app/creators/CreatorsListClient.tsx:123-138`

**Почему:** этот механизм существует только для координации двух источников правды (server props vs client state). Когда Next.js переиспользует компонент при навигации через `<Link>`, пропсы обновляются, но клиентский state — нет. `isSyncingFromServer` принудительно сбрасывает state из пропсов, блокируя filters effect от лишнего fetch. Если URL = единственный источник, этой проблемы нет.

### 4. `routerRef` hack

- `app/ads/AdsListClient.tsx:111-118`
- `app/creators/CreatorsListClient.tsx:98-102`

**Почему:** `routerRef` нужен чтобы `fetchAds`/`fetchCreators` был стабильной ссылкой и не попадал в зависимости useEffect. Без client-fetch — не нужен.

### 5. `e.preventDefault()` в SEOPagination

- `components/ads/SEOPagination.tsx:105-108`

**Почему:** без `onPageChange` нет причины блокировать нативный переход. `<Link>` работает как обычная ссылка.

---

## Что вместо этого

Клиентский компонент становится "тупым рендерером" — получает данные из пропсов, рендерит. Взаимодействие пользователя = изменение URL.

### 1. Фильтры → `router.push(buildURL(newFilters, 1))`

**Было:**
```ts
// AdsListClient.tsx:120
const [filters, setFilters] = useState<AdFilters>(initialFilters ?? {});
// Изменение фильтра → setFilters → useEffect → fetchAds → router.replace
```

**Станет:**
```ts
const filters = initialFilters ?? {};

const handleFiltersChange = (newFilters: AdFilters) => {
  router.push(buildURL(newFilters, 1), { scroll: false });
};
```

`buildURL` (AdsListClient.tsx:43-66) уже существует и корректно сериализует все фильтры с запятыми. Переиспользуем как есть.

### 2. Пагинация → обычный `<Link>` без preventDefault

**Было:**
```tsx
// SEOPagination.tsx — onClick с preventDefault
onClick={(e) => {
  if (onPageChange) {
    e.preventDefault();
    onPageChange(page);
  }
  scrollToTop();
}}
```

**Станет:**
```tsx
// SEOPagination.tsx — обычная ссылка
onClick={() => scrollToTop()}
// href правильный: /ads?city=Almaty,Astana&page=2
// Next.js Link делает soft navigation → server component re-render
```

Проп `onPageChange` убирается из SEOPagination. `searchParams` передаётся для построения правильных href.

### 3. Loading state → `loading.tsx`

**Было:** `useState(false)` + `setLoading(true)` перед fetch.

**Станет:** `app/ads/loading.tsx` и `app/creators/loading.tsx` со скелетонами. Next.js автоматически показывает их при server navigation.

### 4. Search debounce — единственное что остаётся клиентским

```ts
const [searchText, setSearchText] = useState(initialFilters?.search ?? "");

useEffect(() => {
  const timer = setTimeout(() => {
    const newFilters = { ...filters, search: searchText || undefined };
    router.push(buildURL(newFilters, 1), { scroll: false });
  }, 400);
  return () => clearTimeout(timer);
}, [searchText]);
```

Локальный state только для текста в input. Всё остальное — из URL.

---

## Почему замена правильная

1. **Серверная страница уже всё умеет.** `ads/page.tsx` парсит searchParams, делает Prisma query с фильтрами, faceted counts, пагинацией, бустом — и передаёт готовые данные.
2. **`buildURL` уже корректно строит URL.** Мультиселект через `.join(",")`, page=1 без `?page=1`.
3. **SEOPagination уже строит правильные href.** `hrefFor` учитывает `searchParams`.
4. **SSR HTML сразу содержит данные.** Googlebot получает полный контент без JS. Ссылки пагинации — настоящие `<a href>`.

---

## Порядок выполнения

1. Создать `app/ads/loading.tsx` и `app/creators/loading.tsx` со скелетонами
2. Рефакторить `AdsListClient` — убрать client state/fetch, фильтры через `router.push`
3. Рефакторить `CreatorsListClient` — аналогично
4. Убрать `onPageChange` из `SEOPagination`, убрать `preventDefault()`
5. Проверить что `AdFiltersComponent` и `CreatorFiltersComponent` работают с callback вместо `setFilters`
6. Тест: убедиться что `curl /ads?city=Almaty&page=2` возвращает правильный HTML

---

## Файлы которые будут затронуты

| Файл | Что меняется |
|------|-------------|
| `app/ads/AdsListClient.tsx` | Убрать useState/fetchAds/isSyncingFromServer/routerRef, фильтры через router.push |
| `app/creators/CreatorsListClient.tsx` | Аналогично |
| `components/ads/SEOPagination.tsx` | Убрать onPageChange проп, убрать preventDefault() |
| **Создать:** `app/ads/loading.tsx` | Skeleton UI |
| **Создать:** `app/creators/loading.tsx` | Skeleton UI |
