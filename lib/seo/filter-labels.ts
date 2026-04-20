import { ENUM_TO_CITY, ENUM_TO_CATEGORY } from "@/lib/enum-maps";

export function cityLabel(code: string): string {
  return ENUM_TO_CITY[code] ?? code;
}

/** City name in prepositional case (for phrases like "в Астане", "в Шымкенте"). */
const CITY_PREPOSITIONAL: Record<string, string> = {
  Almaty: "Алматы",
  Astana: "Астане",
  Shymkent: "Шымкенте",
  Karaganda: "Караганде",
  Aktau: "Актау",
  Pavlodar: "Павлодаре",
};

export function cityPrepLabel(code: string): string {
  return CITY_PREPOSITIONAL[code] ?? cityLabel(code);
}

export function categoryLabel(code: string): string {
  return ENUM_TO_CATEGORY[code] ?? code;
}

export function platformLabel(code: string): string {
  return code;
}

/** Format a filter list as "X" / "X и Y" / falls back to count for 3+. */
function joinOrCount(items: string[], noun: string): string | null {
  if (items.length === 0) return null;
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} и ${items[1]}`;
  return `${items.length} ${noun}`;
}

interface AdsMetaInput {
  cities: string[];
  platforms: string[];
  categories: string[];
  page: number;
}

export function buildAdsMeta({
  cities,
  platforms,
  categories,
  page,
}: AdsMetaInput) {
  const cityNames = cities.map(cityPrepLabel);
  const platformNames = platforms.map(platformLabel);
  const categoryNames = categories.map(categoryLabel);

  const cityPart = joinOrCount(cityNames, "городов");
  const platformPart = joinOrCount(platformNames, "платформ");
  const categoryPart = joinOrCount(categoryNames, "категорий");

  let title = "Объявления";
  if (platformPart && cityPart) {
    title = `Реклама через ${platformPart} в ${cityPart}`;
  } else if (cityPart) {
    title = `Реклама в ${cityPart}`;
  } else if (platformPart) {
    title = `Реклама через ${platformPart}`;
  } else if (categoryPart) {
    title = `Реклама — категория ${categoryPart}`;
  }

  const pageSuffix = page > 1 ? ` — Страница ${page}` : "";
  const fullTitle = `${title}${pageSuffix} — Zharnamarket`;

  const descParts: string[] = [];
  if (platformPart) descParts.push(`для ${platformPart}`);
  if (cityPart) descParts.push(`в ${cityPart}`);
  if (categoryPart) descParts.push(`категория: ${categoryPart}`);
  const descSuffix = descParts.length ? ` ${descParts.join(", ")}.` : "";

  const description = `Рекламные задания от бизнеса Казахстана${descSuffix} Вирусные ролики, обзоры, сторителлинг, продакт-плейсмент. Прямой контакт с рекламодателем без посредников.${pageSuffix}`;

  return { title: fullTitle, description };
}

interface CreatorsMetaInput {
  cities: string[];
  platforms: string[];
  categories: string[];
  page: number;
}

export function buildCreatorsMeta({
  cities,
  platforms,
  categories,
  page,
}: CreatorsMetaInput) {
  const cityNames = cities.map(cityPrepLabel);
  const platformNames = platforms.map(platformLabel);
  const categoryNames = categories.map(categoryLabel);

  const cityPart = joinOrCount(cityNames, "городов");
  const platformPart = joinOrCount(platformNames, "платформ");
  const categoryPart = joinOrCount(categoryNames, "категорий");

  let title = "Каталог авторов видеоконтента";
  if (platformPart && cityPart) {
    title = `Авторы ${platformPart} в ${cityPart}`;
  } else if (cityPart) {
    title = `Авторы видеоконтента в ${cityPart}`;
  } else if (platformPart) {
    title = `Авторы ${platformPart}`;
  } else if (categoryPart) {
    title = `Авторы — категория ${categoryPart}`;
  }

  const pageSuffix = page > 1 ? ` — Страница ${page}` : "";
  const fullTitle = `${title}${pageSuffix} — Zharnamarket`;

  const descParts: string[] = [];
  if (platformPart) descParts.push(`для ${platformPart}`);
  if (cityPart) descParts.push(`в ${cityPart}`);
  if (categoryPart) descParts.push(`категория: ${categoryPart}`);
  const descSuffix = descParts.length ? ` ${descParts.join(", ")}.` : "";

  const description = `Авторы видеорекламы в Казахстане${descSuffix} Вирусные ролики, обзоры, сторителлинг, продакт-плейсмент. Портфолио, отзывы, рейтинги — прямой контакт без посредников.${pageSuffix}`;

  return { title: fullTitle, description };
}
