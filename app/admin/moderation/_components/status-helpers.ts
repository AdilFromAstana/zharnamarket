import { formatDate, formatRelative } from "@/lib/utils";

export const AD_STATUS_CONFIG: Record<
  string,
  { label: string; dot: string; text: string; bg: string }
> = {
  draft: {
    label: "Черновик",
    dot: "bg-gray-400",
    text: "text-gray-600",
    bg: "bg-gray-50",
  },
  active: {
    label: "Активно",
    dot: "bg-green-500",
    text: "text-green-700",
    bg: "bg-green-50",
  },
  paused: {
    label: "Пауза",
    dot: "bg-amber-500",
    text: "text-amber-700",
    bg: "bg-amber-50",
  },
  expired: {
    label: "Истекло",
    dot: "bg-red-500",
    text: "text-red-700",
    bg: "bg-red-50",
  },
  archived: {
    label: "Архив",
    dot: "bg-purple-400",
    text: "text-purple-600",
    bg: "bg-purple-50",
  },
  pending_payment: {
    label: "Ждёт оплаты",
    dot: "bg-amber-400",
    text: "text-amber-700",
    bg: "bg-amber-50",
  },
  deleted: {
    label: "Удалено",
    dot: "bg-red-500",
    text: "text-red-700",
    bg: "bg-red-50",
  },
};

export function getAdStatus(status: string) {
  return (
    AD_STATUS_CONFIG[status] ?? {
      label: status,
      dot: "bg-gray-400",
      text: "text-gray-600",
      bg: "bg-gray-50",
    }
  );
}

export function smartDate(date: string | null): string {
  if (!date) return "—";
  const diffDays = Math.floor(
    (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays < 7) return formatRelative(date);
  return formatDate(date);
}
