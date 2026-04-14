"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Spin, Form, Input, InputNumber, Radio, DatePicker, Checkbox, Switch, Modal } from "antd";
import {
  ArrowLeftOutlined,
  StopOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { api } from "@/lib/api-client";
import { formatDate, formatPrice, cn } from "@/lib/utils";
import { toast } from "sonner";
import dayjs from "dayjs";

// ─── Types ──────────────────────────────────────────────────────────────────

interface PromoUsage {
  id: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  createdAt: string;
  user: { id: string; name: string; email: string };
  payment: { id: string; type: string; createdAt: string };
}

interface PromoCodeDetail {
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
  usages: PromoUsage[];
}

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  ad_publication: "Публикация",
  ad_boost: "Буст",
  creator_publication: "Профиль",
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function AdminPromoEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isLoading: authLoading } = useRequireAdmin();
  const router = useRouter();
  const [form] = Form.useForm();
  const [promo, setPromo] = useState<PromoCodeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const discountType = Form.useWatch("discountType", form);

  useEffect(() => {
    if (authLoading) return;
    api.get<PromoCodeDetail>(`/api/admin/promo/${id}`)
      .then((data) => {
        setPromo(data);
        form.setFieldsValue({
          discountType: data.discountType,
          discountValue: data.discountValue,
          maxUses: data.maxUses,
          expiresAt: data.expiresAt ? dayjs(data.expiresAt) : null,
          applicableTo: data.applicableTo,
          isActive: data.isActive,
        });
      })
      .catch(() => toast.error("Не удалось загрузить промокод"))
      .finally(() => setLoading(false));
  }, [authLoading, id, form]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      await api.patch(`/api/admin/promo/${id}`, {
        discountType: values.discountType,
        discountValue: values.discountValue,
        maxUses: values.maxUses || null,
        expiresAt: values.expiresAt ? (values.expiresAt as dayjs.Dayjs).endOf("day").toISOString() : null,
        applicableTo: values.applicableTo,
        isActive: values.isActive,
      });
      toast.success("Промокод обновлён");
      router.push("/admin/promo");
    } catch (err: unknown) {
      const message = err && typeof err === "object" && "message" in err ? (err as { message: string }).message : "Ошибка";
      toast.error(message);
    } finally { setSubmitting(false); }
  };

  const handleDeactivate = () => {
    Modal.confirm({
      title: "Деактивировать промокод?",
      content: `${promo?.code} перестанет работать`,
      okText: "Деактивировать",
      okType: "danger",
      cancelText: "Отмена",
      onOk: async () => {
        try {
          await api.patch(`/api/admin/promo/${id}`, { isActive: false });
          toast.success("Деактивирован");
          setPromo((prev) => (prev ? { ...prev, isActive: false } : null));
          form.setFieldsValue({ isActive: false });
        } catch { toast.error("Ошибка"); }
      },
    });
  };

  if (authLoading || loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Spin size="large" /></div>;
  }

  if (!promo) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-500">Промокод не найден</p></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-6 sm:px-6 sm:py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 shrink-0 transition-colors"
          >
            <ArrowLeftOutlined className="text-sm" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <code className="text-[16px] font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-lg">{promo.code}</code>
              {promo.isActive ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-50 rounded-full px-2 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Активен
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Выкл
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Создан {formatDate(promo.createdAt)} · {promo.usedCount} исп.</p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 mb-4">
          <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark={false}>
            <Form.Item label={<span className="text-[13px] font-medium text-gray-700">Код</span>}>
              <Input value={promo.code} disabled className="!bg-gray-50 !text-gray-500 !font-mono !rounded-xl" size="large" />
            </Form.Item>

            <Form.Item name="isActive" label={<span className="text-[13px] font-medium text-gray-700">Статус</span>} valuePropName="checked">
              <Switch checkedChildren={<CheckCircleOutlined />} unCheckedChildren={<StopOutlined />} />
            </Form.Item>

            <Form.Item name="discountType" label={<span className="text-[13px] font-medium text-gray-700">Тип скидки</span>} rules={[{ required: true }]}>
              <Radio.Group className="w-full">
                <div className="grid grid-cols-2 gap-2">
                  <Radio.Button value="percent" className="!rounded-xl !text-center !h-10 !leading-[38px]">Процент (%)</Radio.Button>
                  <Radio.Button value="fixed_amount" className="!rounded-xl !text-center !h-10 !leading-[38px]">Сумма (₸)</Radio.Button>
                </div>
              </Radio.Group>
            </Form.Item>

            <Form.Item
              name="discountValue"
              label={<span className="text-[13px] font-medium text-gray-700">{discountType === "percent" ? "Скидка (%)" : "Скидка (₸)"}</span>}
              rules={[
                { required: true, message: "Укажите размер" },
                { type: "number", min: 1, message: "Больше 0" },
                ...(discountType === "percent" ? [{ type: "number" as const, max: 100, message: "Макс 100%" }] : []),
              ]}
            >
              <InputNumber min={1} max={discountType === "percent" ? 100 : 999999} className="!w-full !rounded-xl" size="large" suffix={discountType === "percent" ? "%" : "₸"} />
            </Form.Item>

            <div className="grid grid-cols-2 gap-3">
              <Form.Item name="maxUses" label={<span className="text-[13px] font-medium text-gray-700">Лимит</span>} extra={<span className="text-[11px] text-gray-400">Пусто = безлимит</span>}>
                <InputNumber min={1} placeholder="∞" className="!w-full !rounded-xl" size="large" />
              </Form.Item>
              <Form.Item name="expiresAt" label={<span className="text-[13px] font-medium text-gray-700">Истекает</span>} extra={<span className="text-[11px] text-gray-400">Пусто = бессрочно</span>}>
                <DatePicker className="!w-full !rounded-xl" placeholder="Бессрочно" format="DD.MM.YYYY" size="large" />
              </Form.Item>
            </div>

            <Form.Item name="applicableTo" label={<span className="text-[13px] font-medium text-gray-700">Применимо к</span>} rules={[{ required: true, message: "Минимум 1", type: "array", min: 1 }]}>
              <Checkbox.Group className="w-full">
                <div className="flex flex-col gap-2.5">
                  <Checkbox value="ad_publication"><span className="text-[14px]">Публикация объявления</span></Checkbox>
                  <Checkbox value="ad_boost"><span className="text-[14px]">Буст объявления</span></Checkbox>
                  <Checkbox value="creator_publication"><span className="text-[14px]">Профиль креатора</span></Checkbox>
                </div>
              </Checkbox.Group>
            </Form.Item>

            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 h-11 rounded-xl bg-sky-500 text-white text-[15px] font-semibold hover:bg-sky-600 transition-colors disabled:opacity-50 shadow-sm active:scale-[0.98]"
              >
                {submitting ? "Сохранение..." : "Сохранить"}
              </button>
              <button type="button" onClick={() => router.back()} className="h-11 px-5 rounded-xl border border-gray-200 text-[15px] font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Отмена
              </button>
            </div>
          </Form>
        </div>

        {/* Danger zone */}
        {promo.isActive && (
          <div className="bg-white rounded-2xl border border-red-200 p-4 sm:p-5 mb-4">
            <p className="font-semibold text-red-600 text-[14px] mb-1">Опасная зона</p>
            <p className="text-[13px] text-gray-500 mb-3">Промокод перестанет работать при оплате</p>
            <button
              onClick={handleDeactivate}
              className="h-10 px-4 rounded-xl border border-red-200 text-red-600 text-[14px] font-medium hover:bg-red-50 transition-colors flex items-center gap-2"
            >
              <StopOutlined /> Деактивировать
            </button>
          </div>
        )}

        {/* Usage history */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5">
          <h2 className="font-semibold text-gray-900 text-[15px] mb-3">
            История ({promo.usages.length})
          </h2>

          {promo.usages.length === 0 ? (
            <p className="text-[13px] text-gray-400">Промокод ещё не использовался</p>
          ) : (
            <div className="flex flex-col gap-2">
              {promo.usages.map((u) => {
                const typeConf = PAYMENT_TYPE_LABELS[u.payment.type] ?? u.payment.type;
                return (
                  <div key={u.id} className="border border-gray-100 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="min-w-0">
                        <span className="text-[14px] font-medium text-gray-900 truncate">{u.user.name}</span>
                      </div>
                      <span className="text-[11px] font-medium bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 shrink-0">{typeConf}</span>
                    </div>
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="text-gray-500">{formatPrice(u.originalAmount)} → {formatPrice(u.finalAmount)}</span>
                      <span className="text-red-500 font-semibold">-{formatPrice(u.discountAmount)}</span>
                    </div>
                    <p className="text-[12px] text-gray-400 mt-1">{u.user.email} · {formatDate(u.createdAt)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
