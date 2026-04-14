import type { BudgetType } from "@/lib/types/ad";

export type PaymentMode = "direct" | "escrow";

export type FormValues = {
  title: string;
  platform: string;
  city: string;
  category: string;
  description: string;
  budgetType: BudgetType | null;
  budgetFrom: number | null;
  budgetTo: number | null;
  budgetDetails: string;
  telegram: string;
  whatsapp: string;
  // New category dimensions
  videoFormatId: string | null;
  adFormatId: string | null;
  adSubjectId: string | null;
  // Escrow fields
  paymentMode: PaymentMode;
  rpm: number | null;
  totalBudget: number | null;
  minViews: number | null;
  maxViewsPerCreator: number | null;
  submissionDeadline: string;
};

export const EMPTY_FORM: FormValues = {
  title: "",
  platform: "",
  city: "",
  category: "",
  description: "",
  budgetType: null,
  budgetFrom: null,
  budgetTo: null,
  budgetDetails: "",
  telegram: "",
  whatsapp: "",
  videoFormatId: null,
  adFormatId: null,
  adSubjectId: null,
  paymentMode: "direct",
  rpm: null,
  totalBudget: null,
  minViews: null,
  maxViewsPerCreator: null,
  submissionDeadline: "",
};

export type Step0Values = {
  displayName: string;
  telegram: string;
};

export type CategoryOption = {
  id: string;
  key: string;
  label: string;
  icon?: string | null;
  description?: string | null;
};

export type PromoResult = {
  valid: boolean;
  discountAmount?: number;
  finalAmount?: number;
  discountType?: string;
  discountValue?: number;
  message?: string;
};

/** Форматирует бюджет для отображения в превью и карточке */
export function formatBudgetPreview(
  budgetType: BudgetType | null | undefined,
  budgetFrom: number | null | undefined,
  budgetTo: number | null | undefined,
  budgetDetails: string | null | undefined,
): string {
  if (!budgetType) return "Не указано";
  if (budgetType === "negotiable") return "Обсудим";
  if (budgetType === "per_views")
    return `За просмотры: ${budgetDetails || "—"}`;
  if (budgetType === "revenue") return `% от продаж: ${budgetDetails || "—"}`;
  if (budgetType === "fixed") {
    const from = budgetFrom
      ? `от ${Number(budgetFrom).toLocaleString("ru")} ₸`
      : "";
    const to = budgetTo ? ` до ${Number(budgetTo).toLocaleString("ru")} ₸` : "";
    return `${from}${to}`.trim() || "—";
  }
  return "—";
}
