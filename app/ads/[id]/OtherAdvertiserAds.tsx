import Link from "next/link";
import type { Ad } from "@/lib/types/ad";
import { ENUM_TO_CATEGORY, ENUM_TO_CITY } from "@/lib/enum-maps";

export default function OtherAdvertiserAds({ ads }: { ads: Ad[] }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-5 md:p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Другие задания заказчика
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {ads.map((a) => (
          <Link
            key={a.id}
            href={`/ads/${a.id}`}
            className="flex flex-col gap-1 p-3 rounded-xl border border-gray-200 hover:border-sky-300 hover:bg-sky-50/40 transition-colors"
          >
            <div className="text-sm font-semibold text-gray-900 line-clamp-2">
              {a.title}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {ENUM_TO_CATEGORY[a.category] ?? a.category}
              {a.city ? ` · ${ENUM_TO_CITY[a.city] ?? a.city}` : ""}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
