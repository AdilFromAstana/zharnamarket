"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Spin, Form, Input, InputNumber, Radio, DatePicker, Checkbox } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import dayjs from "dayjs";

interface PromoFormValues {
  code: string;
  discountType: "percent" | "fixed_amount";
  discountValue: number;
  maxUses: number | null;
  expiresAt: dayjs.Dayjs | null;
  applicableTo: string[];
}

const PRESETS = [
  { label: "Бесплатная публикация", values: { discountType: "percent" as const, discountValue: 100, applicableTo: ["ad_publication"] } },
  { label: "Бесплатный профиль", values: { discountType: "percent" as const, discountValue: 100, applicableTo: ["creator_publication"] } },
  { label: "Скидка 50% на всё", values: { discountType: "percent" as const, discountValue: 50, applicableTo: ["ad_publication", "ad_boost", "creator_publication"] } },
];

export default function AdminPromoNewPage() {
  const { isLoading: authLoading } = useRequireAdmin();
  const router = useRouter();
  const [form] = Form.useForm<PromoFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const discountType = Form.useWatch("discountType", form);

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    form.setFieldsValue(preset.values);
  };

  const handleSubmit = async (values: PromoFormValues) => {
    setSubmitting(true);
    try {
      await api.post("/api/admin/promo", {
        code: values.code.toUpperCase().trim(),
        discountType: values.discountType,
        discountValue: values.discountValue,
        maxUses: values.maxUses || null,
        expiresAt: values.expiresAt ? values.expiresAt.endOf("day").toISOString() : null,
        applicableTo: values.applicableTo,
      });
      toast.success("Промокод создан");
      router.push("/admin/promo");
    } catch (err: unknown) {
      const message = err && typeof err === "object" && "message" in err ? (err as { message: string }).message : "Ошибка при создании промокода";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Spin size="large" /></div>;
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
            <h1 className="text-lg font-bold text-gray-900 sm:text-xl">Новый промокод</h1>
          </div>
        </div>

        {/* Presets */}
        <div className="mb-5">
          <p className="text-[13px] font-medium text-gray-500 mb-2">Быстрые шаблоны</p>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => applyPreset(preset)}
                className="shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-[13px] font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors active:scale-[0.98]"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              discountType: "percent",
              discountValue: undefined,
              maxUses: null,
              expiresAt: null,
              applicableTo: ["ad_publication"],
            }}
            requiredMark={false}
          >
            <Form.Item
              name="code"
              label={<span className="text-[13px] font-medium text-gray-700">Код промокода</span>}
              rules={[
                { required: true, message: "Введите код" },
                { min: 3, message: "Минимум 3 символа" },
              ]}
              extra={<span className="text-[12px] text-gray-400">Автоматически в UPPERCASE</span>}
            >
              <Input placeholder="FREE100" style={{ textTransform: "uppercase" }} maxLength={30} className="!rounded-xl" size="large" />
            </Form.Item>

            <Form.Item
              name="discountType"
              label={<span className="text-[13px] font-medium text-gray-700">Тип скидки</span>}
              rules={[{ required: true }]}
            >
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
                ...(discountType === "percent" ? [{ type: "number" as const, max: 100, message: "Максимум 100%" }] : []),
              ]}
            >
              <InputNumber
                min={1}
                max={discountType === "percent" ? 100 : 999999}
                placeholder={discountType === "percent" ? "50" : "500"}
                className="!w-full !rounded-xl"
                size="large"
                suffix={discountType === "percent" ? "%" : "₸"}
              />
            </Form.Item>

            <div className="grid grid-cols-2 gap-3">
              <Form.Item
                name="maxUses"
                label={<span className="text-[13px] font-medium text-gray-700">Лимит</span>}
                extra={<span className="text-[11px] text-gray-400">Пусто = безлимит</span>}
              >
                <InputNumber min={1} placeholder="∞" className="!w-full !rounded-xl" size="large" />
              </Form.Item>

              <Form.Item
                name="expiresAt"
                label={<span className="text-[13px] font-medium text-gray-700">Истекает</span>}
                extra={<span className="text-[11px] text-gray-400">Пусто = бессрочно</span>}
              >
                <DatePicker
                  className="!w-full !rounded-xl"
                  placeholder="Бессрочно"
                  disabledDate={(d) => d.isBefore(dayjs(), "day")}
                  format="DD.MM.YYYY"
                  size="large"
                />
              </Form.Item>
            </div>

            <Form.Item
              name="applicableTo"
              label={<span className="text-[13px] font-medium text-gray-700">Применимо к</span>}
              rules={[{ required: true, message: "Выберите хотя бы один тип", type: "array", min: 1 }]}
            >
              <Checkbox.Group className="w-full">
                <div className="flex flex-col gap-2.5">
                  <Checkbox value="ad_publication">
                    <span className="text-[14px]">Публикация объявления <span className="text-gray-400 text-[12px]">(990 ₸)</span></span>
                  </Checkbox>
                  <Checkbox value="ad_boost">
                    <span className="text-[14px]">Буст объявления</span>
                  </Checkbox>
                  <Checkbox value="creator_publication">
                    <span className="text-[14px]">Профиль креатора <span className="text-gray-400 text-[12px]">(990 ₸)</span></span>
                  </Checkbox>
                </div>
              </Checkbox.Group>
            </Form.Item>

            {/* Submit */}
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 h-11 rounded-xl bg-sky-500 text-white text-[15px] font-semibold hover:bg-sky-600 transition-colors disabled:opacity-50 shadow-sm active:scale-[0.98]"
              >
                {submitting ? "Создание..." : "Создать промокод"}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="h-11 px-5 rounded-xl border border-gray-200 text-[15px] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Отмена
              </button>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}
