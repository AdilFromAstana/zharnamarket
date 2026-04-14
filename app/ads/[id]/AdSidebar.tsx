"use client";

import Link from "next/link";
import { Tag, Divider, Button } from "antd";
import {
  SendOutlined,
  PhoneOutlined,
  WhatsAppOutlined,
  MailOutlined,
  ArrowRightOutlined,
  ShareAltOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import ContactButton from "@/components/ui/ContactButton";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import type { Ad } from "@/lib/types/ad";
import type { TaskApplication } from "@/lib/types/submission";
import { PLATFORM_COLORS } from "@/lib/constants";
import { ENUM_TO_CITY, ENUM_TO_CATEGORY } from "@/lib/enum-maps";
import { getAdvertiserLabel } from "./ad-utils";
import EscrowApplicationPanel from "./EscrowApplicationPanel";

interface AdSidebarProps {
  ad: Ad;
  isActive: boolean;
  isEscrow: boolean;
  isOwner: boolean;
  isLoggedIn: boolean;
  displayName: string;
  userApplication: TaskApplication | null;
  applicationLoading: boolean;
  applying: boolean;
  videoUrlInput: string;
  videoUrlSubmitting: boolean;
  onContactOpen: () => void;
  onApply: () => void;
  onVideoUrlChange: (val: string) => void;
  onSubmitVideoUrl: () => void;
  onShare: () => void;
}

export default function AdSidebar({
  ad,
  isActive,
  isEscrow,
  isOwner,
  isLoggedIn,
  displayName,
  userApplication,
  applicationLoading,
  applying,
  videoUrlInput,
  videoUrlSubmitting,
  onContactOpen,
  onApply,
  onVideoUrlChange,
  onSubmitVideoUrl,
  onShare,
}: AdSidebarProps) {
  const platformColor = PLATFORM_COLORS[ad.platform];
  const advertiserInfo = getAdvertiserLabel(ad.boosts);
  const hasContacts =
    ad.contacts.telegram ||
    ad.contacts.whatsapp ||
    ad.contacts.phone ||
    ad.contacts.email;

  return (
    <div className="w-full lg:w-72 xl:w-80 shrink-0 flex flex-col gap-4">
      {/* Company card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=dbeafe&textColor=1e40af`}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-gray-900 text-base leading-tight">
                {displayName}
              </span>
              {ad.ownerVerified && (
                <VerifiedBadge
                  size={14}
                  title="Верифицированный рекламодатель"
                />
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Tag
                color={advertiserInfo.color}
                className="m-0 text-xs"
                icon={advertiserInfo.icon}
              >
                {advertiserInfo.text}
              </Tag>
            </div>
            <Link
              href={`/profile/${ad.ownerId}`}
              className="text-xs text-sky-500 hover:text-sky-700 transition-colors mt-1 inline-flex items-center gap-0.5"
            >
              Профиль заказчика{" "}
              <ArrowRightOutlined className="text-[9px]" />
            </Link>
          </div>
        </div>

        <Divider className="my-3" />

        {/* Contacts */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Контакты
          </h3>
          {hasContacts ? (
            <div className="flex flex-col gap-2.5">
              {ad.contacts.telegram && (
                <a
                  href={`https://t.me/${ad.contacts.telegram.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-sm text-gray-700 hover:text-blue-600 transition-colors group"
                >
                  <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors shrink-0">
                    <SendOutlined className="text-blue-500 text-sm" />
                  </span>
                  <span className="truncate">{ad.contacts.telegram}</span>
                </a>
              )}
              {ad.contacts.whatsapp && (
                <a
                  href={`https://wa.me/${ad.contacts.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-sm text-gray-700 hover:text-green-600 transition-colors group"
                >
                  <span className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center group-hover:bg-green-100 transition-colors shrink-0">
                    <WhatsAppOutlined className="text-green-500 text-sm" />
                  </span>
                  <span className="truncate">{ad.contacts.whatsapp}</span>
                </a>
              )}
              {ad.contacts.phone && (
                <a
                  href={`tel:${ad.contacts.phone}`}
                  className="flex items-center gap-2.5 text-sm text-gray-700 hover:text-gray-900 transition-colors group"
                >
                  <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors shrink-0">
                    <PhoneOutlined className="text-gray-500 text-sm" />
                  </span>
                  <span className="truncate">{ad.contacts.phone}</span>
                </a>
              )}
              {ad.contacts.email && (
                <a
                  href={`mailto:${ad.contacts.email}`}
                  className="flex items-center gap-2.5 text-sm text-gray-700 hover:text-sky-600 transition-colors group"
                >
                  <span className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center group-hover:bg-sky-100 transition-colors shrink-0">
                    <MailOutlined className="text-sky-500 text-sm" />
                  </span>
                  <span className="truncate">{ad.contacts.email}</span>
                </a>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              {isEscrow ? "Связь через платформу" : "Контакты не указаны"}
            </p>
          )}
        </div>

        {isActive && !isEscrow && (
          <ContactButton onClick={onContactOpen} block />
        )}

        {/* Escrow application panel */}
        {isEscrow && isActive && (
          <>
            <Divider className="my-3" />
            <EscrowApplicationPanel
              adId={ad.id}
              application={userApplication}
              loading={applicationLoading}
              applying={applying}
              videoUrlInput={videoUrlInput}
              videoUrlSubmitting={videoUrlSubmitting}
              isLoggedIn={isLoggedIn}
              isOwner={isOwner}
              rpm={ad.rpm ?? null}
              onApply={onApply}
              onVideoUrlChange={onVideoUrlChange}
              onSubmitVideoUrl={onSubmitVideoUrl}
            />
          </>
        )}
      </div>

      {/* Ad details — desktop only */}
      <div className="hidden lg:block bg-white rounded-2xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Детали объявления
        </h3>
        <div className="flex flex-col gap-2.5 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Платформа</span>
            <Tag
              style={{
                background: `${platformColor}15`,
                borderColor: `${platformColor}50`,
                color: platformColor,
                margin: 0,
              }}
            >
              {ad.platform}
            </Tag>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Формат видео</span>
            <Tag color="blue" className="m-0">
              {ad.videoFormat?.label ??
                ENUM_TO_CATEGORY[ad.category] ??
                ad.category}
            </Tag>
          </div>
          {ad.adFormat && (
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Формат рекламы</span>
              <Tag color="purple" className="m-0">
                {ad.adFormat.label}
              </Tag>
            </div>
          )}
          {ad.adSubject && (
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Что рекламируется</span>
              <Tag color="orange" className="m-0">
                {ad.adSubject.label}
              </Tag>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Город</span>
            <span className="text-gray-800 font-medium">
              {ENUM_TO_CITY[ad.city] ?? ad.city}
            </span>
          </div>
          {isEscrow && ad.rpm && (
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Ставка</span>
              <span className="text-gray-800 font-medium">
                {ad.rpm} ₸ / 1 000 просм.
              </span>
            </div>
          )}
          {isEscrow && ad.totalBudget && (
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Бюджет</span>
              <span className="text-gray-800 font-medium">
                {new Intl.NumberFormat("ru-KZ").format(ad.totalBudget)} ₸
              </span>
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onShare}
        className="hidden lg:flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors py-2"
      >
        <ShareAltOutlined />
        Поделиться объявлением
      </button>
    </div>
  );
}
