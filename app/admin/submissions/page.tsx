"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Spin, Empty, Select, Input, InputNumber, Modal, Drawer } from "antd";
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  CheckOutlined,
  CloseOutlined,
  MoreOutlined,
  LinkOutlined,
  PlayCircleOutlined,
} from "@ant-design/icons";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api-client";
import { cn, formatRelative, formatDate } from "@/lib/utils";
import { SUBMISSION_STATUS_LABELS, PLATFORM_COMMISSION_RATE } from "@/lib/constants";
import { REJECTION_REASON_LABELS } from "@/lib/types/submission";
import type { RejectionReason } from "@/lib/types/submission";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Submission {
  id: string;
  videoUrl: string;
  screenshotUrl: string;
  claimedViews: number;
  status: string;
  submittedAt: string;
  slaDeadline: string;
  escalated: boolean;
  reservedAmount: number | null;
  creator: { id: string; name: string; email: string };
  ad: { id: string; title: string; rpm: number | null; description: string };
}

interface SubmissionsResponse {
  data: Submission[];
  pagination: { page: number; total: number; totalPages: number };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { dot: string; text: string; bg: string }> = {
  submitted: { dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50" },
  approved:  { dot: "bg-green-500", text: "text-green-700", bg: "bg-green-50" },
  rejected:  { dot: "bg-red-500",   text: "text-red-700",   bg: "bg-red-50" },
  rejected_system: { dot: "bg-red-500", text: "text-red-700", bg: "bg-red-50" },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] ?? { dot: "bg-gray-400", text: "text-gray-600", bg: "bg-gray-50" };
}

function getSlaStatus(sub: Submission) {
  if (sub.escalated) return { label: "Просрочено", color: "text-red-600", bg: "bg-red-50" };
  const remaining = new Date(sub.slaDeadline).getTime() - Date.now();
  if (remaining < 0) return { label: "Просрочено", color: "text-red-600", bg: "bg-red-50" };
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  if (hours < 4) return { label: `${hours}ч ${mins}м`, color: "text-amber-600", bg: "bg-amber-50" };
  return { label: `${hours}ч ${mins}м`, color: "text-green-600", bg: "bg-green-50" };
}

function smartDate(date: string | null): string {
  if (!date) return "";
  const diffDays = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) return formatRelative(date);
  return formatDate(date);
}

function ActionSheetButton({ icon, label, color, onClick }: { icon: React.ReactNode; label: string; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("w-full flex items-center gap-3 px-5 py-3.5 text-left text-[15px] font-medium transition-colors active:bg-gray-50", color)}>
      <span className="text-lg w-5 flex items-center justify-center">{icon}</span>
      {label}
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
      <button onClick={() => onChange(Math.max(1, current - 1))} disabled={current === 1} className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 text-sm">&#8249;</button>
      {pages.map((p, i) =>
        p === "..." ? <span key={`d${i}`} className="w-6 text-center text-gray-300 text-sm">...</span> : (
          <button key={p} onClick={() => onChange(p as number)} className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-sm font-medium transition-colors", p === current ? "bg-sky-500 text-white shadow-sm" : "border border-gray-200 text-gray-600 hover:bg-gray-100")}>{p}</button>
        ),
      )}
      <button onClick={() => onChange(Math.min(total, current + 1))} disabled={current === total} className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 text-sm">&#8250;</button>
    </div>
  );
}

// ─── Filter chips ───────────────────────────────────────────────────────────

const FILTERS = [
  { value: "submitted", label: "На модерации" },
  { value: "approved", label: "Одобрены" },
  { value: "rejected", label: "Отклонены" },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function AdminSubmissionsPage() {
  const router = useRouter();
  const [data, setData] = useState<SubmissionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("submitted");

  // Bottom sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetItem, setSheetItem] = useState<Submission | null>(null);
  const openSheet = (s: Submission) => { setSheetItem(s); setSheetOpen(true); };
  const closeSheet = () => { setSheetOpen(false); setTimeout(() => setSheetItem(null), 300); };

  // Approve modal
  const [approveModal, setApproveModal] = useState<Submission | null>(null);
  const [approvedViews, setApprovedViews] = useState<number | null>(null);

  // Reject modal
  const [rejectModal, setRejectModal] = useState<Submission | null>(null);
  const [rejectionReason, setRejectionReason] = useState<RejectionReason | null>(null);
  const [rejectionComment, setRejectionComment] = useState("");

  const [actionLoading, setActionLoading] = useState(false);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: statusFilter, page: String(page), limit: "20" });
      const result = await api.get<SubmissionsResponse>(`/api/admin/submissions?${params}`);
      setData(result);
    } catch {
      toast.error("Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSubmissions(); }, [page, statusFilter]);

  const handleApprove = async () => {
    if (!approveModal || !approvedViews) return;
    setActionLoading(true);
    try {
      await api.post(`/api/admin/submissions/${approveModal.id}/approve`, { approvedViews });
      toast.success("Подача одобрена");
      setApproveModal(null);
      fetchSubmissions();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Ошибка");
    } finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectionReason) return;
    setActionLoading(true);
    try {
      await api.post(`/api/admin/submissions/${rejectModal.id}/reject`, {
        reason: rejectionReason,
        comment: rejectionComment.trim() || undefined,
      });
      toast.success("Подача отклонена");
      setRejectModal(null);
      setRejectionReason(null);
      setRejectionComment("");
      fetchSubmissions();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Ошибка");
    } finally { setActionLoading(false); }
  };

  const openApprove = (sub: Submission) => {
    closeSheet();
    setApprovedViews(sub.claimedViews);
    setTimeout(() => setApproveModal(sub), 200);
  };

  const openReject = (sub: Submission) => {
    closeSheet();
    setTimeout(() => setRejectModal(sub), 200);
  };

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
            <h1 className="text-lg font-bold text-gray-900 sm:text-xl">Подачи видео</h1>
            <p className="text-xs text-gray-400 mt-0.5">Модерация подач от креаторов</p>
          </div>
          <button
            onClick={fetchSubmissions}
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
              onClick={() => { setStatusFilter(f.value); setPage(1); }}
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
          <div className="flex justify-center py-16"><Spin size="large" /></div>
        ) : data?.data.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 py-16">
            <Empty description="Нет подач" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {data?.data.map((sub) => {
              const st = getStatusConfig(sub.status);
              const sla = sub.status === "submitted" ? getSlaStatus(sub) : null;
              const rpm = sub.ad.rpm ?? 0;
              const gross = (sub.claimedViews / 1000) * rpm;
              const payout = gross * (1 - PLATFORM_COMMISSION_RATE);

              return (
                <div
                  key={sub.id}
                  className={cn(
                    "bg-white rounded-2xl border p-3 sm:p-4 transition-colors",
                    sub.escalated ? "border-red-200 bg-red-50/30" : "border-gray-100",
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Screenshot */}
                    <img
                      src={sub.screenshotUrl}
                      alt=""
                      className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-xl border border-gray-100 shrink-0"
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Title + status */}
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-[15px] text-gray-900 truncate leading-tight">
                          {sub.ad.title}
                        </span>
                        <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2 py-0.5 shrink-0", st.bg, st.text)}>
                          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", st.dot)} />
                          {SUBMISSION_STATUS_LABELS[sub.status] ?? sub.status}
                        </span>
                      </div>

                      {/* Creator + views */}
                      <p className="text-[13px] text-gray-500 truncate mt-0.5 leading-tight">
                        {sub.creator.name} · {sub.claimedViews.toLocaleString("ru")} просмотров
                      </p>

                      {/* Meta row */}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {rpm > 0 && (
                          <span className="text-[12px] text-gray-500 font-medium">
                            {payout.toLocaleString("ru", { maximumFractionDigits: 0 })} ₸
                          </span>
                        )}
                        {sla && (
                          <span className={cn("inline-flex items-center text-[11px] font-medium rounded-full px-2 py-0.5", sla.bg, sla.color)}>
                            SLA: {sla.label}
                          </span>
                        )}
                        <span className="text-[12px] text-gray-400">{smartDate(sub.submittedAt)}</span>
                      </div>
                    </div>

                    {/* Kebab */}
                    <button
                      onClick={() => openSheet(sub)}
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
          current={page}
          total={data?.pagination.totalPages ?? 0}
          onChange={setPage}
        />
      </div>

      {/* ── Bottom Sheet ────────────────────────────────────────────── */}
      <Drawer
        open={sheetOpen}
        onClose={closeSheet}
        placement="bottom"
        size="default"
        closable={false}
        styles={{ wrapper: { borderRadius: "16px 16px 0 0" }, body: { padding: "0 0 env(safe-area-inset-bottom, 16px) 0" } }}
        rootClassName="admin-user-actions-drawer"
      >
        {sheetItem && (() => {
          const rpm = sheetItem.ad.rpm ?? 0;
          const gross = (sheetItem.claimedViews / 1000) * rpm;
          const payout = gross * (1 - PLATFORM_COMMISSION_RATE);
          const comm = gross * PLATFORM_COMMISSION_RATE;

          return (
            <div>
              <div className="flex justify-center pt-3 pb-2"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>

              {/* Preview */}
              <div className="flex items-center gap-3 px-5 pb-3 border-b border-gray-100">
                <img src={sheetItem.screenshotUrl} alt="" className="w-12 h-12 object-cover rounded-xl border border-gray-100 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 text-[15px] truncate">{sheetItem.ad.title}</p>
                  <p className="text-[13px] text-gray-500 truncate">{sheetItem.creator.name} · {sheetItem.claimedViews.toLocaleString("ru")} просмотров</p>
                  {rpm > 0 && (
                    <p className="text-[12px] text-gray-400 mt-0.5">
                      Выплата: {payout.toLocaleString("ru", { maximumFractionDigits: 0 })} ₸ (комиссия: {comm.toLocaleString("ru", { maximumFractionDigits: 0 })} ₸)
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="py-2">
                <ActionSheetButton
                  icon={<PlayCircleOutlined />}
                  label="Открыть видео"
                  color="text-gray-700"
                  onClick={() => { closeSheet(); window.open(sheetItem.videoUrl, "_blank"); }}
                />
                {sheetItem.status === "submitted" && (
                  <>
                    <ActionSheetButton
                      icon={<CheckOutlined />}
                      label="Одобрить"
                      color="text-green-600"
                      onClick={() => openApprove(sheetItem)}
                    />
                    <ActionSheetButton
                      icon={<CloseOutlined />}
                      label="Отклонить"
                      color="text-red-600"
                      onClick={() => openReject(sheetItem)}
                    />
                  </>
                )}
                <div className="mx-4 mt-1 border-t border-gray-100" />
                <ActionSheetButton icon={<CloseOutlined />} label="Отмена" color="text-gray-500" onClick={closeSheet} />
              </div>
            </div>
          );
        })()}
      </Drawer>

      {/* ── Approve Modal ───────────────────────────────────────────── */}
      <Modal
        title="Одобрить подачу"
        open={!!approveModal}
        onCancel={() => setApproveModal(null)}
        onOk={handleApprove}
        okText="Одобрить"
        confirmLoading={actionLoading}
        okButtonProps={{ disabled: !approvedViews || approvedViews < 1 }}
      >
        {approveModal && (
          <div className="space-y-3 mt-3">
            <p className="text-[13px] text-gray-500">Задание: {approveModal.ad.title}</p>
            <p className="text-[13px] text-gray-500">Заявлено: {approveModal.claimedViews.toLocaleString("ru")} просмотров</p>
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1">Засчитанные просмотры</label>
              <InputNumber
                value={approvedViews}
                onChange={(v) => setApprovedViews(v)}
                min={1}
                className="!w-full !rounded-xl"
                size="large"
                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                parser={(v) => (v ? parseFloat(v.replace(/,/g, "")) : 0) as unknown as 0}
              />
            </div>
            {approvedViews && approveModal.ad.rpm && (
              <div className="p-3 bg-green-50 rounded-xl text-[13px] space-y-1">
                <div className="text-green-700 font-medium">
                  Выплата: {((approvedViews / 1000) * approveModal.ad.rpm * (1 - PLATFORM_COMMISSION_RATE)).toLocaleString("ru", { maximumFractionDigits: 0 })} ₸
                </div>
                <div className="text-gray-400">
                  Комиссия: {((approvedViews / 1000) * approveModal.ad.rpm * PLATFORM_COMMISSION_RATE).toLocaleString("ru", { maximumFractionDigits: 0 })} ₸
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Reject Modal ────────────────────────────────────────────── */}
      <Modal
        title="Отклонить подачу"
        open={!!rejectModal}
        onCancel={() => { setRejectModal(null); setRejectionReason(null); setRejectionComment(""); }}
        onOk={handleReject}
        okText="Отклонить"
        okButtonProps={{ danger: true, disabled: !rejectionReason }}
        confirmLoading={actionLoading}
      >
        <div className="space-y-3 mt-3">
          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1">Причина</label>
            <Select
              value={rejectionReason}
              onChange={(v) => setRejectionReason(v)}
              placeholder="Выберите причину"
              className="!w-full"
              size="large"
              options={Object.entries(REJECTION_REASON_LABELS).map(([value, label]) => ({ value, label }))}
            />
          </div>
          {rejectionReason === "other" && (
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1">Комментарий</label>
              <Input.TextArea
                value={rejectionComment}
                onChange={(e) => setRejectionComment(e.target.value)}
                placeholder="Опишите причину"
                rows={3}
                className="!rounded-xl"
              />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
