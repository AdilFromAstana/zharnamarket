import { prisma } from "@/lib/prisma";

const CITY_LABELS: Record<string, string> = {
  Almaty: "Алматы",
  Astana: "Астана",
  Shymkent: "Шымкент",
  Karaganda: "Караганда",
  Aktau: "Актау",
  Pavlodar: "Павлодар",
  AllCities: "Все города",
};

const CATEGORY_LABELS: Record<string, string> = {
  KinoNarezki: "Кино-нарезки",
  Memy: "Мемы",
  Obzory: "Обзоры",
  Podkasty: "Подкасты",
  Geympley: "Геймплей",
  MuzykaAtmosfera: "Музыка/Атмосфера",
  Avto: "Авто",
  Krasota: "Красота",
  Sport: "Спорт",
  Multfilmy: "Мультфильмы",
};

export async function cityId(key: string): Promise<string> {
  const r = await prisma.city.upsert({
    where: { key },
    update: {},
    create: { key, label: CITY_LABELS[key] ?? key },
  });
  return r.id;
}

export async function categoryId(key: string): Promise<string> {
  const r = await prisma.category.upsert({
    where: { key },
    update: {},
    create: { key, label: CATEGORY_LABELS[key] ?? key },
  });
  return r.id;
}
