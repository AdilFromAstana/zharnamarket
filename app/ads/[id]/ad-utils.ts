import {
  StarOutlined,
  CheckSquareOutlined,
  TagsOutlined,
} from "@ant-design/icons";
import { createElement } from "react";

/** Метка рекламодателя на основе активных бустов */
export function getAdvertiserLabel(boosts?: string[]) {
  if (boosts?.includes("premium"))
    return {
      icon: createElement(StarOutlined),
      text: "Топ рекламодатель",
      color: "gold" as const,
    };
  if (boosts?.includes("rise") || boosts?.includes("vip"))
    return {
      icon: createElement(CheckSquareOutlined),
      text: "Проверенный бизнес",
      color: "blue" as const,
    };
  return {
    icon: createElement(TagsOutlined),
    text: "Рекламодатель",
    color: "default" as const,
  };
}

/** Форматирует оставшееся время до дедлайна */
export function formatTimeLeft(deadline: string | null): string {
  if (!deadline) return "";
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return "Истекло";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days} дн. ${hours % 24} ч.`;
  }
  return `${hours} ч. ${minutes} мин.`;
}
