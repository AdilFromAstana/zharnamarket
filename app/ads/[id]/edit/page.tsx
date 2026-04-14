"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Form,
  Input,
  Select,
  Breadcrumb,
  Card,
  InputNumber,
  Space,
  Spin,
} from "antd";
import {
  ArrowRightOutlined,
  CheckOutlined,
  YoutubeOutlined,
  CameraOutlined,
  PlaySquareOutlined,
  DollarOutlined,
  EyeOutlined,
  PercentageOutlined,
  MessageOutlined,
} from "@ant-design/icons";
import { useParams, useRouter } from "next/navigation";
import PublicLayout from "@/components/layout/PublicLayout";
import StickyBottomBar from "@/components/ui/StickyBottomBar";
import { CITIES, CATEGORIES } from "@/lib/constants";
import { CITY_TO_ENUM, CATEGORY_TO_ENUM } from "@/lib/enum-maps";
import type { BudgetType } from "@/lib/types/ad";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import RichTextEditor from "@/components/ui/RichTextEditor";

const { TextArea } = Input;

const PLATFORMS = ["TikTok", "Instagram", "YouTube"];

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  TikTok: <PlaySquareOutlined />,
  Instagram: <CameraOutlined />,
  YouTube: <YoutubeOutlined />,
};

const BUDGET_TYPE_OPTIONS: {
  value: BudgetType;
  icon: React.ReactNode;
  label: string;
  hint: string;
  placeholder?: string;
}[] = [
  {
    value: "fixed",
    icon: <DollarOutlined />,
    label: "Фиксированная сумма за видео",
    hint: "Укажите диапазон — это помогает авторам понять, стоит ли откликаться",
  },
  {
    value: "per_views",
    icon: <EyeOutlined />,
    label: "За просмотры",
    hint: "Вы платите зависимо от количества просмотров — договоритесь напрямую",
    placeholder: "Например: 5,000 ₸ за каждые 100,000 просмотров",
  },
  {
    value: "revenue",
    icon: <PercentageOutlined />,
    label: "Процент от продаж",
    hint: "Автор получает % с покупок по его ссылке или промокоду",
    placeholder: "Например: 10% с каждой покупки по промокоду CREATOR10",
  },
  {
    value: "negotiable",
    icon: <MessageOutlined />,
    label: "Обсудим индивидуально",
    hint: "Напишите в Telegram — договоритесь на месте",
  },
];

export default function AdEditPage() {
  // Защита страницы — редирект если не авторизован
  useRequireAuth();

  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [platform, setPlatform] = useState<string>("");
  const [budgetType, setBudgetType] = useState<BudgetType | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Category dimension options
  const [videoFormats, setVideoFormats] = useState<
    Array<{ id: string; key: string; label: string; icon?: string | null }>
  >([]);
  const [adFormats, setAdFormats] = useState<
    Array<{ id: string; key: string; label: string; icon?: string | null }>
  >([]);
  const [adSubjects, setAdSubjects] = useState<
    Array<{ id: string; key: string; label: string; icon?: string | null }>
  >([]);

  // Load category options
  useEffect(() => {
    Promise.all([
      api.get<{ data: typeof videoFormats }>("/api/video-formats"),
      api.get<{ data: typeof adFormats }>("/api/ad-formats"),
      api.get<{ data: typeof adSubjects }>("/api/ad-subjects"),
    ])
      .then(([vf, af, as_]) => {
        setVideoFormats(vf.data ?? []);
        setAdFormats(af.data ?? []);
        setAdSubjects(as_.data ?? []);
      })
      .catch(() => {});
  }, []);

  // Загружаем данные объявления и предзаполняем форму через реальный API
  useEffect(() => {
    if (!id) return;

    setLoadingData(true);
    api
      .get<Record<string, unknown>>(`/api/tasks/${id}`)
      .then((ad) => {
        setPlatform((ad.platform as string) ?? "");
        setBudgetType((ad.budgetType as BudgetType) ?? null);
        form.setFieldsValue({
          title: ad.title,
          platform: ad.platform,
          city: ad.city,
          category: ad.category,
          description: ad.description,
          budgetType: ad.budgetType,
          budgetFrom: ad.budgetFrom ?? undefined,
          budgetTo: ad.budgetTo ?? undefined,
          budgetDetails: ad.budgetDetails ?? undefined,
          telegram:
            ((ad.contactTelegram as string) ?? "").replace("@", "") || "",
          whatsapp: (ad.contactWhatsapp as string) ?? "",
          videoFormatId: (ad as any).videoFormatId ?? undefined,
          adFormatId: (ad as any).adFormatId ?? undefined,
          adSubjectId: (ad as any).adSubjectId ?? undefined,
        });
      })
      .catch((err) => {
        console.error("[AdEditPage] load error:", err);
        setNotFound(true);
      })
      .finally(() => {
        setLoadingData(false);
      });
  }, [id, form]);

  const handleSubmit = async () => {
    try {
      await form.validateFields();
    } catch {
      return;
    }

    const values = form.getFieldsValue();

    setLoading(true);
    try {
      await api.put(`/api/tasks/${id}`, {
        title: values.title,
        platform: values.platform,
        city: values.city,
        category: values.category,
        description: values.description,
        budgetType: values.budgetType,
        budgetFrom: values.budgetFrom ?? null,
        budgetTo: values.budgetTo ?? null,
        budgetDetails: values.budgetDetails ?? null,
        contacts: {
          telegram: values.telegram ? `@${values.telegram}` : null,
          whatsapp: values.whatsapp || null,
          phone: null,
          email: null,
        },
        videoFormatId: values.videoFormatId ?? null,
        adFormatId: values.adFormatId ?? null,
        adSubjectId: values.adSubjectId ?? null,
      });
      toast.success("Объявление обновлено!");
      router.push("/ads/manage");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Ошибка при сохранении";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <PublicLayout>
        <div className="flex items-center justify-center py-20">
          <Spin size="large" />
        </div>
      </PublicLayout>
    );
  }

  if (notFound) {
    return (
      <PublicLayout>
        <div className="text-center py-20">
          <p className="text-gray-400 text-lg">Объявление не найдено</p>
          <Link href="/ads/manage" className="text-sky-600 text-sm mt-4 block">
            ← Вернуться к объявлениям
          </Link>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <Breadcrumb
        className="mb-4"
        items={[
          { title: <Link href="/">Главная</Link> },
          { title: <Link href="/ads/manage">Мои объявления</Link> },
          { title: "Редактировать" },
        ]}
      />

      {/* Sticky Step Header */}
      <div className="sticky top-0 z-10 bg-white -mx-4 px-4 pt-3 pb-3 mb-5 border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest mb-0.5">
              Редактирование
            </p>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">
              Изменить объявление
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto pb-28">
        <Form form={form} name="edit_ad" layout="vertical" size="large">
          <Card className="border-gray-200 shadow-sm mb-4">
            {/* Название */}
            <Form.Item
              label="Название объявления"
              name="title"
              rules={[
                { required: true, message: "Введите название" },
                { min: 10, message: "Минимум 10 символов" },
              ]}
            >
              <Input placeholder="Например: Нужен TikTok-блогер для обзора нашего кафе" />
            </Form.Item>

            {/* Платформа */}
            <Form.Item
              label="Платформа"
              name="platform"
              rules={[{ required: true, message: "Выберите платформу" }]}
            >
              <div className="flex gap-3 flex-wrap">
                {PLATFORMS.map((p) => {
                  const selected = platform === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        form.setFieldValue("platform", p);
                        setPlatform(p);
                      }}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-full border-2 text-sm font-medium transition-all cursor-pointer min-h-[44px] ${
                        selected
                          ? "border-blue-500 bg-blue-50 text-blue-600"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <span className="text-base leading-none">
                        {PLATFORM_ICONS[p]}
                      </span>
                      {p}
                    </button>
                  );
                })}
              </div>
            </Form.Item>

            <div className="grid grid-cols-2 gap-4">
              <Form.Item
                label="Город"
                name="city"
                rules={[{ required: true, message: "Выберите город" }]}
              >
                <Select
                  placeholder="Выберите город"
                  options={CITIES.map((c) => ({
                    label: c,
                    value: CITY_TO_ENUM[c] ?? c,
                  }))}
                />
              </Form.Item>

              <Form.Item
                label="Категория"
                name="category"
                rules={[{ required: true, message: "Выберите категорию" }]}
              >
                <Select
                  placeholder="Категория"
                  options={CATEGORIES.map((c) => ({
                    label: c,
                    value: CATEGORY_TO_ENUM[c] ?? c,
                  }))}
                />
              </Form.Item>
            </div>

            {/* Новые категорийные измерения */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-4">
              <Form.Item label="Формат видео" name="videoFormatId">
                <Select
                  placeholder="Выберите формат"
                  allowClear
                  options={videoFormats.map((vf) => ({
                    label: `${vf.icon ?? ""} ${vf.label}`.trim(),
                    value: vf.id,
                  }))}
                />
              </Form.Item>
              <Form.Item label="Формат рекламы" name="adFormatId">
                <Select
                  placeholder="Выберите формат"
                  allowClear
                  options={adFormats.map((af) => ({
                    label: `${af.icon ?? ""} ${af.label}`.trim(),
                    value: af.id,
                  }))}
                />
              </Form.Item>
              <Form.Item label="Что рекламируется" name="adSubjectId">
                <Select
                  placeholder="Выберите тип"
                  allowClear
                  options={adSubjects.map((as_) => ({
                    label: `${as_.icon ?? ""} ${as_.label}`.trim(),
                    value: as_.id,
                  }))}
                />
              </Form.Item>
            </div>

            <Form.Item
              label="Описание задания"
              name="description"
              rules={[{ required: true, message: "Опишите задание" }]}
            >
              <RichTextEditor placeholder="Опишите задание подробно..." />
            </Form.Item>
          </Card>

          <Card className="border-gray-200 shadow-sm mb-4">
            {/* Модель оплаты */}
            <Form.Item
              label={
                <span className="font-semibold text-gray-900">
                  Как вы платите блогеру?{" "}
                  <span className="text-red-500">*</span>
                </span>
              }
              name="budgetType"
              rules={[{ required: true, message: "Выберите модель оплаты" }]}
            >
              <div className="space-y-2">
                {BUDGET_TYPE_OPTIONS.map((opt) => {
                  const isSelected = budgetType === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setBudgetType(opt.value);
                        form.setFieldValue("budgetType", opt.value);
                      }}
                      className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all cursor-pointer min-h-[52px] ${
                        isSelected
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-lg shrink-0 ${isSelected ? "text-blue-600" : "text-gray-400"}`}
                        >
                          {opt.icon}
                        </span>
                        <span
                          className={`flex-1 text-sm font-medium ${isSelected ? "text-blue-700" : "text-gray-700"}`}
                        >
                          {opt.label}
                        </span>
                        {isSelected && (
                          <CheckOutlined className="text-blue-600 shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Form.Item>

            {budgetType && (
              <div className="mb-4">
                <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-500 mb-3">
                  {
                    BUDGET_TYPE_OPTIONS.find((o) => o.value === budgetType)
                      ?.hint
                  }
                </div>

                {budgetType === "fixed" && (
                  <div className="flex gap-3 items-center">
                    <Form.Item
                      name="budgetFrom"
                      noStyle
                      rules={[{ required: true, message: "Укажите сумму от" }]}
                    >
                      <InputNumber
                        placeholder="от ₸"
                        min={0}
                        step={1000}
                        style={{ flex: 1 }}
                        formatter={(v) =>
                          `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                        }
                        parser={(v) =>
                          (v
                            ? parseFloat(v.replace(/,/g, ""))
                            : 0) as unknown as 0
                        }
                      />
                    </Form.Item>
                    <span className="text-gray-400 shrink-0">—</span>
                    <Form.Item name="budgetTo" noStyle>
                      <InputNumber
                        placeholder="до ₸ (необязательно)"
                        min={0}
                        step={1000}
                        style={{ flex: 1 }}
                        formatter={(v) =>
                          `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                        }
                        parser={(v) =>
                          (v
                            ? parseFloat(v.replace(/,/g, ""))
                            : 0) as unknown as 0
                        }
                      />
                    </Form.Item>
                  </div>
                )}

                {(budgetType === "per_views" || budgetType === "revenue") && (
                  <Form.Item
                    name="budgetDetails"
                    rules={[
                      { required: true, message: "Опишите условие оплаты" },
                    ]}
                    noStyle
                  >
                    <Input
                      placeholder={
                        BUDGET_TYPE_OPTIONS.find((o) => o.value === budgetType)
                          ?.placeholder
                      }
                      size="large"
                    />
                  </Form.Item>
                )}
              </div>
            )}
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-1">
              Контакты для связи
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Авторы напишут напрямую вам
            </p>

            <Form.Item
              label="Telegram"
              name="telegram"
              rules={[{ required: true, message: "Telegram обязателен" }]}
            >
              <Space.Compact style={{ width: "100%" }}>
                <Input
                  defaultValue="@"
                  readOnly
                  style={{
                    width: 40,
                    flexShrink: 0,
                    textAlign: "center",
                    padding: "0 8px",
                  }}
                />
                <Input placeholder="username" style={{ flex: 1 }} />
              </Space.Compact>
            </Form.Item>

            <Form.Item label="WhatsApp" name="whatsapp">
              <Input placeholder="+7 (000) 000-00-00" />
            </Form.Item>
          </Card>
        </Form>
      </div>

      <StickyBottomBar
        primaryLabel="Сохранить изменения"
        onPrimary={handleSubmit}
        primaryIcon={<ArrowRightOutlined />}
        primaryLoading={loading}
        onBack={() => router.push("/ads/manage")}
        isFirstStep={true}
        cancelHref="/ads/manage"
      />
    </PublicLayout>
  );
}
