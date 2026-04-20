import { createElement } from "react";
import { getVideoFormatIcon } from "@/lib/home/home-content";
import type { VideoFormatCard } from "@/lib/home/types";

interface FormatChipProps {
  format: VideoFormatCard;
}

export default function FormatChip({ format }: FormatChipProps) {
  const icon = getVideoFormatIcon(format.key);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:border-sky-200 hover:shadow-sm transition h-full">
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-sky-50 to-blue-100 text-sky-600 mb-3">
        {createElement(icon, { className: "w-5 h-5", "aria-hidden": true })}
      </div>
      <div className="text-sm font-semibold text-gray-900 mb-1">
        {format.label}
      </div>
      {format.description && (
        <div className="text-xs text-gray-500 leading-relaxed line-clamp-2">
          {format.description}
        </div>
      )}
    </div>
  );
}
