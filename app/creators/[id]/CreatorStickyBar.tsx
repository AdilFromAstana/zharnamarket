"use client";

import { Button } from "antd";
import { SendOutlined, MobileOutlined } from "@ant-design/icons";
import type { CreatorProfile } from "@/lib/types/creator";

interface CreatorStickyBarProps {
  pricing: CreatorProfile["pricing"];
  contactChannels: string[];
  onContactClick: () => void;
}

export default function CreatorStickyBar({
  pricing,
  contactChannels,
  onContactClick,
}: CreatorStickyBarProps) {
  const hasPriceItems = pricing.items && pricing.items.length > 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/90 backdrop-blur-xl border-t border-gray-100 px-4 py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-500">
          {hasPriceItems ? "Прайс-лист доступен" : "Ставка от"}
        </div>
        <div className="font-bold text-gray-900 text-base leading-tight">
          {hasPriceItems
            ? `от ${pricing.items![0].price.toLocaleString("ru-KZ")} ₸`
            : `${pricing.minimumRate.toLocaleString("ru-KZ")} ₸`}
        </div>
        {contactChannels.length > 0 && (
          <div className="text-xs text-gray-400 truncate flex items-center gap-1">
            <MobileOutlined /> {contactChannels.join(" · ")}
          </div>
        )}
      </div>
      <Button
        type="primary"
        size="large"
        icon={<SendOutlined />}
        onClick={onContactClick}
        style={{
          background: "#0EA5E9",
          borderColor: "#0EA5E9",
          height: 44,
          flexShrink: 0,
        }}
      >
        Связаться
      </Button>
    </div>
  );
}
