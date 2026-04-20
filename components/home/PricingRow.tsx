import { cn } from "@/lib/utils";

interface PricingRowProps {
  title: string;
  price: string;
  subtitle?: string;
  features?: string[];
  badge?: string;
  featured?: boolean;
  size?: "lg" | "md";
}

export default function PricingRow({
  title,
  price,
  subtitle,
  features,
  badge,
  featured = false,
  size = "md",
}: PricingRowProps) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border p-5 bg-white h-full flex flex-col",
        featured
          ? "border-amber-300 shadow-md ring-1 ring-amber-200"
          : "border-gray-100",
      )}
    >
      {badge && (
        <div className="absolute -top-2 right-4 bg-amber-400 text-amber-950 text-xs font-semibold px-2 py-0.5 rounded-full">
          {badge}
        </div>
      )}
      <div className="text-sm font-semibold text-gray-500 mb-1">{title}</div>
      <div
        className={cn(
          "font-bold text-gray-900 mb-1",
          size === "lg" ? "text-3xl md:text-4xl" : "text-2xl",
        )}
      >
        {price}
      </div>
      {subtitle && (
        <div className="text-sm text-gray-500 mb-3">{subtitle}</div>
      )}
      {features && features.length > 0 && (
        <ul className="space-y-1.5 mt-auto">
          {features.map((f) => (
            <li key={f} className="text-xs text-gray-600 leading-relaxed">
              · {f}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
