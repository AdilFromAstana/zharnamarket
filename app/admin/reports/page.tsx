"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Spin, Empty, Select, Drawer } from "antd";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExportOutlined,
  ReloadOutlined,
  MoreOutlined,
  CloseOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { api, ApiError } from "@/lib/api-client";
import { formatDate, formatRelative, cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Report {
  id: string;
  targetType: "ad" | "creator" | "customer" | "review";
  targetId: string;
  reason: string;
  resolved: boolean;
  createdAt: string;
  submitter: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
}

interface ReportsResponse {
  data: Report[];
  unresolvedCount: number;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const TARGET_CONFIG: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  ad:       { label: "Объявление", dot: "bg-blue-500",   text: "text-blue-700",   bg: "bg-blue-50" },
  creator:  { label: "Креатор",    dot: "bg-violet-500", text: "text-violet-700", bg: "bg-violet-50" },
  customer: { label: "Заказчик",   dot: "bg-amber-500",  text: "text-amber-700",  bg: "bg-amber-50" },
  review:   { label: "Отзыв",      dot: "bg-cyan-500",   text: "text-cyan-700",   bg: "bg-cyan-50" },
};

const REASON_LABELS: Record<string, string> = {
  spam: "Спам",
  inappropriate: "Неуместное",
  fake: "Фейк",
  scam: "Мошенничество",
  harassment: "Харассмент",
  other: "Другое",
};

function parseReason(fullReason: string): { reason: string; description: string } {
  const colonIndex = fullReason.indexOf(": ");
  if (colonIndex > 0 && colonIndex < 20) {
    return { reason: fullReason.slice(0, colonIndex), description: fullReason.slice(colonIndex + 2) };
  }
  return { reason: fullReason, description: "" };
}

function getTargetUrl(targetType: string, targetId: string): string {
  switch (targetType) {
    case "ad": return `/ads/${targetId}`;
    case "creator": return `/creators/${targetId}`;
    case "customer": return `/admin/users?search=${targetId}`;
    case "review": return `#review-${targetId}`;
    default: return "#";
  }
}

function smartDate(date: string | null): string {
  if (!date) return "—";
  const diffDays = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) return formatRelative(date);
  return formatDate(date);
}

function ActionSheetButton({ icon, label, color, onClick, loading }: { icon: React.ReactNode; label: string; color: string; onClick: () => void; loading?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={cn("w-full flex items-center gap-3 px-5 py-3.5 text-left text-[15px] font-medium transition-colors active:bg-gray-50 disabled:opacity-50", color)}
    >
      <span className="text-lg w-5 flex items-center justify-center">{icon}</span>
      {loading ? "Обработка..." : label}
    </button>
  );
}

function SmartPagination({ current, total, onChange }: { current: number; total: number; onChange: (p: number) => void }) {
  if (total <= 1) return null;
  const pages: (number | "...")[] = [];
  if (total <= 5) { for (let i = 1; i <= total; i++) pages.push(i); }
  else if (current <= 3) pages.push(1, 2, 3, 4, "...", total);
  else if (current >= total - 2) pages.push(1, "...", total - 3, total - 2, total - 1, total);
  else pages.push(1, "...", current - 1, current, current + 1, "...", total);
  return (
    <div className="flex items-center justify-center gap-1 mt-6 pb-2">
      <button onClick={() => onChange(Math.max(1, current - 1))} disabled={current === 1} className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 text-sm">‹</button>
      {pages.map((p, i) =>
        p === "..." ? <span key={`d${i}`} className="w-6 text-center text-gray-300 text-sm">…</span> : (
          <button key={p} onClick={() => onChange(p as number)} className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-sm font-medium transition-colors", p === current ? "bg-sky-500 text-white shadow-sm" : "border border-gray-200 text-gray-600 hover:bg-gray-100")}>{p}</button>
        ),
      )}
      <button onClick={() => onChange(Math.min(total, current + 1))} disabled={current === total} className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 text-sm">›</button>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AdminReportsPage() {
  const router = useRouter();
  const { isLoading: authLoading } = useRequireAdmin();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [unresolvedCount, setUnresolvedCount] = useState(0);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [filterResolved, setFilterResolved] = useState<string>("false");
  const [filterType, setFilterType] = useState<string>("all");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Bottom sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetItem, setSheetItem] = useState<Report | null>(null);

  const openSheet = (r: Report) => { setSheetItem(r); setSheetOpen(true); };
  const closeSheet = () => { setSheetOpen(false); setTimeout(() => setSheetItem(null), 300); };

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterResolved !== "all") params.set("resolved", filterResolved);
      if (filterType !== "all") params.set("targetType", filterType);
      params.set("page", String(pagination.page));
      params.set("limit", "30");

      const data = await api.get<ReportsResponse>(`/api/admin/reports?${params.toString()}`);
      setReports(data.data);
      setUnresolvedCount(data.unresolvedCount);
      setPagination((prev) => ({ ...prev, total: data.pagination.total, totalPages: data.pagination.totalPages }));
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [filterResolved, filterType, pagination.page]);

  useEffect(() => { if (!authLoading) fetchReports(); }, [authLoading, fetchReports]);

  const handleToggleResolved = async (report: Report) => {
    closeSheet();
    setTogglingId(report.id);
    try {
      await api.patch(`/api/admin/reports/${report.id}`, { resolved: !report.resolved });
      setReports((prev) => prev.map((r) => (r.id === report.id ? { ...r, resolved: !r.resolved } : r)));
      setUnresolvedCount((prev) => prev + (report.resolved ? 1 : -1));
      toast.success(report.resolved ? "Жалоба открыта заново" : "Жалоба обработана");
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    } finally {
      setTogglingId(null);
    }
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Spin size="large" /></div>;
  }

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
            <h1 className="text-lg font-bold text-gray-900 sm:text-xl">Жалобы</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {unresolvedCount > 0 ? (
                <span className="text-red-500 font-medium">{unresolvedCount} необработанных</span>
              ) : (
                "Все обработаны"
              )}
            </p>
          </div>
          <button
            onClick={fetchReports}
            disabled={loading}
            className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 shrink-0 disabled:opacity-50 transition-colors"
          >
            <ReloadOutlined spin={loading} />
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          <Select
            value={filterResolved}
            onChange={(v) => { setFilterResolved(v); setPagination((p) => ({ ...p, page: 1 })); }}
            className="shrink-0"
            style={{ minWidth: 155 }}
            size="middle"
            options={[
              { label: "Необработанные", value: "false" },
              { label: "Обработанные", value: "true" },
              { label: "Все", value: "all" },
            ]}
          />
          <Select
            value={filterType}
            onChange={(v) => { setFilterType(v); setPagination((p) => ({ ...p, page: 1 })); }}
            className="shrink-0"
            style={{ minWidth: 140 }}
            size="middle"
            options={[
              { label: "Все типы", value: "all" },
              { label: "Объявления", value: "ad" },
              { label: "Креаторы", value: "creator" },
              { label: "Заказчики", value: "customer" },
              { label: "Отзывы", value: "review" },
            ]}
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-16"><Spin size="large" /></div>
        ) : reports.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 py-16">
            <Empty description="Жалоб не найдено" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {reports.map((report) => {
              const { reason, description } = parseReason(report.reason);
              const target = TARGET_CONFIG[report.targetType] ?? { label: report.targetType, dot: "bg-gray-400", text: "text-gray-600", bg: "bg-gray-50" };
              const reasonLabel = REASON_LABELS[reason] ?? reason;

              return (
                <div
                  key={report.id}
                  className={cn(
                    "bg-white rounded-2xl border p-3 sm:p-4 transition-colors",
                    report.resolved ? "border-gray-100 opacity-60" : "border-gray-200",
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Badges row */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Target type pill */}
                        <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2 py-0.5 shrink-0", target.bg, target.text)}>
                          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", target.dot)} />
                          {target.label}
                        </span>
                        {/* Reason pill */}
                        <span className="inline-flex items-center text-[11px] font-medium rounded-full px-2 py-0.5 shrink-0 bg-gray-100 text-gray-600">
                          {reasonLabel}
                        </span>
                        {/* Status */}
                        {report.resolved ? (
                          <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-green-700 bg-green-50 rounded-full px-2 py-0.5 shrink-0">
                            <CheckCircleOutlined className="text-[10px]" /> Обработано
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-red-700 bg-red-50 rounded-full px-2 py-0.5 shrink-0">
                            <ClockCircleOutlined className="text-[10px]" /> Новая
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      {description && (
                        <p className="text-[13px] text-gray-700 mt-1.5 line-clamp-2 leading-snug">{description}</p>
                      )}

                      {/* Meta */}
                      <div className="flex items-center gap-2 mt-1.5 text-[12px] text-gray-400">
                        <span>{smartDate(report.createdAt)}</span>
                        <span className="text-gray-300">·</span>
                        <span className="truncate">От: {report.submitter.name}</span>
                      </div>
                    </div>

                    {/* Kebab */}
                    <button
                      onClick={() => openSheet(report)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors shrink-0 -mr-1 -mt-0.5"
                    >
                      <MoreOutlined className="text-lg" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <SmartPagination
          current={pagination.page}
          total={pagination.totalPages}
          onChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
        />
      </div>

      {/* ── Bottom Sheet ────────────────────────────────────────────── */}
      <Drawer
        open={sheetOpen}
        onClose={closeSheet}
        placement="bottom"
        size="default"
        closable={false}
        styles={{
          wrapper: { borderRadius: "16px 16px 0 0" },
          body: { padding: "0 0 env(safe-area-inset-bottom, 16px) 0" },
        }}
        rootClassName="admin-user-actions-drawer"
      >
        {sheetItem && (() => {
          const { reason, description } = parseReason(sheetItem.reason);
          const target = TARGET_CONFIG[sheetItem.targetType] ?? { label: sheetItem.targetType, dot: "bg-gray-400", text: "text-gray-600", bg: "bg-gray-50" };
          const reasonLabel = REASON_LABELS[reason] ?? reason;

          return (
            <div>
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-gray-200 rounded-full" />
              </div>

              {/* Preview */}
              <div className="px-5 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2 py-0.5", target.bg, target.text)}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", target.dot)} />
                    {target.label}
                  </span>
                  <span className="text-[11px] font-medium bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{reasonLabel}</span>
                </div>
                {description && <p className="text-[13px] text-gray-700 line-clamp-3 leading-snug">{description}</p>}
                <p className="text-[12px] text-gray-400 mt-1">От: {sheetItem.submitter.name} · {sheetItem.submitter.email}</p>
              </div>

              {/* Actions */}
              <div className="py-2">
                <ActionSheetButton
                  icon={<ExportOutlined />}
                  label={`Открыть ${target.label.toLowerCase()}`}
                  color="text-gray-700"
                  onClick={() => { closeSheet(); window.open(getTargetUrl(sheetItem.targetType, sheetItem.targetId), "_blank"); }}
                />
                {sheetItem.resolved ? (
                  <ActionSheetButton
                    icon={<UndoOutlined />}
                    label="Открыть заново"
                    color="text-amber-600"
                    loading={togglingId === sheetItem.id}
                    onClick={() => handleToggleResolved(sheetItem)}
                  />
                ) : (
                  <ActionSheetButton
                    icon={<CheckCircleOutlined />}
                    label="Отметить обработанной"
                    color="text-green-600"
                    loading={togglingId === sheetItem.id}
                    onClick={() => handleToggleResolved(sheetItem)}
                  />
                )}
                <div className="mx-4 mt-1 border-t border-gray-100" />
                <ActionSheetButton icon={<CloseOutlined />} label="Отмена" color="text-gray-500" onClick={closeSheet} />
              </div>
            </div>
          );
        })()}
      </Drawer>
    </div>
  );
}
