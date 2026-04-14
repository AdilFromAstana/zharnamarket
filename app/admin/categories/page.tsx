"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Tabs, Modal, Form, Input, InputNumber, Switch, Spin, Drawer } from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  ReloadOutlined,
  MoreOutlined,
  CloseOutlined,
  CheckOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CategoryItem {
  id: string;
  key: string;
  label: string;
  description: string | null;
  icon: string | null;
  isActive: boolean;
  sortOrder: number;
  _count: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

type CategoryType = "video-formats" | "ad-formats" | "ad-subjects";

const TAB_CONFIG: Record<CategoryType, { title: string; description: string }> = {
  "video-formats": {
    title: "Видео",
    description: "Тип видео-контента: нарезки из фильмов, мемы, блог, стримы и т.д.",
  },
  "ad-formats": {
    title: "Реклама",
    description: "Способ подачи рекламы: хук, баннер, бегущая строка и т.д.",
  },
  "ad-subjects": {
    title: "Продукт",
    description: "Что рекламируется: товар, услуга, акция и т.д.",
  },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function totalUsage(item: CategoryItem) {
  return Object.values(item._count ?? {}).reduce((s, c) => s + c, 0);
}

// ─── Shared action button ───────────────────────────────────────────────────

function ActionSheetButton({ icon, label, color, onClick }: { icon: React.ReactNode; label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn("w-full flex items-center gap-3 px-5 py-3.5 text-left text-[15px] font-medium transition-colors active:bg-gray-50", color)}
    >
      <span className="text-lg w-5 flex items-center justify-center">{icon}</span>
      {label}
    </button>
  );
}

// ─── Category List (card-based) ─────────────────────────────────────────────

function CategoryList({ type }: { type: CategoryType }) {
  const [items, setItems] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  // Bottom sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetItem, setSheetItem] = useState<CategoryItem | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: CategoryItem[] }>(`/api/admin/${type}`);
      setItems(res.data ?? []);
    } catch {
      toast.error("Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openSheet = (item: CategoryItem) => { setSheetItem(item); setSheetOpen(true); };
  const closeSheet = () => { setSheetOpen(false); setTimeout(() => setSheetItem(null), 300); };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ isActive: true, sortOrder: items.length + 1 });
    setModalOpen(true);
  };

  const openEdit = (item: CategoryItem) => {
    closeSheet();
    setEditing(item);
    form.setFieldsValue({
      key: item.key,
      label: item.label,
      description: item.description ?? "",
      icon: item.icon ?? "",
      sortOrder: item.sortOrder,
      isActive: item.isActive,
    });
    setTimeout(() => setModalOpen(true), 200);
  };

  const handleSave = async (values: Record<string, unknown>) => {
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/api/admin/${type}/${editing.id}`, values);
        toast.success("Обновлено");
      } else {
        await api.post(`/api/admin/${type}`, values);
        toast.success("Создано");
      }
      setModalOpen(false);
      fetchItems();
    } catch (err: any) {
      toast.error(err?.message ?? "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: CategoryItem) => {
    closeSheet();
    const usage = totalUsage(item);
    if (usage > 0) {
      toast.error("Нельзя удалить — категория используется. Деактивируйте вместо этого.");
      return;
    }
    Modal.confirm({
      title: "Удалить категорию?",
      content: `${item.icon ?? ""} ${item.label} — действие нельзя отменить`,
      okText: "Удалить",
      okType: "danger",
      cancelText: "Отмена",
      onOk: async () => {
        try {
          await api.delete(`/api/admin/${type}/${item.id}`);
          toast.success("Удалено");
          fetchItems();
        } catch (err: any) {
          toast.error(err?.message ?? "Ошибка удаления");
        }
      },
    });
  };

  const handleToggleActive = async (item: CategoryItem) => {
    closeSheet();
    try {
      await api.patch(`/api/admin/${type}/${item.id}`, { isActive: !item.isActive });
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isActive: !item.isActive } : i)));
      toast.success(item.isActive ? "Деактивировано" : "Активировано");
    } catch (err: any) {
      toast.error(err?.message ?? "Ошибка");
    }
  };

  return (
    <div>
      {/* Description + Add button */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <p className="text-[13px] text-gray-500 leading-snug">{TAB_CONFIG[type].description}</p>
        <button
          onClick={openCreate}
          className="shrink-0 w-9 h-9 rounded-xl bg-sky-500 text-white flex items-center justify-center hover:bg-sky-600 transition-colors shadow-sm"
        >
          <PlusOutlined className="text-sm" />
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><Spin size="large" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">Категорий пока нет</div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => {
            const usage = totalUsage(item);
            return (
              <div
                key={item.id}
                className={cn(
                  "bg-white rounded-2xl border p-3 sm:p-4 transition-colors",
                  item.isActive ? "border-gray-100" : "border-gray-200 bg-gray-50/50 opacity-60",
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Icon + sort order */}
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0 text-lg">
                    {item.icon || <span className="text-[13px] text-gray-300 font-mono">#{item.sortOrder}</span>}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Name + active status */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-[15px] text-gray-900 truncate leading-tight">
                        {item.label}
                      </span>
                      {item.isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-50 rounded-full px-2 py-0.5 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                          Активна
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                          Выкл
                        </span>
                      )}
                    </div>

                    {/* Key */}
                    <p className="text-[12px] text-gray-400 font-mono mt-0.5">{item.key}</p>

                    {/* Description (if any) */}
                    {item.description && (
                      <p className="text-[13px] text-gray-500 mt-0.5 line-clamp-2 leading-snug">{item.description}</p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-3 mt-1.5">
                      {usage > 0 ? (
                        <span className="inline-flex items-center text-[12px] text-sky-600 bg-sky-50 rounded-full px-2 py-0.5 font-medium">
                          {usage} исп.
                        </span>
                      ) : (
                        <span className="text-[12px] text-gray-300">0 исп.</span>
                      )}
                    </div>
                  </div>

                  {/* Kebab */}
                  <button
                    onClick={() => openSheet(item)}
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

      {/* ── Bottom Sheet ───────────────────────────────────────────── */}
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
        {sheetItem && (
          <div>
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* Preview */}
            <div className="flex items-center gap-3 px-5 pb-3 border-b border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0 text-lg">
                {sheetItem.icon || <span className="text-[13px] text-gray-300 font-mono">#{sheetItem.sortOrder}</span>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900 text-[15px] truncate">{sheetItem.label}</p>
                <p className="text-[12px] text-gray-400 font-mono">{sheetItem.key}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="py-2">
              <ActionSheetButton
                icon={<EditOutlined />}
                label="Редактировать"
                color="text-gray-700"
                onClick={() => openEdit(sheetItem)}
              />
              <ActionSheetButton
                icon={sheetItem.isActive ? <StopOutlined /> : <CheckOutlined />}
                label={sheetItem.isActive ? "Деактивировать" : "Активировать"}
                color={sheetItem.isActive ? "text-amber-600" : "text-green-600"}
                onClick={() => handleToggleActive(sheetItem)}
              />
              <ActionSheetButton
                icon={<DeleteOutlined />}
                label={totalUsage(sheetItem) > 0 ? "Удалить (используется)" : "Удалить"}
                color={totalUsage(sheetItem) > 0 ? "text-gray-400" : "text-red-600"}
                onClick={() => handleDelete(sheetItem)}
              />
              <div className="mx-4 mt-1 border-t border-gray-100" />
              <ActionSheetButton icon={<CloseOutlined />} label="Отмена" color="text-gray-500" onClick={closeSheet} />
            </div>
          </div>
        )}
      </Drawer>

      {/* ── Create/Edit Modal ──────────────────────────────────────── */}
      <Modal
        title={editing ? "Редактировать" : "Создать категорию"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        forceRender
      >
        <Form form={form} layout="vertical" onFinish={handleSave} className="mt-4">
          <Form.Item
            name="key"
            label="Ключ (латиница)"
            rules={[
              { required: true, message: "Ключ обязателен" },
              { pattern: /^[A-Za-z][A-Za-z0-9]*$/, message: "Только латиница и цифры" },
            ]}
          >
            <Input placeholder="FilmClips" disabled={!!editing} className="!rounded-xl" />
          </Form.Item>

          <Form.Item
            name="label"
            label="Название"
            rules={[{ required: true, message: "Название обязательно" }]}
          >
            <Input placeholder="Нарезки из фильмов" className="!rounded-xl" />
          </Form.Item>

          <Form.Item name="description" label="Описание">
            <Input.TextArea rows={3} placeholder="Подробное описание" className="!rounded-xl" />
          </Form.Item>

          <div className="flex gap-4">
            <Form.Item name="icon" label="Иконка" className="flex-1">
              <Input placeholder="Emoji" className="!rounded-xl" />
            </Form.Item>
            <Form.Item name="sortOrder" label="Порядок" className="w-24">
              <InputNumber min={0} className="w-full" />
            </Form.Item>
            <Form.Item name="isActive" label="Активна" valuePropName="checked">
              <Switch />
            </Form.Item>
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-sky-500 text-white text-sm font-medium hover:bg-sky-600 transition-colors disabled:opacity-50 shadow-sm"
            >
              {saving ? "Сохранение..." : editing ? "Сохранить" : "Создать"}
            </button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function AdminCategoriesPage() {
  const router = useRouter();
  const { isLoading: authLoading } = useRequireAdmin();

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Spin size="large" /></div>;
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
            <h1 className="text-lg font-bold text-gray-900 sm:text-xl">Категории</h1>
            <p className="text-xs text-gray-400 mt-0.5">Форматы видео, рекламы и типы продукта</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          defaultActiveKey="video-formats"
          items={Object.entries(TAB_CONFIG).map(([key, conf]) => ({
            key,
            label: conf.title,
            children: <CategoryList type={key as CategoryType} />,
          }))}
        />
      </div>
    </div>
  );
}
