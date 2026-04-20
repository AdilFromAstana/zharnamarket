import type { TrustItem } from "@/lib/home/types";

interface TrustBadgeProps {
  item: TrustItem;
}

export default function TrustBadge({ item }: TrustBadgeProps) {
  const Icon = item.icon;
  return (
    <div className="flex items-start gap-3 bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-sky-50 text-sky-600 shrink-0">
        <Icon className="w-5 h-5" aria-hidden />
      </div>
      <div>
        <div className="text-sm font-semibold text-gray-900">{item.title}</div>
        {item.subtitle && (
          <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">
            {item.subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
