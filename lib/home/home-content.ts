import {
  BadgeCheck,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Film,
  Gamepad2,
  GraduationCap,
  Handshake,
  Laugh,
  MessageCircle,
  Mic,
  Package,
  Pencil,
  Radio,
  ScrollText,
  Search,
  Sparkles,
  Star,
  User,
  UserPlus,
  Users,
  Video,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type {
  HeroCopy,
  HomeHeroVariant,
  HowItWorksStep,
  RoleCtaContent,
  Testimonial,
  TrustItem,
  VideoFormatCard,
} from "./types";

export const HERO_COPY_VARIANTS: Record<HomeHeroVariant, HeroCopy> = {
  A: {
    eyebrow: "Маркетплейс видеорекламы в Казахстане",
    headline: "Видеореклама в Казахстане — ",
    highlight: "без агентств",
    subheadline:
      "Бизнес публикует задачу за 990 ₸. Автор контента откликается напрямую — без посредников и комиссий со сделки.",
  },
  B: {
    eyebrow: "Видео для бизнеса и авторов",
    headline: "Найди автора видео за час. ",
    highlight: "Или задачу под свои соцсети",
    subheadline:
      "Маркетплейс UGC, обзоров, хуков и продакт-плейсмента в TikTok, Instagram и YouTube. Прямые контакты, без комиссии со сделки.",
  },
  C: {
    eyebrow: "Зарегистрируйтесь за минуту",
    headline: "Вы бизнес или создаёте видео? — ",
    highlight: "Выберите сторону",
    subheadline:
      "Одна платформа для тех, кто заказывает рекламу, и для тех, кто её снимает. Алматы, Астана, Шымкент и вся страна.",
  },
};

export const HERO_ROLES: { business: RoleCtaContent; creator: RoleCtaContent } =
  {
    business: {
      icon: Briefcase,
      title: "Я бизнес",
      subtitle: "Нужна видеореклама",
      bullets: [
        "Объявление — 990 ₸",
        "Отклики напрямую от авторов",
        "Публикация активна 7 дней",
      ],
      href: "/ads/new",
      cta: "Разместить объявление",
    },
    creator: {
      icon: Video,
      title: "Я создаю контент",
      subtitle: "Снимаю видео-рекламу",
      bullets: [
        "Профиль бесплатно",
        "Прямой контакт с бизнесом",
        "Без комиссии со сделки",
      ],
      href: "/creators/new",
      cta: "Создать профиль",
    },
  };

export const TRUST_STRIP_ITEMS: TrustItem[] = [
  {
    icon: Users,
    title: "Без посредников",
    subtitle: "Бизнес и автор общаются напрямую",
  },
  {
    icon: Wallet,
    title: "Без комиссии со сделки",
    subtitle: "Платформа не берёт процент",
  },
  {
    icon: BadgeCheck,
    title: "Верификация",
    subtitle: "Проверка бизнеса и авторов контента",
  },
  {
    icon: Video,
    title: "TikTok · Instagram · YouTube",
    subtitle: "Работаем под все ключевые соцсети",
  },
];

export const HOW_IT_WORKS_BUSINESS: HowItWorksStep[] = [
  {
    icon: Pencil,
    title: "Опишите задачу",
    description:
      "Формат, бюджет, платформа, город. Займёт 2 минуты в конструкторе объявления.",
  },
  {
    icon: Wallet,
    title: "Оплатите 990 ₸",
    description:
      "Онлайн-оплата на сайте. Публикация активна 7 дней после оплаты.",
  },
  {
    icon: MessageCircle,
    title: "Получите отклики",
    description:
      "Авторы контента пишут напрямую в чат. Выбирайте, кто подходит по стилю и бюджету.",
  },
  {
    icon: Handshake,
    title: "Договоритесь напрямую",
    description:
      "Условия, сроки и оплату обсуждаете с автором сами. Платформа не берёт комиссию со сделки.",
  },
];

export const HOW_IT_WORKS_CREATOR: HowItWorksStep[] = [
  {
    icon: UserPlus,
    title: "Создайте профиль бесплатно",
    description:
      "Портфолио, соцсети, прайс-лист и форматы. Публикация без срока истечения.",
  },
  {
    icon: Search,
    title: "Найдите задачу",
    description:
      "Фильтры по формату, городу, платформе и бюджету. Новые объявления каждый день.",
  },
  {
    icon: Video,
    title: "Откликнитесь и снимите",
    description:
      "Переписка с бизнесом напрямую. Договариваетесь об условиях без посредников.",
  },
  {
    icon: CheckCircle2,
    title: "Получите оплату",
    description:
      "Условия оплаты обсуждаете с бизнесом напрямую. Платформа не берёт комиссию со сделки.",
  },
];

export const TESTIMONIALS_FALLBACK: Testimonial[] = [
  {
    author: "Владелец кофейни",
    role: "Алматы",
    text: "Разместил одно объявление на 990 ₸ — за день пришло 6 откликов от авторов из Алматы. Выбрал двоих, оба сняли ролики для TikTok, получили рост заказов на выходные.",
  },
  {
    author: "UGC-автор",
    role: "Астана",
    text: "Профиль бесплатный, заказы идут напрямую без агентства. За месяц снял 4 ролика для местных брендов. Удобно, что всё общение в одном месте.",
  },
  {
    author: "Маркетолог агентства",
    role: "Шымкент",
    text: "Использую как замену Instagram-директу: все авторы в одном месте, с портфолио и прайсом. Экономит день работы по каждому брифу.",
  },
];

const VIDEO_FORMAT_ICON_MAP: Record<string, LucideIcon> = {
  FilmClips: Film,
  PodcastClips: Mic,
  Memes: Laugh,
  Blog: BookOpen,
  Reviews: Star,
  StreamClips: Radio,
  Gameplay: Gamepad2,
  StoryBackground: ScrollText,
  ProductReview: Package,
  TalkingHead: User,
  Tutorial: GraduationCap,
  Animation: Sparkles,
};

export function getVideoFormatIcon(key: string): LucideIcon {
  return VIDEO_FORMAT_ICON_MAP[key] ?? Sparkles;
}

export const VIDEO_FORMATS_FALLBACK: VideoFormatCard[] = [
  {
    key: "ProductReview",
    label: "Обзоры товара",
    description: "Распаковки и честные отзывы на продукт в кадре.",
  },
  {
    key: "TalkingHead",
    label: "Говорящая голова",
    description: "Прямая камера, рассказ о бренде или услуге от автора.",
  },
  {
    key: "Reviews",
    label: "Обзоры",
    description: "Подробные ролики с экспертной подачей и оценкой.",
  },
  {
    key: "Tutorial",
    label: "Туториалы",
    description: "Пошаговое обучение: как пользоваться продуктом.",
  },
  {
    key: "Memes",
    label: "Мемы и юмор",
    description: "Вирусный формат с лёгкой подачей и шуткой.",
  },
  {
    key: "Blog",
    label: "Блог-влог",
    description: "Рассказ от первого лица с нативной интеграцией.",
  },
  {
    key: "FilmClips",
    label: "Кино-нарезки",
    description: "Короткие ролики с кинематографичной подачей.",
  },
  {
    key: "Animation",
    label: "Анимация",
    description: "Моушен-графика, AI-видео, анимированные ролики.",
  },
  {
    key: "StoryBackground",
    label: "Сторителлинг",
    description: "История с рекламой на фоне, мягкое погружение.",
  },
  {
    key: "Gameplay",
    label: "Геймплей",
    description: "Игровые ролики с интеграцией продукта.",
  },
  {
    key: "PodcastClips",
    label: "Подкасты",
    description: "Короткие нарезки из подкастов с упоминанием бренда.",
  },
  {
    key: "StreamClips",
    label: "Стрим-клипы",
    description: "Моменты из стримов с упоминанием продукта.",
  },
];

export const FINAL_CTA_HEADLINE =
  "Начните сегодня — первые отклики обычно приходят в течение суток";

export const FINAL_CTA_SUBTEXT =
  "Публикация на 7 дней · Прямой контакт с авторами · Без комиссии со сделки";
