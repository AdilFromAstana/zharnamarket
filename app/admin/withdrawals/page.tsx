"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Spin, Empty, Drawer } from "antd";
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  MoreOutlined,
  WalletOutlined,
  CloseOutlined,
  UserOutlined,
  PhoneOutlined,
  CreditCardOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { cn, formatRelative, formatDate } from "@/lib/utils";
import { WITHDRAWAL_STATUS_LABELS } from "@/lib/constants";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Withdrawal {
  id: string;
  amount: number;
  method: string;
  details: string;
  status: string;
  createdAt: string;
  processedAt: string | null;
  user: { id: string; name: string; email: string; phone: string | null };
}

interface WithdrawalsResponse {
  data: Withdrawal[];
  pagination: { page: number; total: number; totalPages: number };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { dot: string; text: string; bg: string }
> = {
  pending: {
    dot: "bg-amber-500",
    text: "text-amber-700",
    bg: "bg-amber-50",
  },
  processing: {
    dot: "bg-blue-500",
    text: "text-blue-700",
    bg: "bg-blue-50",
  },
  completed: {
    dot: "bg-green-500",
    text: "text-green-700",
    bg: "bg-green-50",
  },
  failed: { dot: "bg-red-500", text: "text-red-700", bg: "bg-red-50" },
};

const METHOD_LABELS: Record<string, string> = {
  kaspi: "Kaspi",
  halyk: "Halyk",
  card: "Карта",
};

function getStatusConfig(status: string) {
  return (
    STATUS_CONFIG[status] ?? {
      dot: "bg-gray-400",
      text: "text-gray-600",
      bg: "bg-gray-50",
    }
  );
}

function smartDate(date: string | null): string {
  if (!date) return "—";
  const diffDays = Math.floor(
    (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays < 7) return formatRelative(date);
  return formatDate(date);
}

function StatusPill({ status }: { status: string }) {
  const c = getStatusConfig(status);
  const label = WITHDRAWAL_STATUS_LABELS[status] ?? status;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2 py-0.5 shrink-0",
        c.bg,
        c.text,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", c.dot)} />
      {label}
    </span>
  );
}

function SmartPagination({
  current,
  total,
  onChange,
}: {
  current: number;
  total: number;
  onChange: (p: number) => void;
}) {
  if (total <= 1) return null;
  const pages: (number | "...")[] = [];
  if (total <= 5) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else if (current <= 3) pages.push(1, 2, 3, 4, "...", total);
  else if (current >= total - 2)
    pages.push(1, "...", total - 3, total - 2, total - 1, total);
  else
    pages.push(1, "...", current - 1, current, current + 1, "...", total);
  return (
    <div className="flex items-center justify-center gap-1 mt-6 pb-2">
      <button
        onClick={() => onChange(Math.max(1, current - 1))}
        disabled={current === 1}
        className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 text-sm"
      >
        ‹
      </button>
      {pages.map((p, i) =>
        p === "..." ? (
          <span
            key={`d${i}`}
            className="w-6 text-center text-gray-300 text-sm"
          >
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p as number)}
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center text-sm font-medium transition-colors",
              p === current
                ? "bg-sky-500 text-white shadow-sm"
                : "border border-gray-200 text-gray-600 hover:bg-gray-100",
            )}
          >
            {p}
          </button>
        ),
      )}
      <button
        onClick={() => onChange(Math.min(total, current + 1))}
        disabled={current === total}
        className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 text-sm"
      >
        ›
      </button>
    </div>
  );
}

// ─── Filter chips ───────────────────────────────────────────────────────────

const FILTERS = [
  { value: "all", label: "Все" },
  { value: "processing", label: "В обработке" },
  { value: "completed", label: "Завершены" },
  { value: "failed", label: "Ошибки" },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function AdminWithdrawalsPage() {
  const router = useRouter();
  const [data, setData] = useState<WithdrawalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");

  // Detail drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerItem, setDrawerItem] = useState<Withdrawal | null>(null);

  const openDrawer = (w: Withdrawal) => {
    setDrawerItem(w);
    setDrawerOpen(true);
  };
  const closeDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => setDrawerItem(null), 300);
  };

  const fetchWithdrawals = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const result = await api.get<WithdrawalsResponse>(
        `/api/admin/withdrawals?${params}`,
      );
      setData(result);
    } catch {
      toast.error("Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
  }, [page, statusFilter]);

  // ─── Stats summary ──────────────────────────────────────────────────────
  const stats = data
    ? {
        total: data.pagination.total,
        totalAmount: data.data.reduce((s, w) => s + w.amount, 0),
      }
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 shrink-0 transition-colors"
          >
            <ArrowLeftOutlined className="text-sm" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 sm:text-xl">
              Выводы средств
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Мониторинг автоматических выводов
            </p>
          </div>
          <button
            onClick={fetchWithdrawals}
            disabled={loading}
            className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 shrink-0 disabled:opacity-50 transition-colors"
          >
            <ReloadOutlined spin={loading} />
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => {
                setStatusFilter(f.value);
                setPage(1);
              }}
              className={cn(
                "shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors",
                statusFilter === f.value
                  ? "bg-sky-500 text-white shadow-sm"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Spin size="large" />
          </div>
        ) : data?.data.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 py-16">
            <Empty
              description="Нет запросов"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {data?.data.map((w) => (
              <div
                key={w.id}
                className={cn(
                  "bg-white rounded-2xl border p-3 sm:p-4 transition-colors",
                  w.status === "failed"
                    ? "border-red-200 bg-red-50/20"
                    : w.status === "processing"
                      ? "border-blue-200 bg-blue-50/10"
                      : "border-gray-100",
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      w.status === "completed"
                        ? "bg-green-50"
                        : w.status === "failed"
                          ? "bg-red-50"
                          : w.status === "processing"
                            ? "bg-blue-50"
                            : "bg-gray-50",
                    )}
                  >
                    <WalletOutlined
                      className={cn(
                        "text-lg",
                        w.status === "completed"
                          ? "text-green-400"
                          : w.status === "failed"
                            ? "text-red-400"
                            : w.status === "processing"
                              ? "text-blue-400"
                              : "text-gray-400",
                      )}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Amount + status */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-[16px] text-gray-900 leading-tight">
                        {w.amount.toLocaleString("ru")} ₸
                      </span>
                      <StatusPill status={w.status} />
                    </div>

                    {/* User */}
                    <p className="text-[13px] text-gray-500 truncate mt-0.5 leading-tight">
                      {w.user.name} · {w.user.email}
                    </p>

                    {/* Method + details + date */}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="inline-flex items-center text-[12px] text-gray-500 bg-gray-50 rounded-full px-2 py-0.5 font-medium">
                        {METHOD_LABELS[w.method] ?? w.method}
                      </span>
                      <span className="text-[12px] text-gray-400 truncate max-w-[160px]">
                        {w.details}
                      </span>
                      <span className="text-[11px] text-gray-300">·</span>
                      <span className="text-[12px] text-gray-400">
                        {smartDate(w.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Detail button */}
                  <button
                    onClick={() => openDrawer(w)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors shrink-0 -mr-1 -mt-0.5"
                  >
                    <MoreOutlined className="text-lg" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <SmartPagination
          current={page}
          total={data?.pagination.totalPages ?? 0}
          onChange={setPage}
        />
      </div>

      {/* ── Detail Drawer ───────────────────────────────────────────── */}
      <Drawer
        open={drawerOpen}
        onClose={closeDrawer}
        placement="bottom"
        size="default"
        closable={false}
        styles={{
          wrapper: { borderRadius: "16px 16px 0 0" },
          body: { padding: "0 0 env(safe-area-inset-bottom, 16px) 0" },
        }}
        rootClassName="admin-user-actions-drawer"
      >
        {drawerItem && (
          <div>
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-5 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-[18px] text-gray-900">
                  {drawerItem.amount.toLocaleString("ru")} ₸
                </span>
                <StatusPill status={drawerItem.status} />
              </div>
              <p className="text-[13px] text-gray-400">
                ID: {drawerItem.id.slice(0, 12)}...
              </p>
            </div>

            {/* Details */}
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-center gap-3">
                <UserOutlined className="text-gray-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-gray-400">Пользователь</p>
                  <p className="text-[15px] text-gray-900 font-medium truncate">
                    {drawerItem.user.name}
                  </p>
                  <p className="text-[13px] text-gray-500 truncate">
                    {drawerItem.user.email}
                  </p>
                </div>
              </div>

              {drawerItem.user.phone && (
                <div className="flex items-center gap-3">
                  <PhoneOutlined className="text-gray-400" />
                  <div>
                    <p className="text-[13px] text-gray-400">Телефон</p>
                    <p className="text-[15px] text-gray-900">
                      {drawerItem.user.phone}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <CreditCardOutlined className="text-gray-400" />
                <div>
                  <p className="text-[13px] text-gray-400">Способ вывода</p>
                  <p className="text-[15px] text-gray-900 font-medium">
                    {METHOD_LABELS[drawerItem.method] ?? drawerItem.method} ·{" "}
                    {drawerItem.details}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <ClockCircleOutlined className="text-gray-400" />
                <div>
                  <p className="text-[13px] text-gray-400">Создан</p>
                  <p className="text-[15px] text-gray-900">
                    {formatDate(drawerItem.createdAt)}
                  </p>
                  {drawerItem.processedAt && (
                    <p className="text-[13px] text-gray-500 mt-0.5">
                      Обработан: {formatDate(drawerItem.processedAt)}
                    </p>
                  )}
                </div>
              </div>

              {drawerItem.status === "failed" && (
                <div className="bg-red-50 rounded-xl p-3 mt-2">
                  <p className="text-[13px] text-red-600 font-medium">
                    Ошибка провайдера
                  </p>
                  <p className="text-[12px] text-red-500 mt-0.5">
                    Средства автоматически возвращены на баланс пользователя
                  </p>
                </div>
              )}

              {drawerItem.status === "processing" && (
                <div className="bg-blue-50 rounded-xl p-3 mt-2">
                  <p className="text-[13px] text-blue-600 font-medium">
                    Перевод обрабатывается
                  </p>
                  <p className="text-[12px] text-blue-500 mt-0.5">
                    Платёжный провайдер обрабатывает перевод на{" "}
                    {METHOD_LABELS[drawerItem.method] ?? drawerItem.method}
                  </p>
                </div>
              )}
            </div>

            {/* Close */}
            <div className="border-t border-gray-100 py-2">
              <button
                onClick={closeDrawer}
                className="w-full flex items-center gap-3 px-5 py-3.5 text-left text-[15px] font-medium text-gray-500 transition-colors active:bg-gray-50"
              >
                <span className="text-lg w-5 flex items-center justify-center">
                  <CloseOutlined />
                </span>
                Закрыть
              </button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
