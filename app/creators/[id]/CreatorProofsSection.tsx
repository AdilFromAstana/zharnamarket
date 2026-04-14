import { EyeOutlined, BarChartOutlined } from "@ant-design/icons";
import { formatFollowers } from "@/lib/utils";
import { PLATFORM_COLORS } from "@/lib/constants";
import { ENUM_TO_CATEGORY } from "@/lib/enum-maps";
import type { CreatorProfile } from "@/lib/types/creator";

type PortfolioItem = CreatorProfile["portfolio"][number];

interface CreatorProofsSectionProps {
  portfolio: PortfolioItem[];
}

export default function CreatorProofsSection({
  portfolio,
}: CreatorProofsSectionProps) {
  const itemsWithViews = portfolio.filter((item) => item.views);

  if (itemsWithViews.length === 0) return null;

  return (
    <div className="md:bg-white md:rounded-2xl md:border md:border-gray-200 md:p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
        <BarChartOutlined className="text-sky-500" /> Скрины / Пруфы
      </h2>
      <p className="text-xs text-gray-400 mb-4">
        Количество просмотров по каждой работе
      </p>
      <div className="flex overflow-x-auto gap-3 pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-200">
        {itemsWithViews.map((item) => (
          <div
            key={item.id}
            className="shrink-0 w-44 sm:w-48 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 snap-start"
          >
            <div className="aspect-[9/16] relative overflow-hidden bg-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.thumbnail}
                alt={
                  item.description ||
                  `${item.platform} · ${ENUM_TO_CATEGORY[item.category] ?? item.category}`
                }
                className="w-full h-full object-cover opacity-80"
              />
              {/* Overlay with stats */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10 flex flex-col justify-between p-2.5">
                <div
                  className="self-start px-2 py-0.5 rounded text-xs font-semibold text-white"
                  style={{ background: PLATFORM_COLORS[item.platform] }}
                >
                  {item.platform}
                </div>
                <div>
                  <div className="text-white/70 text-xs mb-0.5">
                    просмотров
                  </div>
                  <div className="text-white font-bold text-2xl leading-none drop-shadow">
                    {formatFollowers(item.views!)}
                  </div>
                </div>
              </div>
            </div>
            <div className="px-2.5 py-2">
              <p className="text-xs text-gray-500 line-clamp-2 leading-tight">
                {item.description ??
                  `${item.platform} · ${ENUM_TO_CATEGORY[item.category] ?? item.category}`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
