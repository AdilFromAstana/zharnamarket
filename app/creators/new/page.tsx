"use client";

import { useState, useEffect } from "react";
import {
  Form,
  Input,
  Button,
  Select,
  InputNumber,
  AutoComplete,
  Radio,
  Space,
  Breadcrumb,
} from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import {
  SendOutlined,
  ArrowRightOutlined,
  BulbOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CITIES, PLATFORMS, CATEGORIES, STORAGE_KEYS } from "@/lib/constants";
import { toast } from "sonner";
import PublicLayout from "@/components/layout/PublicLayout";
import StickyBottomBar from "@/components/ui/StickyBottomBar";
import { api, ApiError } from "@/lib/api-client";
import { useRequireAuth } from "@/hooks/useRequireAuth";

interface AdFormatOption {
  id: string;
  key: string;
  label: string;
}

const QUICK_ADD_FORMATS = [
  "Нативная интеграция",
  "Баннер на видео",
  "Хук (зацепка)",
  "Полный рекламный ролик",
];

function buildPriceLabel(platform: string | undefined, adFormatLabel: string): string {
  return platform ? `${platform} — ${adFormatLabel}` : adFormatLabel;
}

export default function CreatorNewPage() {
  // Защита страницы — редирект если не авторизован
  useRequireAuth();

  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [adFormats, setAdFormats] = useState<AdFormatOption[]>([]);

  useEffect(() => {
    fetch("/api/ad-formats")
      .then((r) => r.json())
      .then((data) => setAdFormats(data.data ?? []))
      .catch(() => {});
  }, []);

  // Восстанавливаем черновик из localStorage при загрузке
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CREATOR_DRAFT);
      if (saved) {
        const parsed = JSON.parse(saved);
        form.setFieldsValue(parsed);
      }
    } catch { /* ignore corrupted data */ }
  }, [form]);

  // Сохраняем черновик в localStorage при изменении полей
  const saveDraft = () => {
    try {
      const allValues = form.getFieldsValue(true);
      localStorage.setItem(STORAGE_KEYS.CREATOR_DRAFT, JSON.stringify(allValues));
    } catch { /* ignore quota errors */ }
  };

  const handleSubmit = async () => {
    let values: Record<string, unknown>;
    try {
      values = await form.validateFields();
    } catch {
      return; // validation errors shown by form
    }
    setLoading(true);
    try {
      const rawItems = (values.priceItems as { platform?: string; adFormatLabel: string; price: number }[] | undefined) ?? [];
      const priceItems = rawItems
        .filter((item) => item?.adFormatLabel && item?.price > 0)
        .map((item) => ({
          label: buildPriceLabel(item.platform, item.adFormatLabel),
          price: item.price,
        }));
      const minimumRate = priceItems.length > 0
        ? Math.min(...priceItems.map((i) => i.price))
        : 0;
      const profile = await api.post<{ id: string }>("/api/creators", {
        title: values.title,
        fullName: values.title, // используем title как fullName по умолчанию
        city: values.city,
        availability: values.availability ?? "available",
        contentCategories: values.categories,
        platforms: ((values.platforms as string[]) ?? []).map((name) => ({
          name,
          handle: "",
          url: "",
          followers: null,
        })),
        contacts: {
          telegram: values.telegram ? `@${values.telegram}` : null,
          whatsapp: values.whatsapp ?? null,
        },
        pricing: {
          minimumRate,
          negotiable: true,
          items: priceItems,
        },
      });
      localStorage.removeItem(STORAGE_KEYS.CREATOR_DRAFT);
      toast.success("Профиль создан!");
      router.push(`/creators/${profile.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.status === 401 ? "Необходима авторизация" : err.message);
      } else {
        toast.error("Ошибка создания профиля");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <Breadcrumb
        className="mb-4"
        items={[
          { title: <Link href="/">Главная</Link> },
          { title: <Link href="/cabinet">Кабинет</Link> },
          { title: "Новый профиль" },
        ]}
      />

      {/* Sticky Step Header */}
      <div className="sticky top-0 z-10 bg-white -mx-4 px-4 pt-3 pb-3 mb-5 border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest mb-0.5">
              Анкета
            </p>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">
              Новый профиль
            </h1>
          </div>
        </div>
      </div>

      {/* Контент со отступом снизу под sticky bar */}
      <div className="max-w-lg mx-auto pb-28">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <Form form={form} name="creator_new" layout="vertical" size="large" onValuesChange={saveDraft}>
            {/* Название профиля — первое и самое важное поле */}
            <div className="mb-4 p-3 bg-sky-50 border border-sky-100 rounded-xl text-sm text-sky-700">
              <p className="font-medium mb-0.5 flex items-center gap-1.5">
                <BulbOutlined /> Совет
              </p>
              <p>
                Дайте профилю понятное название — например «Мастер нарезок»,
                «Обзорщик еды», «АСМР контент». Это поможет бизнесу найти именно
                нужного специалиста.
              </p>
            </div>

            <Form.Item
              label="Название профиля"
              name="title"
              rules={[
                { required: true, message: "Дайте название профилю" },
                { min: 5, message: "Минимум 5 символов" },
              ]}
              extra="Например: «Мастер нарезок», «Обзорщик еды и кафе», «TikTok фудблогер»"
            >
              <Input
                placeholder="Как назвать эту специализацию?"
                maxLength={60}
                showCount
              />
            </Form.Item>

            {/* Секция 1: Где вы работаете */}
            <div className="mb-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Где вы работаете
              </p>
              <Form.Item
                label="Город"
                name="city"
                rules={[{ required: true, message: "Выберите город" }]}
              >
                <Select
                  placeholder="Выберите ваш город"
                  options={CITIES.map((c) => ({ label: c, value: c }))}
                />
              </Form.Item>

              <Form.Item
                label="Платформы"
                name="platforms"
                rules={[
                  {
                    required: true,
                    message: "Выберите хотя бы одну платформу",
                  },
                ]}
              >
                <Select
                  mode="multiple"
                  placeholder="TikTok, Instagram, YouTube…"
                  options={PLATFORMS.map((p) => ({ label: p, value: p }))}
                />
              </Form.Item>

              <Form.Item label="Статус доступности" name="availability" initialValue="available">
                <Radio.Group buttonStyle="solid" className="flex flex-wrap gap-y-2">
                  <Radio.Button value="available">Свободен</Radio.Button>
                  <Radio.Button value="partially_available">Частично</Radio.Button>
                  <Radio.Button value="busy">Занят</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </div>

            {/* Секция 2: Тематика */}
            <div className="mb-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Тематика
              </p>
              <Form.Item
                label="Категории контента"
                name="categories"
                rules={[
                  {
                    required: true,
                    message: "Выберите хотя бы одну категорию",
                  },
                ]}
              >
                <Select
                  mode="multiple"
                  placeholder="Мемы, Обзоры, Авто…"
                  options={CATEGORIES.map((c) => ({ label: c, value: c }))}
                />
              </Form.Item>
            </div>

            {/* Секция 3: Контакты и ставка */}
            <div className="mb-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Контакты
              </p>

              <Form.Item
                label="Telegram"
                name="telegram"
                rules={[
                  { required: true, message: "Укажите Telegram-username" },
                ]}
                extra={
                  <span className="text-xs text-gray-400">
                    Только username, например: username
                  </span>
                }
              >
                <Space.Compact style={{ width: "100%" }}>
                  <Input
                    defaultValue=""
                    readOnly
                    style={{
                      width: 36,
                      flexShrink: 0,
                      textAlign: "center",
                      padding: "0 8px",
                    }}
                    prefix={<SendOutlined className="text-gray-400" />}
                  />
                  <Input
                    prefix={
                      <span className="text-gray-400 text-sm select-none">
                        @
                      </span>
                    }
                    placeholder="username"
                    style={{ flex: 1 }}
                  />
                </Space.Compact>
              </Form.Item>

              <Form.Item
                label={
                  <span>
                    WhatsApp
                    <span className="ml-1.5 text-xs font-normal text-gray-400">
                      (необязательно)
                    </span>
                  </span>
                }
                name="whatsapp"
              >
                <Input placeholder="+7 (000) 000-00-00" />
              </Form.Item>
            </div>

            {/* Секция цен */}
            <div className="mb-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Прайс-лист
              </p>

              <div className="mb-3 p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700">
                Укажи цены по каждому типу рекламы — так заказчик сразу поймёт, сколько стоит интеграция, баннер или хук.
              </div>

              <Form.List name="priceItems">
                {(fields, { add, remove }) => (
                  <>
                    {/* Быстрое добавление */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <span className="text-xs text-gray-400 self-center shrink-0">Добавить:</span>
                      {QUICK_ADD_FORMATS.map((fmt) => (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => add({ adFormatLabel: fmt })}
                          className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                        >
                          + {fmt}
                        </button>
                      ))}
                    </div>

                    {fields.map(({ key, name, ...restField }) => (
                      <div key={key} className="flex gap-2 mb-2 items-start">
                        {/* Платформа (необязательно) */}
                        <Form.Item
                          {...restField}
                          name={[name, "platform"]}
                          noStyle
                        >
                          <Select
                            allowClear
                            placeholder="Платф."
                            style={{ width: 100 }}
                            options={["TikTok", "Instagram", "YouTube"].map((p) => ({ label: p, value: p }))}
                          />
                        </Form.Item>

                        {/* Тип рекламы */}
                        <Form.Item
                          {...restField}
                          name={[name, "adFormatLabel"]}
                          rules={[{ required: true, message: "Укажи тип" }]}
                          style={{ flex: 1, marginBottom: 0 }}
                        >
                          <AutoComplete
                            placeholder="Тип рекламы"
                            options={adFormats.map((f) => ({ label: f.label, value: f.label }))}
                            filterOption={(input, option) =>
                              (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                            }
                          />
                        </Form.Item>

                        {/* Цена */}
                        <Form.Item
                          {...restField}
                          name={[name, "price"]}
                          rules={[{ required: true, message: "Цена" }]}
                          style={{ width: 100, marginBottom: 0 }}
                        >
                          <InputNumber
                            placeholder="15000"
                            min={0}
                            step={1000}
                            style={{ width: "100%" }}
                            suffix="₸"
                          />
                        </Form.Item>

                        <Button
                          danger
                          type="text"
                          icon={<DeleteOutlined />}
                          onClick={() => remove(name)}
                          style={{ marginTop: 4 }}
                        />
                      </div>
                    ))}

                    <Button
                      type="dashed"
                      onClick={() => add()}
                      block
                      icon={<PlusOutlined />}
                    >
                      Добавить формат
                    </Button>
                  </>
                )}
              </Form.List>
            </div>
          </Form>
        </div>
      </div>

      {/* Sticky Bottom Navigation Bar */}
      <StickyBottomBar
        primaryLabel="Создать профиль"
        onPrimary={handleSubmit}
        primaryIcon={<ArrowRightOutlined />}
        primaryLoading={loading}
        onBack={() => router.push("/cabinet")}
        isFirstStep={true}
        cancelHref="/cabinet"
      />
    </PublicLayout>
  );
}
