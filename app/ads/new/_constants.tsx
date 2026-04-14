import {
  YoutubeOutlined,
  CameraOutlined,
  PlaySquareOutlined,
  DollarOutlined,
  EyeOutlined,
  PercentageOutlined,
  MessageOutlined,
} from "@ant-design/icons";
import type { BudgetType } from "@/lib/types/ad";
import type { PaymentMethod } from "@/lib/types/payment";

export const PLATFORMS = ["TikTok", "Instagram", "YouTube"];

export const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  TikTok: <PlaySquareOutlined />,
  Instagram: <CameraOutlined />,
  YouTube: <YoutubeOutlined />,
};

/** Опции для выбора модели оплаты блогеру */
export const BUDGET_TYPE_OPTIONS: {
  value: BudgetType;
  icon: React.ReactNode;
  label: string;
  hint: string;
  placeholder?: string;
}[] = [
  {
    value: "fixed",
    icon: <DollarOutlined />,
    label: "Фиксированная сумма за видео",
    hint: "Укажите диапазон — это помогает авторам понять, стоит ли откликаться",
  },
  {
    value: "per_views",
    icon: <EyeOutlined />,
    label: "За просмотры",
    hint: "Вы платите зависимо от количества просмотров — договоритесь напрямую",
    placeholder: "Например: 5,000 ₸ за каждые 100,000 просмотров",
  },
  {
    value: "revenue",
    icon: <PercentageOutlined />,
    label: "Процент от продаж",
    hint: "Автор получает % с покупок по его ссылке или промокоду — считаете сами",
    placeholder: "Например: 10% с каждой покупки по промокоду CREATOR10",
  },
  {
    value: "negotiable",
    icon: <MessageOutlined />,
    label: "Обсудим индивидуально",
    hint: "Напишите в Telegram — договоритесь на месте",
  },
];

export const PROVIDER_PAYMENT_METHODS: {
  id: PaymentMethod;
  label: string;
  desc: string;
}[] = [
  { id: "kaspi", label: "Kaspi Pay", desc: "Быстрая оплата через приложение" },
  { id: "halyk", label: "Halyk Bank", desc: "Онлайн-оплата через Halyk" },
  { id: "card", label: "Банковская карта", desc: "Visa / Mastercard / МИР" },
];
