"use client";

import { useState } from "react";
import { Spin } from "antd";
import {
  HeartOutlined,
  HeartFilled,
  ThunderboltOutlined,
} from "@ant-design/icons";
import ContactButton from "@/components/ui/ContactButton";
import type { TaskApplication } from "@/lib/types/submission";
import EscrowMobileCTAStatus from "./EscrowMobileCTAStatus";

interface AdMobileStickyBarProps {
  adId: string;
  isEscrow: boolean;
  isOwner: boolean;
  userApplication: TaskApplication | null;
  applicationLoading: boolean;
  applying: boolean;
  onContactOpen: () => void;
  onApply: () => void;
}

export default function AdMobileStickyBar({
  adId,
  isEscrow,
  isOwner,
  userApplication,
  applicationLoading,
  applying,
  onContactOpen,
  onApply,
}: AdMobileStickyBarProps) {
  const [isFavorite, setIsFavorite] = useState(false);

  // Direct mode — contact + favorite
  if (!isEscrow) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/80 backdrop-blur-xl border-t border-gray-100 px-4 py-3 flex gap-3">
        <button
          type="button"
          onClick={() => setIsFavorite(!isFavorite)}
          className={`p-4 rounded-2xl border transition-all duration-300 active:scale-90 shrink-0 ${
            isFavorite
              ? "bg-rose-50 border-rose-100 text-rose-500 shadow-inner"
              : "bg-slate-50 border-slate-100 text-slate-400 hover:text-slate-600"
          }`}
          aria-label={
            isFavorite ? "Убрать из избранного" : "Добавить в избранное"
          }
        >
          {isFavorite ? (
            <HeartFilled className="text-xl" />
          ) : (
            <HeartOutlined className="text-xl" />
          )}
        </button>
        <ContactButton onClick={onContactOpen} block />
      </div>
    );
  }

  // Escrow mode — apply / status
  if (isOwner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur-xl border-t border-gray-100 px-4 py-3">
      {applicationLoading ? (
        <div className="flex items-center justify-center py-1">
          <Spin size="small" />
        </div>
      ) : !userApplication ? (
        <button
          type="button"
          onClick={onApply}
          disabled={applying}
          className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-60"
        >
          {applying ? (
            <Spin size="small" />
          ) : (
            <ThunderboltOutlined className="text-lg" />
          )}
          Откликнуться
        </button>
      ) : (
        <EscrowMobileCTAStatus application={userApplication} adId={adId} />
      )}
    </div>
  );
}
