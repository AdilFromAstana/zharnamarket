"use client";

import type { Ad } from "@/lib/types/ad";
import { formatViews } from "@/lib/utils";
import { PLATFORM_BADGE_CLASSES } from "@/lib/constants";
import dayjs from "dayjs";
import "dayjs/locale/ru";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);
dayjs.locale("ru");

interface EscrowBudgetSectionProps {
  escrowAccount: Ad["escrowAccount"];
  rpm: number | null;
  platform: Ad["platform"];
  submissionDeadline: string | null;
  approvedCount: number;
  totalApprovedViews: number;
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("ru-KZ", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function EscrowBudgetSection({
  escrowAccount,
  rpm,
  platform,
  submissionDeadline,
  approvedCount,
  totalApprovedViews,
}: EscrowBudgetSectionProps) {
  if (!escrowAccount) return null;

  const { initialAmount, spentAmount, reservedAmount, available } =
    escrowAccount;

  const paidPct = initialAmount > 0 ? (spentAmount / initialAmount) * 100 : 0;
  const reservedPct =
    initialAmount > 0 ? (reservedAmount / initialAmount) * 100 : 0;
  const totalUsedPct = Math.min(paidPct + reservedPct, 100);

  const deadlineLabel = submissionDeadline
    ? dayjs(submissionDeadline).format("D MMM YYYY")
    : null;

  return (
    <div className="mb-5">
      {/* ── Прогресс ── */}
      <div className="mb-3">
        <div className="flex items-baseline justify-between mb-1.5 flex-wrap gap-1">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-xl font-bold text-gray-900">
              {formatMoney(spentAmount)} ₸
            </span>
            <span className="text-sm text-gray-400">
              из {formatMoney(initialAmount)} ₸
            </span>
            <span className="text-sm text-gray-500">Выплачено</span>
          </div>
          <span className="text-sm font-semibold text-gray-700">
            {Math.round(totalUsedPct)}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="relative h-2.5 rounded-full bg-gray-100 overflow-hidden">
          {/* Paid (green) */}
          <div
            className="absolute left-0 top-0 h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(paidPct, 100)}%` }}
          />
          {/* Reserved (gray) */}
          {reservedPct > 0 && (
            <div
              className="absolute top-0 h-full bg-gray-400 rounded-full transition-all duration-500"
              style={{
                left: `${Math.min(paidPct, 100)}%`,
                width: `${Math.min(reservedPct, 100 - paidPct)}%`,
              }}
            />
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            Выплачено
          </span>
          {reservedAmount > 0 && (
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-gray-400" />
              В резерве
            </span>
          )}
          <span className="text-gray-300">|</span>
          <span className="text-gray-400">Лимит выплат</span>
        </div>
      </div>

      {/* ── Бейджи: платформа + RPM + дедлайн ── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span
          className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${PLATFORM_BADGE_CLASSES[platform] ?? "bg-gray-800 text-white"}`}
        >
          {platform}
        </span>
        {rpm !== null && rpm > 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border border-gray-200 bg-gray-50 text-gray-700">
            <EyeIcon className="w-3.5 h-3.5 text-gray-400" />
            {formatMoney(rpm)} ₸ за 1 000
          </span>
        )}
        {deadlineLabel && (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-700">
            <CalendarIcon className="w-3.5 h-3.5" />
            до {deadlineLabel}
          </span>
        )}
      </div>

      {/* ── 3 метрики ── */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <MetricCard
          icon={<VideoIcon className="w-5 h-5 text-indigo-500" />}
          value={approvedCount.toString()}
          label="Видео одобрено"
          color="indigo"
        />
        <MetricCard
          icon={<EyeIcon className="w-5 h-5 text-sky-500" />}
          value={totalApprovedViews > 0 ? formatViews(totalApprovedViews) : "0"}
          label="Просмотров"
          color="sky"
        />
        <MetricCard
          icon={<WalletIcon className="w-5 h-5 text-emerald-500" />}
          value={`${formatMoney(available)} ₸`}
          label={`из ${formatMoney(initialAmount)} ₸`}
          color="emerald"
        />
      </div>
    </div>
  );
}

// ── Вспомогательные компоненты ──────────────────────────────────────────────

interface MetricCardProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  color: "indigo" | "sky" | "emerald";
}

function MetricCard({ icon, value, label }: MetricCardProps) {
  return (
    <div className="flex flex-col items-start gap-1 rounded-xl border border-gray-100 bg-gray-50 p-3 sm:p-3.5">
      {icon}
      <span className="text-base sm:text-lg font-bold text-gray-900 leading-tight mt-0.5 truncate w-full">
        {value}
      </span>
      <span className="text-[11px] text-gray-400 leading-tight">{label}</span>
    </div>
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

function VideoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
    </svg>
  );
}

function WalletIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
      <path
        fillRule="evenodd"
        d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
        clipRule="evenodd"
      />
    </svg>
  );
}
