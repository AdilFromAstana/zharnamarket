/**
 * Маппинг между русскими строками (фронтенд) и Prisma enum-ключами (БД).
 * Фронт шлёт "Алматы", Prisma ожидает "Almaty".
 */

export const CITY_TO_ENUM: Record<string, string> = {
  Алматы: "Almaty",
  Астана: "Astana",
  Шымкент: "Shymkent",
  Караганда: "Karaganda",
  Актау: "Aktau",
  Павлодар: "Pavlodar",
  "Все города": "AllCities",
};

export const CATEGORY_TO_ENUM: Record<string, string> = {
  "Кино-нарезки": "KinoNarezki",
  Мемы: "Memy",
  Обзоры: "Obzory",
  Подкасты: "Podkasty",
  Геймплей: "Geympley",
  "Музыка/Атмосфера": "MuzykaAtmosfera",
  Авто: "Avto",
  Красота: "Krasota",
  Спорт: "Sport",
  Мультфильмы: "Multfilmy",
};

/** Конвертировать строку города → Prisma enum-ключ */
export function toDbCity(city: string): string {
  return CITY_TO_ENUM[city] ?? city;
}

/** Конвертировать строку категории → Prisma enum-ключ */
export function toDbCategory(category: string): string {
  return CATEGORY_TO_ENUM[category] ?? category;
}

/** Конвертировать Prisma enum-ключ → русская строка города */
export const ENUM_TO_CITY: Record<string, string> = Object.fromEntries(
  Object.entries(CITY_TO_ENUM).map(([k, v]) => [v, k]),
);

/** Конвертировать Prisma enum-ключ → русская строка категории */
export const ENUM_TO_CATEGORY: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_TO_ENUM).map(([k, v]) => [v, k]),
);
