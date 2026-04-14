"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import {
  Form,
  Input,
  Button,
  Select,
  AutoComplete,
  Tabs,
  Collapse,
  InputNumber,
  Radio,
  Breadcrumb,
  Card,
  Space,
  Typography,
  Spin,
  Upload,
  Avatar,
} from "antd";
import {
  PlusOutlined,
  SaveOutlined,
  ArrowLeftOutlined,
  CameraOutlined,
  UserOutlined,
  FileTextOutlined,
  MobileOutlined,
  VideoCameraOutlined,
  PhoneOutlined,
  PictureOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PauseCircleOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import PublicLayout from "@/components/layout/PublicLayout";
import { CITIES, PLATFORMS, CATEGORIES } from "@/lib/constants";
import { api } from "@/lib/api-client";
import { useRequireAuth } from "@/hooks/useRequireAuth";

// Типы для портфолио и платформ
interface PortfolioItem {
  id?: string;
  videoUrl: string;
  category: string;
  description?: string | null;
  thumbnail?: string | null;
}

interface PlatformData {
  name: string;
  handle: string;
  url: string;
  followers: number | null;
}

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

function parsePriceLabelForForm(label: string): { platform?: string; adFormatLabel: string } {
  const platforms = ["TikTok", "Instagram", "YouTube"];
  for (const p of platforms) {
    if (label.startsWith(`${p} — `)) {
      return { platform: p, adFormatLabel: label.slice(p.length + 3) };
    }
  }
  return { adFormatLabel: label };
}

interface CreatorApiResponse {
  id: string;
  title: string;
  fullName: string;
  username?: string | null;
  bio?: string | null;
  avatar?: string | null;
  city: string;
  availability: string;
  contentCategories: string[];
  minimumRate: number;
  negotiable: boolean;
  contactTelegram?: string | null;
  contactWhatsapp?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  portfolio: PortfolioItem[];
  platforms: PlatformData[];
  priceItems?: { label: string; price: number }[];
  screenshots?: string[];
}

function EditCreatorPageInner() {
  // Защита страницы — редирект если не авторизован
  useRequireAuth();

  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [creator, setCreator] = useState<CreatorApiResponse | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [form] = Form.useForm();
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [screenshotUrls, setScreenshotUrls] = useState<string[]>([]);
  const [screenshotUploading, setScreenshotUploading] = useState(false);
  const [adFormats, setAdFormats] = useState<AdFormatOption[]>([]);

  const profileId = searchParams.get("id") ?? "";

  useEffect(() => {
    fetch("/api/ad-formats")
      .then((r) => r.json())
      .then((data) => setAdFormats(data.data ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!profileId) {
      setNotFound(true);
      setLoadingData(false);
      return;
    }

    setLoadingData(true);
    api
      .get<CreatorApiResponse>(`/api/creators/${profileId}`)
      .then((data) => {
        setCreator(data);
        setPortfolioItems(data.portfolio ?? []);
        setAvatarUrl(data.avatar ?? null);
        setScreenshotUrls(data.screenshots ?? []);

        // Базовые поля
        const formValues: Record<string, unknown> = {
          title: data.title,
          fullName: data.fullName,
          username: data.username ?? "",
          bio: data.bio ?? "",
          city: data.city,
          availability: data.availability,
          contentCategories: data.contentCategories,
          minimumRate: data.minimumRate,
          negotiable: data.negotiable,
          telegram: data.contactTelegram ?? "",
          whatsapp: data.contactWhatsapp ?? "",
          phone: data.contactPhone ?? "",
          email: data.contactEmail ?? "",
        };

        // Предзаполнение полей платформ
        for (const p of data.platforms ?? []) {
          formValues[`${p.name}_handle`] = p.handle ?? "";
          formValues[`${p.name}_followers`] = p.followers ?? null;
        }

        // Предзаполнение прайс-листа — парсим label обратно в platform + adFormatLabel
        if (data.priceItems && data.priceItems.length > 0) {
          formValues.priceItems = data.priceItems.map((item) => ({
            ...parsePriceLabelForForm(item.label),
            price: item.price,
          }));
        }

        form.setFieldsValue(formValues);
      })
      .catch((err) => {
        console.error("[EditCreatorPage] load error:", err);
        setNotFound(true);
      })
      .finally(() => {
        setLoadingData(false);
      });
  }, [profileId, form]);

  const handleSave = async () => {
    let values: Record<string, unknown>;
    try {
      values = await form.validateFields();
    } catch {
      return;
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
        : (values.minimumRate ?? 0);

      // Собираем данные платформ из form fields
      const platforms = PLATFORMS
        .map((p) => ({
          name: p,
          handle: (values[`${p}_handle`] as string) || "",
          url: "",
          followers: (values[`${p}_followers`] as number) ?? null,
        }))
        .filter((p) => p.handle); // только заполненные

      // Собираем портфолио (только с videoUrl)
      const portfolio = portfolioItems
        .filter((item) => item.videoUrl?.trim())
        .map((item) => ({
          videoUrl: item.videoUrl,
          category: item.category || null,
          description: item.description || null,
          thumbnail: item.thumbnail || null,
        }));

      await api.put(`/api/creators/${profileId}`, {
        avatar: avatarUrl,
        screenshots: screenshotUrls,
        title: values.title,
        fullName: values.fullName,
        username: values.username || null,
        bio: values.bio || null,
        city: values.city,
        availability: values.availability,
        contentCategories: values.contentCategories ?? [],
        platforms,
        portfolio,
        pricing: {
          minimumRate,
          negotiable: values.negotiable ?? true,
          items: priceItems,
        },
        contacts: {
          telegram: values.telegram || null,
          whatsapp: values.whatsapp || null,
          phone: values.phone || null,
          email: values.email || null,
        },
      });
      toast.success("Профиль обновлён");
      router.push("/creators/manage");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Ошибка при сохранении";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", "avatar");
      const res = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Ошибка загрузки");
        return;
      }
      const { url } = await res.json();
      setAvatarUrl(url);
      toast.success("Фото загружено");
    } catch {
      toast.error("Ошибка загрузки фото");
    } finally {
      setAvatarUploading(false);
    }
  };

  const basicSection = (
    <div className="space-y-0">
      {/* Аватар */}
      <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-100">
        <Avatar
          size={72}
          icon={<UserOutlined />}
          src={avatarUrl ?? undefined}
          style={{ background: "#0EA5E9", flexShrink: 0 }}
        />
        <div>
          <Upload
            accept="image/*"
            showUploadList={false}
            disabled={avatarUploading}
            beforeUpload={(file) => {
              handleAvatarUpload(file as unknown as File);
              return false;
            }}
          >
            <Button size="small" icon={<CameraOutlined />} loading={avatarUploading}>
              {avatarUploading ? "Загрузка..." : "Загрузить фото"}
            </Button>
          </Upload>
          <p className="text-xs text-gray-400 mt-1">JPG, PNG, GIF или WebP до 5 МБ</p>
        </div>
      </div>

      <Form.Item
        label="Название профиля"
        name="title"
        rules={[
          { required: true, message: "Дайте название профилю" },
          { min: 5, message: "Минимум 5 символов" },
        ]}
        extra="Например: «Мастер нарезок», «Обзорщик еды», «TikTok фудблогер»"
      >
        <Input
          placeholder="Как назвать эту специализацию?"
          maxLength={60}
          showCount
        />
      </Form.Item>
      <Form.Item label="Имя" name="fullName" rules={[{ required: true }]}>
        <Input placeholder="Данияр Сейткали" />
      </Form.Item>
      <Form.Item label="Ник (username)" name="username">
        <Input placeholder="@username" />
      </Form.Item>
      <Form.Item label="О себе" name="bio">
        <Input.TextArea rows={3} placeholder="Расскажите о себе..." />
      </Form.Item>
      <Form.Item label="Город" name="city" rules={[{ required: true }]}>
        <Select options={CITIES.map((c) => ({ label: c, value: c }))} />
      </Form.Item>
      <Form.Item label="Статус доступности" name="availability">
        <Radio.Group buttonStyle="solid" className="flex flex-wrap gap-y-2">
          <Radio.Button value="available">
            <CheckCircleOutlined className="mr-1 text-green-500" />
            Свободен
          </Radio.Button>
          <Radio.Button value="partially_available">
            <PauseCircleOutlined className="mr-1 text-yellow-500" />
            Частично
          </Radio.Button>
          <Radio.Button value="busy">
            <CloseCircleOutlined className="mr-1 text-red-500" />
            Занят
          </Radio.Button>
        </Radio.Group>
      </Form.Item>
    </div>
  );

  const platformsSection = (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Укажите ваши платформы и ссылки на профили
      </p>
      {PLATFORMS.map((platform) => (
        <Card key={platform} size="small" className="border-gray-200">
          <div className="font-medium text-gray-900 mb-3">{platform}</div>
          <div className="space-y-2">
            <Form.Item name={`${platform}_handle`} noStyle>
              <Space.Compact style={{ width: "100%" }}>
                <Typography.Text className="flex items-center px-3 bg-gray-50 border border-gray-300 border-r-0 rounded-l-md text-gray-500 text-sm">
                  @
                </Typography.Text>
                <Input placeholder={`${platform.toLowerCase()}_handle`} />
              </Space.Compact>
            </Form.Item>
            <Form.Item name={`${platform}_followers`} noStyle>
              <InputNumber
                placeholder="Подписчиков"
                style={{ width: "100%" }}
                suffix="чел."
              />
            </Form.Item>
          </div>
        </Card>
      ))}
    </div>
  );

  const contentSection = (
    <div className="space-y-4">
      <Form.Item
        label="Категории контента"
        name="contentCategories"
        rules={[{ required: true }]}
      >
        <Select
          mode="multiple"
          options={CATEGORIES.map((c) => ({ label: c, value: c }))}
          placeholder="Выберите категории"
        />
      </Form.Item>

      {/* Прайс-лист по форматам */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-1">
          Прайс-лист
        </p>
        <p className="text-xs text-gray-400 mb-3">
          Укажи платформу (необязательно), тип рекламы и цену — заказчик сразу поймёт стоимость
        </p>

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
                  <Form.Item {...restField} name={[name, "platform"]} noStyle>
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

      <Form.Item name="negotiable" valuePropName="checked">
        <Radio.Group>
          <Radio value={true}>Ставка договорная</Radio>
          <Radio value={false}>Ставка фиксированная</Radio>
        </Radio.Group>
      </Form.Item>
    </div>
  );

  const contactsSection = (
    <div className="space-y-0">
      <p className="text-sm text-gray-500 mb-4">
        Контакты обязательны. Через них бизнес будет писать вам напрямую.
      </p>
      <Form.Item
        label="Telegram"
        name="telegram"
        rules={[{ required: true, message: "Укажите Telegram" }]}
      >
        <Space.Compact style={{ width: "100%" }}>
          <Typography.Text className="flex items-center px-3 bg-gray-50 border border-gray-300 border-r-0 rounded-l-md text-gray-500 text-sm whitespace-nowrap">
            t.me/
          </Typography.Text>
          <Input placeholder="username" />
        </Space.Compact>
      </Form.Item>
      <Form.Item label="WhatsApp" name="whatsapp">
        <Input placeholder="+7 (000) 000-00-00" />
      </Form.Item>
      <Form.Item label="Телефон" name="phone">
        <Input placeholder="+7 (000) 000-00-00" />
      </Form.Item>
      <Form.Item label="Email" name="email">
        <Input placeholder="email@example.com" />
      </Form.Item>
    </div>
  );

  const handleScreenshotUpload = async (file: File) => {
    setScreenshotUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Ошибка загрузки");
      const data = await res.json();
      setScreenshotUrls((prev) => [...prev, data.url]);
      toast.success("Скриншот загружен");
    } catch {
      toast.error("Не удалось загрузить скриншот");
    } finally {
      setScreenshotUploading(false);
    }
  };

  const portfolioSection = (
    <div>
      {/* Скриншоты работ */}
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-700 mb-1">
          Скриншоты работ
        </p>
        <p className="text-xs text-gray-400 mb-3">
          Загрузите скриншоты статистики, примеры работ, отзывы клиентов
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {screenshotUrls.map((url, i) => (
            <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Скриншот ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setScreenshotUrls((prev) => prev.filter((_, idx) => idx !== i))}
                className="absolute top-1 right-1 w-5 h-5 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <DeleteOutlined />
              </button>
            </div>
          ))}
        </div>
        <Upload
          accept="image/*"
          showUploadList={false}
          disabled={screenshotUploading}
          beforeUpload={(file) => {
            handleScreenshotUpload(file as unknown as File);
            return false;
          }}
        >
          <Button size="small" icon={<PlusOutlined />} loading={screenshotUploading}>
            {screenshotUploading ? "Загрузка..." : "Добавить скриншот"}
          </Button>
        </Upload>
      </div>

      {/* Ссылки на видео */}
      <p className="text-sm font-medium text-gray-700 mb-1">
        Ссылки на видео
      </p>
      <p className="text-sm text-gray-500 mb-4">
        Минимум 3 работы для публикации в каталоге. Добавляйте ссылки на
        реальные видео.
      </p>
      {portfolioItems.map((item, idx) => (
        <Card key={item.id ?? `new-${idx}`} size="small" className="border-gray-200 mb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium text-gray-900">
              Работа #{idx + 1}
            </div>
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => setPortfolioItems((prev) => prev.filter((_, i) => i !== idx))}
            />
          </div>
          <div className="space-y-2">
            <Input
              value={item.videoUrl}
              placeholder="Ссылка на видео (TikTok, YouTube, Instagram)"
              onChange={(e) =>
                setPortfolioItems((prev) =>
                  prev.map((p, i) => (i === idx ? { ...p, videoUrl: e.target.value } : p)),
                )
              }
            />
            <Select
              value={item.category || undefined}
              options={CATEGORIES.map((c) => ({ label: c, value: c }))}
              placeholder="Категория"
              style={{ width: "100%" }}
              onChange={(val) =>
                setPortfolioItems((prev) =>
                  prev.map((p, i) => (i === idx ? { ...p, category: val } : p)),
                )
              }
            />
            <Input.TextArea
              value={item.description || ""}
              placeholder="Описание (необязательно)"
              rows={1}
              onChange={(e) =>
                setPortfolioItems((prev) =>
                  prev.map((p, i) => (i === idx ? { ...p, description: e.target.value } : p)),
                )
              }
            />
          </div>
        </Card>
      ))}
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        block
        onClick={() =>
          setPortfolioItems((prev) => [
            ...prev,
            { videoUrl: "", category: "", description: "" },
          ])
        }
      >
        Добавить работу
      </Button>
    </div>
  );

  const tabItems = [
    { key: "basic", label: "Основное", children: basicSection },
    { key: "platforms", label: "Платформы", children: platformsSection },
    { key: "content", label: "Контент", children: contentSection },
    { key: "contacts", label: "Контакты", children: contactsSection },
    { key: "portfolio", label: "Портфолио", children: portfolioSection },
  ];

  const collapseItems = [
    {
      key: "basic",
      label: (
        <span className="flex items-center gap-1.5">
          <FileTextOutlined /> Основное
        </span>
      ),
      children: basicSection,
    },
    {
      key: "platforms",
      label: (
        <span className="flex items-center gap-1.5">
          <MobileOutlined /> Платформы
        </span>
      ),
      children: platformsSection,
    },
    {
      key: "content",
      label: (
        <span className="flex items-center gap-1.5">
          <VideoCameraOutlined /> Контент и ставка
        </span>
      ),
      children: contentSection,
    },
    {
      key: "contacts",
      label: (
        <span className="flex items-center gap-1.5">
          <PhoneOutlined /> Контакты
        </span>
      ),
      children: contactsSection,
    },
    {
      key: "portfolio",
      label: (
        <span className="flex items-center gap-1.5">
          <PictureOutlined /> Портфолио
        </span>
      ),
      children: portfolioSection,
    },
  ];

  if (loadingData) {
    return (
      <PublicLayout>
        <div className="flex items-center justify-center py-20">
          <Spin size="large" />
        </div>
      </PublicLayout>
    );
  }

  if (notFound || !profileId) {
    return (
      <PublicLayout>
        <div className="text-center py-20">
          <p className="text-gray-400 text-lg">Профиль не найден</p>
          <Link
            href="/creators/manage"
            className="text-sky-600 text-sm mt-4 block"
          >
            ← Вернуться к профилям
          </Link>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      {/* pb-24 чтобы контент не перекрывался sticky-кнопками */}
      <div className="max-w-2xl flex flex-col gap-4 pb-24 sm:pb-6">
        <Breadcrumb
          items={[
            { title: <Link href="/creators/manage">Мои профили</Link> },
            { title: "Редактирование" },
          ]}
        />

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
            Редактирование профиля
          </h1>
          <p className="text-gray-500 text-sm sm:text-base">
            Заполните профиль полностью для лучшей видимости в каталоге
          </p>
        </div>

        <Form form={form} layout="vertical" size="large">
          {/* Мобиль: Collapse — все секции видны */}
          <div className="block md:hidden">
            <Collapse
              defaultActiveKey={["basic"]}
              items={collapseItems}
              className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
            />
          </div>

          {/* Десктоп: привычные Tabs */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <Tabs items={tabItems} className="px-4 pt-4" />
          </div>
        </Form>

        {/* Десктоп: обычные кнопки */}
        <div className="hidden sm:flex gap-3">
          <Link href="/creators/manage">
            <Button icon={<ArrowLeftOutlined />} style={{ height: 48 }}>
              Отмена
            </Button>
          </Link>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={loading}
            onClick={handleSave}
            style={{
              height: 48,
              flex: 1,
              background: "#0EA5E9",
              borderColor: "#0EA5E9",
            }}
          >
            Сохранить изменения
          </Button>
        </div>
      </div>

      {/* Мобиль: sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex gap-2 p-3 bg-white border-t border-gray-200 sm:hidden">
        <Link href="/creators/manage" className="shrink-0">
          <Button
            icon={<ArrowLeftOutlined />}
            style={{ height: 48, width: 48 }}
          />
        </Link>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          loading={loading}
          onClick={handleSave}
          style={{
            height: 48,
            flex: 1,
            background: "#0EA5E9",
            borderColor: "#0EA5E9",
          }}
          block
        >
          Сохранить изменения
        </Button>
      </div>
    </PublicLayout>
  );
}

export default function EditCreatorPage() {
  return (
    <Suspense fallback={null}>
      <EditCreatorPageInner />
    </Suspense>
  );
}
