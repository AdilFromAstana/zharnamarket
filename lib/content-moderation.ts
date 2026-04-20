const RU_STEMS = [
  "хуй",
  "хуе",
  "хуя",
  "хуи",
  "пизд",
  "пизж",
  "ебан",
  "ебат",
  "ебу",
  "ёбан",
  "ёбат",
  "еблан",
  "ебло",
  "ебал",
  "ебуч",
  "бляд",
  "блят",
  "блядь",
  "блин",
  "муда",
  "мудак",
  "мудил",
  "сука",
  "сучк",
  "сучар",
  "пидор",
  "пидар",
  "пидр",
  "гондон",
  "долбо",
  "далбо",
  "залуп",
  "жоп",
  "срань",
  "уёб",
  "уеб",
  "хер",
  "херн",
  "херо",
  "шлюх",
  "шалав",
  "манда",
  "мандав",
  "выебон",
  "наебал",
  "наебк",
  "наебк",
  "пиздец",
  "охуе",
  "охуи",
  "ахуе",
  "охрен",
  "нахуй",
  "нахер",
  "похуй",
  "вхуй",
  "пох",
  "нах",
  "распидор",
  "ебош",
];

const EN_STEMS = [
  "fuck",
  "fuk",
  "fck",
  "shit",
  "bitch",
  "bich",
  "cunt",
  "asshole",
  "bastard",
  "nigger",
  "nigga",
  "faggot",
  "fag",
  "retard",
  "whore",
  "slut",
  "dick",
  "cock",
  "pussy",
];

const LEET_MAP: Record<string, string> = {
  "0": "о",
  "1": "и",
  "3": "е",
  "4": "а",
  "5": "с",
  "6": "б",
  "7": "т",
  "8": "в",
  "@": "а",
  $: "с",
  "!": "и",
};

const LATIN_TO_CYRILLIC: Record<string, string> = {
  a: "а",
  b: "в",
  c: "с",
  e: "е",
  h: "н",
  k: "к",
  m: "м",
  o: "о",
  p: "р",
  t: "т",
  x: "х",
  y: "у",
};

function normalize(raw: string): string {
  if (!raw) return "";
  let s = raw.toLowerCase();
  s = s.replace(/ё/g, "е");

  for (const [from, to] of Object.entries(LEET_MAP)) {
    s = s.split(from).join(to);
  }

  s = s
    .split("")
    .map((ch) => LATIN_TO_CYRILLIC[ch] ?? ch)
    .join("");

  s = s.replace(/[\s\-_.,;:!?*+=~`"'()\[\]{}<>\/\\|#№%^&]/g, "");

  s = s.replace(/(.)\1{2,}/g, "$1$1");

  return s;
}

export function containsProfanity(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const normalized = normalize(raw);
  if (!normalized) return false;

  const normalizedLatin = raw
    .toLowerCase()
    .replace(/(.)\1{2,}/g, "$1$1")
    .replace(/[\s\-_.,;:!?*+=~`"'()\[\]{}<>\/\\|#№%^&]/g, "");

  for (const stem of RU_STEMS) {
    if (normalized.includes(stem)) return true;
  }
  for (const stem of EN_STEMS) {
    if (normalizedLatin.includes(stem)) return true;
  }
  return false;
}

export function validateProfanityFields(
  fields: Record<string, string | null | undefined>,
): string | null {
  for (const [name, value] of Object.entries(fields)) {
    if (containsProfanity(value)) {
      return `Поле «${name}» содержит недопустимые слова. Отредактируйте текст.`;
    }
  }
  return null;
}
