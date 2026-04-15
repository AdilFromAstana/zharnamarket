"use client";

import type { ApprovedSubmission } from "@/lib/types/submission";
import { formatViews, detectPlatform, shortenVideoUrl } from "@/lib/utils";

interface ApprovedVideosListProps {
  submissions: ApprovedSubmission[];
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("ru-KZ", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ── Platform icons ────────────────────────────────────────────────────────────

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="20" height="20" rx="6" fill="url(#ig-grad)" />
      <defs>
        <radialGradient
          id="ig-grad"
          cx="30%"
          cy="107%"
          r="150%"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#ffd600" />
          <stop offset="50%" stopColor="#ff0069" />
          <stop offset="100%" stopColor="#7638fa" />
        </radialGradient>
      </defs>
      <path
        d="M10 6.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zm0 5.75a2.25 2.25 0 110-4.5 2.25 2.25 0 010 4.5z"
        fill="white"
      />
      <circle cx="13.75" cy="6.25" r="0.875" fill="white" />
      <path
        d="M13.5 3h-7A3.5 3.5 0 003 6.5v7A3.5 3.5 0 006.5 17h7a3.5 3.5 0 003.5-3.5v-7A3.5 3.5 0 0013.5 3zm2.25 10.5a2.25 2.25 0 01-2.25 2.25h-7a2.25 2.25 0 01-2.25-2.25v-7A2.25 2.25 0 016.5 4.25h7a2.25 2.25 0 012.25 2.25v7z"
        fill="white"
      />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="20" height="20" rx="6" fill="black" />
      <path
        d="M13.5 5c.3 1.4 1.2 2.3 2.5 2.5v2c-.9 0-1.7-.3-2.5-.7v4.2a4 4 0 11-4-4c.1 0 .3 0 .4.01V11c-.1 0-.3-.01-.4-.01a1.9 1.9 0 100 3.8c1.04 0 1.9-.87 1.9-1.94l.1-7.85H13.5z"
        fill="white"
      />
    </svg>
  );
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="20" height="20" rx="6" fill="#FF0000" />
      <path
        d="M15.5 7.5s-.2-1.1-.7-1.6c-.6-.7-1.3-.7-1.6-.7C11.6 5 10 5 10 5s-1.6 0-3.2.2c-.3 0-1 0-1.6.7-.5.5-.7 1.6-.7 1.6S4.3 8.7 4.3 10v1.2c0 1.3.2 2.5.2 2.5s.2 1.1.7 1.6c.6.7 1.4.6 1.8.7C8.2 16 10 16 10 16s1.6 0 3.2-.2c.3 0 1 0 1.6-.7.5-.5.7-1.6.7-1.6s.2-1.2.2-2.5V10c0-1.3-.2-2.5-.2-2.5zM8.5 12.3V7.7l4.3 2.3-4.3 2.3z"
        fill="white"
      />
    </svg>
  );
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M10 3C5.5 3 1.7 5.9 0 10c1.7 4.1 5.5 7 10 7s8.3-2.9 10-7c-1.7-4.1-5.5-7-10-7zm0 11.5a4.5 4.5 0 110-9 4.5 4.5 0 010 9zm0-7a2.5 2.5 0 100 5 2.5 2.5 0 000-5z" />
    </svg>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
        <svg
          className="w-7 h-7 text-gray-300"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
        </svg>
      </div>
      <p className="font-semibold text-gray-700 mb-1">Видео ещё нет</p>
      <p className="text-sm text-gray-400">
        Первое одобренное видео появится здесь
      </p>
    </div>
  );
}

function PlatformIcon({ url, className }: { url: string; className?: string }) {
  const p = detectPlatform(url);
  if (p === "instagram") return <InstagramIcon className={className} />;
  if (p === "tiktok") return <TikTokIcon className={className} />;
  if (p === "youtube") return <YouTubeIcon className={className} />;
  return <LinkIcon className={`${className} text-gray-400`} />;
}

export default function ApprovedVideosList({
  submissions,
}: ApprovedVideosListProps) {
  if (submissions.length === 0) return <EmptyState />;

  return (
    <div className="flex flex-col divide-y divide-gray-100">
      {submissions.map((sub, idx) => {
        const shortUrl = shortenVideoUrl(sub.videoUrl);
        const views = sub.approvedViews ?? 0;
        const payout = sub.payoutAmount ?? 0;

        return (
          <div key={sub.id} className="py-4 first:pt-0 last:pb-0">
            {/* Mobile layout */}
            <div className="flex md:hidden items-start gap-3">
              {/* Thumbnail */}
              <div className="relative h-[100px] w-[72px] shrink-0 overflow-hidden rounded-xl bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sub.screenshotUrl}
                  alt={`Видео #${idx + 1}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>

              {/* Info */}
              <div className="flex min-w-0 flex-1 flex-col gap-1.5 justify-between h-[100px]">
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-xs font-semibold text-gray-500">
                    Видео #{idx + 1}
                  </span>
                  <a
                    href={sub.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 min-w-0 group"
                  >
                    <PlatformIcon
                      url={sub.videoUrl}
                      className="w-4 h-4 shrink-0"
                    />
                    <span className="text-xs text-gray-600 truncate group-hover:text-blue-600 transition-colors">
                      {shortUrl}
                    </span>
                  </a>
                  {views > 0 && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <EyeIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      {formatViews(views)}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase tracking-wide">
                    Выплачено
                  </span>
                  <p className="text-base font-bold text-gray-900 leading-tight">
                    {formatMoney(payout)} ₸
                  </p>
                </div>
              </div>
            </div>

            {/* Desktop layout */}
            <div className="hidden md:flex items-center justify-between gap-5">
              <div className="flex items-center gap-4 min-w-0">
                {/* Thumbnail */}
                <div className="relative h-[114px] w-[64px] shrink-0 overflow-hidden rounded-xl bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sub.screenshotUrl}
                    alt={`Видео #${idx + 1}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>

                {/* Info */}
                <div className="flex flex-col gap-2 min-w-0">
                  <span className="text-sm font-semibold text-gray-500">
                    Видео #{idx + 1}
                  </span>
                  <a
                    href={sub.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 group"
                  >
                    <PlatformIcon
                      url={sub.videoUrl}
                      className="w-5 h-5 shrink-0"
                    />
                    <span className="text-sm text-gray-600 truncate group-hover:text-blue-600 transition-colors max-w-xs">
                      {shortUrl}
                    </span>
                  </a>
                  {views > 0 && (
                    <span className="flex items-center gap-1.5 text-sm text-gray-500">
                      <EyeIcon className="w-4 h-4 text-gray-400 shrink-0" />
                      {formatViews(views)} просмотров
                    </span>
                  )}
                </div>
              </div>

              {/* Payout */}
              <div className="flex flex-col items-end shrink-0">
                <span className="text-xs text-gray-400 mb-0.5">Выплачено</span>
                <span className="text-xl font-bold text-gray-900">
                  {formatMoney(payout)} ₸
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
