import Link from "next/link";
import { Button } from "antd";
import { ArrowRightOutlined } from "@ant-design/icons";
import type { Ad } from "@/lib/types/ad";
import { ENUM_TO_CATEGORY } from "@/lib/enum-maps";
import RelatedAdCard from "@/components/ads/RelatedAdCard";
import AdCard from "@/components/ads/AdCard";

interface AdRelatedSectionProps {
  ad: Ad;
  relatedAds: Ad[];
}

export default function AdRelatedSection({
  ad,
  relatedAds,
}: AdRelatedSectionProps) {
  if (relatedAds.length === 0) return null;

  return (
    <div className="mt-8 w-full lg:w-8/12">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-gray-900">
            Похожие объявления
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {ad.platform} ·{" "}
            {ad.videoFormat?.label ??
              ENUM_TO_CATEGORY[ad.category] ??
              ad.category}
          </p>
        </div>
        <Link
          href={`/ads?platform=${encodeURIComponent(ad.platform)}&category=${encodeURIComponent(ad.category)}`}
        >
          <Button
            type="text"
            size="small"
            icon={<ArrowRightOutlined />}
            iconPlacement="end"
            className="text-gray-500 hover:text-gray-800"
          >
            Смотреть все
          </Button>
        </Link>
      </div>

      {/* Mobile: compact list */}
      <div className="flex lg:hidden flex-col">
        {relatedAds.map((related) => (
          <RelatedAdCard key={related.id} ad={related} />
        ))}
      </div>

      {/* Desktop: full cards */}
      <div className="hidden lg:flex flex-col gap-4">
        {relatedAds.map((related) => (
          <AdCard key={related.id} ad={related} />
        ))}
      </div>
    </div>
  );
}
