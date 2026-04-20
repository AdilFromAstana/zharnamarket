import TrustBadge from "./TrustBadge";
import { TRUST_STRIP_ITEMS } from "@/lib/home/home-content";

interface TrustStripSectionProps {
  adsCount?: number;
  creatorsCount?: number;
  showCounts?: boolean;
}

export default function TrustStripSection({
  adsCount,
  creatorsCount,
  showCounts,
}: TrustStripSectionProps = {}) {
  const shouldShowCounts =
    showCounts ??
    ((adsCount ?? 0) >= 20 && (creatorsCount ?? 0) >= 20);

  return (
    <section className="mb-10 md:mb-12">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {TRUST_STRIP_ITEMS.map((item) => (
          <TrustBadge key={item.title} item={item} />
        ))}
      </div>

      {shouldShowCounts && (
        <div className="grid grid-cols-2 gap-3 mt-3 max-w-md mx-auto">
          <div className="bg-white rounded-2xl border border-gray-100 p-3 text-center">
            <div className="text-lg md:text-xl font-bold text-gray-900">
              {adsCount}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              активных объявлений
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-3 text-center">
            <div className="text-lg md:text-xl font-bold text-gray-900">
              {creatorsCount}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              авторов контента
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
