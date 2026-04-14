"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Spin, Empty, Input, Modal, Drawer } from "antd";
import {
  PlusOutlined,
  CopyOutlined,
  EditOutlined,
  StopOutlined,
  CheckCircleOutlined,
  ArrowLeftOutlined,
  SearchOutlined,
  MoreOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { api } from "@/lib/api-client";
import { formatDate, cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────────────

interface PromoCode {
  id: string;
  code: string;
  discountType: "percent" | "fixed_amount";
  discountValue: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  applicableTo: string[];
  isActive: boolean;
  createdAt: string;
  _count: { usages: number };
}

const APPLICABLE_CONFIG: Record<string, { label: string; text: string; bg: string }> = {
  ad_publication:      { label: "Публикация", text: "text-blue-700",   bg: "bg-blue-50" },
  ad_boost:            { label: "Буст",       text: "text-violet-700", bg: "bg-violet-50" },
  creator_publication: { label: "Профиль",    text: "text-cyan-700",   bg: "bg-cyan-50" },
};

type FilterStatus = "all" | "active" | "inactive";

function ActionSheetButton({ icon, label, color, onClick }: { icon: React.ReactNode; label: string; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("w-full flex items-center gap-3 px-5 py-3.5 text-left text-[15px] font-medium transition-colors active:bg-gray-50", color)}>
      <span className="text-lg w-5 flex items-center justify-center">{icon}</span>
      {label}
    </button>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AdminPromoListPage() {
  const { isLoading: authLoading } = useRequireAdmin();
  const router = useRouter();
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");

  // Bottom sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetItem, setSheetItem] = useState<PromoCode | null>(null);
  const openSheet = (p: PromoCode) => { setSheetItem(p); setSheetOpen(true); };
  const closeSheet = () => { setSheetOpen(false); setTimeout(() => setSheetItem(null), 300); };

  const loadPromos = useCallback(async () => {
    try {
      const res = await api.get<{ data: PromoCode[] }>("/api/admin/promo");
      setPromos(res.data);
    } catch { toast.error("Не удалось загрузить промокоды"); } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (!authLoading) loadPromos(); }, [authLoading, loadPromos]);

  const handleToggleActive = async (promo: PromoCode) => {
    closeSheet();
    const newActive = !promo.isActive;
    Modal.confirm({
      title: `${newActive ? "Активировать" : "Деактивировать"} промокод?`,
      content: `Промокод ${promo.code}`,
      okText: newActive ? "Активировать" : "Деактивировать",
      okType: newActive ? "primary" : "danger",
      cancelText: "Отмена",
      onOk: async () => {
        try {
          await api.patch(`/api/admin/promo/${promo.id}`, { isActive: newActive });
          toast.success(`Промокод ${newActive ? "активирован" : "деактивирован"}`);
          loadPromos();
        } catch { toast.error("Ошибка при обновлении"); }
      },
    });
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Скопировано");
  };

  const filteredPromos = promos.filter((p) => {
    if (filter === "active" && !p.isActive) return false;
    if (filter === "inactive" && p.isActive) return false;
    if (search && !p.code.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const formatDiscount = (p: PromoCode) =>
    p.discountType === "percent" ? `${p.discountValue}%` : `${p.discountValue.toLocaleString("ru")} ₸`;

  if (authLoading || loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Spin size="large" /></div>;
  }

  const activeCount = promos.filter((p) => p.isActive).length;
  const totalUsages = promos.reduce((sum, p) => sum + p.usedCount, 0);

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
            <h1 className="text-lg font-bold text-gray-900 sm:text-xl">Промокоды</h1>
            <p className="text-xs text-gray-400 mt-0.5">{activeCount} активных · {totalUsages} использований</p>
          </div>
          <Link
            href="/admin/promo/new"
            className="w-9 h-9 rounded-xl bg-sky-500 text-white flex items-center justify-center hover:bg-sky-600 transition-colors shadow-sm shrink-0"
          >
            <PlusOutlined className="text-sm" />
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
            <div className="text-xl font-bold text-gray-900">{promos.length}</div>
            <div className="text-[11px] text-gray-400">Всего</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
            <div className="text-xl font-bold text-green-600">{activeCount}</div>
            <div className="text-[11px] text-gray-400">Активных</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
            <div className="text-xl font-bold text-sky-600">{totalUsages}</div>
            <div className="text-[11px] text-gray-400">Использований</div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-4">
          <Input
            placeholder="Поиск по коду..."
            prefix={<SearchOutlined className="text-gray-400" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            className="!rounded-xl"
            size="large"
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 mb-5">
          {([
            { value: "all" as const, label: "Все" },
            { value: "active" as const, label: "Активные" },
            { value: "inactive" as const, label: "Неактивные" },
          ]).map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors",
                filter === f.value ? "bg-sky-500 text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        {filteredPromos.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 py-16">
            <Empty description={search ? "Ничего не найдено" : "Промокодов пока нет"} image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredPromos.map((promo) => (
              <div
                key={promo.id}
                className={cn(
                  "bg-white rounded-2xl border p-3 sm:p-4 transition-colors",
                  promo.isActive ? "border-gray-100" : "border-gray-200 opacity-60",
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Code + status */}
                    <div className="flex items-center gap-2 min-w-0">
                      <code className="text-[15px] font-bold text-gray-900 bg-gray-50 px-2 py-0.5 rounded-lg">
                        {promo.code}
                      </code>
                      <button onClick={() => copyCode(promo.code)} className="text-gray-300 hover:text-gray-500 transition-colors">
                        <CopyOutlined className="text-[13px]" />
                      </button>
                      {promo.isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-50 rounded-full px-2 py-0.5 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" /> Активен
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" /> Выкл
                        </span>
                      )}
                    </div>

                    {/* Discount + usage + expiry */}
                    <div className="flex items-center gap-2 mt-1.5 text-[13px] text-gray-500 flex-wrap">
                      <span className="font-semibold text-gray-700">-{formatDiscount(promo)}</span>
                      <span className="text-gray-300">·</span>
                      <span>{promo.usedCount}{promo.maxUses !== null ? ` / ${promo.maxUses}` : ""} исп.</span>
                      <span className="text-gray-300">·</span>
                      <span>{promo.expiresAt ? `До ${formatDate(promo.expiresAt)}` : "Бессрочно"}</span>
                    </div>

                    {/* Applicable to pills */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {promo.applicableTo.map((t) => {
                        const conf = APPLICABLE_CONFIG[t] ?? { label: t, text: "text-gray-600", bg: "bg-gray-100" };
                        return (
                          <span key={t} className={cn("text-[11px] font-medium rounded-full px-2 py-0.5", conf.bg, conf.text)}>
                            {conf.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Kebab */}
                  <button
                    onClick={() => openSheet(promo)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors shrink-0 -mr-1 -mt-0.5"
                  >
                    <MoreOutlined className="text-lg" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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
        {sheetItem && (
          <div>
            <div className="flex justify-center pt-3 pb-2"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
            <div className="px-5 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <code className="text-[15px] font-bold text-gray-900 bg-gray-50 px-2 py-0.5 rounded-lg">{sheetItem.code}</code>
                <span className="font-semibold text-gray-700 text-[14px]">-{formatDiscount(sheetItem)}</span>
              </div>
              <p className="text-[12px] text-gray-400 mt-1">{sheetItem.usedCount} исп. · {sheetItem.expiresAt ? `До ${formatDate(sheetItem.expiresAt)}` : "Бессрочно"}</p>
            </div>
            <div className="py-2">
              <ActionSheetButton
                icon={<CopyOutlined />}
                label="Скопировать код"
                color="text-gray-700"
                onClick={() => { copyCode(sheetItem.code); closeSheet(); }}
              />
              <ActionSheetButton
                icon={<EditOutlined />}
                label="Редактировать"
                color="text-gray-700"
                onClick={() => { closeSheet(); router.push(`/admin/promo/${sheetItem.id}`); }}
              />
              <ActionSheetButton
                icon={sheetItem.isActive ? <StopOutlined /> : <CheckCircleOutlined />}
                label={sheetItem.isActive ? "Деактивировать" : "Активировать"}
                color={sheetItem.isActive ? "text-red-600" : "text-green-600"}
                onClick={() => handleToggleActive(sheetItem)}
              />
              <div className="mx-4 mt-1 border-t border-gray-100" />
              <ActionSheetButton icon={<CloseOutlined />} label="Отмена" color="text-gray-500" onClick={closeSheet} />
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
