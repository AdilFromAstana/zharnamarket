import { DollarSign, Eye, TrendingUp, MessageCircle } from "lucide-react";
import type { BudgetType } from "@/lib/types/ad";

interface BudgetTypeIconProps {
  type: BudgetType;
  size?: number;
  className?: string;
}

export default function BudgetTypeIcon({ type, size = 10, className = "shrink-0" }: BudgetTypeIconProps) {
  switch (type) {
    case "fixed":
      return <DollarSign size={size} className={className} />;
    case "per_views":
      return <Eye size={size} className={className} />;
    case "revenue":
      return <TrendingUp size={size} className={className} />;
    case "negotiable":
      return <MessageCircle size={size} className={className} />;
    default:
      return null;
  }
}
