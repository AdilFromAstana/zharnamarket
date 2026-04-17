"use client";

import { useState, useEffect } from "react";
import { Form, Button, Breadcrumb } from "antd";
import {
  ArrowRightOutlined,
  ArrowLeftOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { STORAGE_KEYS } from "@/lib/constants";
import { useCities, usePlatforms, useCategories, useAdFormats } from "@/hooks/useRefData";
import { toast } from "sonner";
import PublicLayout from "@/components/layout/PublicLayout";
import StickyBottomBar from "@/components/ui/StickyBottomBar";
import { api, ApiError } from "@/lib/api-client";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import ProfileTipsSidebar from "./_components/ProfileTipsSidebar";
import StepHeader from "./_components/StepHeader";
import Step1Basics from "./_components/Step1Basics";
import Step2Platforms from "./_components/Step2Platforms";
import Step3Contacts from "./_components/Step3Contacts";

const STEP_LABELS = ["Основа", "Платформы", "Контакты и цены"];
const STEP_TITLES: Record<1 | 2 | 3, string> = {
  1: "Расскажите о себе",
  2: "Где вы публикуете контент",
  3: "Как с вами связаться",
};

const PLATFORM_URL_CONFIG: Record<
  string,
  {
    prefix: string;
    letter: string;
    badgeClass: string;
    placeholder: string;
  }
> = {
  TikTok: {
    prefix: "tiktok.com/@",
    letter: "T",
    badgeClass: "bg-black text-white",
    placeholder: "username",
  },
  Instagram: {
    prefix: "instagram.com/",
    letter: "I",
    badgeClass:
      "bg-gradient-to-br from-fuchsia-500 via-pink-500 to-amber-400 text-white",
    placeholder: "username",
  },
  YouTube: {
    prefix: "youtube.com/@",
    letter: "Y",
    badgeClass: "bg-red-600 text-white",
    placeholder: "channel",
  },
  Threads: {
    prefix: "threads.net/@",
    letter: "@",
    badgeClass: "bg-neutral-900 text-white",
    placeholder: "username",
  },
  Telegram: {
    prefix: "t.me/",
    letter: "T",
    badgeClass: "bg-sky-500 text-white",
    placeholder: "username или t.me/channel",
  },
  VK: {
    prefix: "vk.com/",
    letter: "V",
    badgeClass: "bg-blue-600 text-white",
    placeholder: "id или short name",
  },
};

function extractHandle(raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) {
    try {
      const parts = new URL(v).pathname.split("/").filter(Boolean);
      return (parts[0] ?? "").replace(/^@/, "");
    } catch {
      return v.replace(/^@/, "");
    }
  }
  return v.replace(/^@/, "").replace(/^\//, "");
}

function buildPlatformUrl(platformKey: string, handle: string): string {
  const cfg = PLATFORM_URL_CONFIG[platformKey];
  const clean = extractHandle(handle);
  if (!clean) return "";
  if (!cfg) return clean;
  return `https://${cfg.prefix}${clean}`;
}

function buildPriceLabel(
  platform: string | undefined,
  adFormatLabel: string,
): string {
  return platform ? `${platform} — ${adFormatLabel}` : adFormatLabel;
}

export default function CreatorNewPage() {
  useRequireAuth();

  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const { data: adFormats = [] } = useAdFormats();
  const [fetchingPlatform, setFetchingPlatform] = useState<string | null>(null);
  const { data: cities = [] } = useCities();
  const { data: platforms = [] } = usePlatforms();
  const { data: categories = [] } = useCategories();

  const watchedTitle = Form.useWatch("title", form) as string | undefined;
  const watchedCity = Form.useWatch("city", form) as string | undefined;
  const watchedPlatformHandles = Form.useWatch("platformHandles", form) as
    | Record<string, string>
    | undefined;
  const watchedPlatforms = Object.entries(watchedPlatformHandles ?? {})
    .filter(([, v]) => extractHandle(v ?? "").length > 0)
    .map(([k]) => k);
  const watchedCategories = Form.useWatch("categories", form) as
    | string[]
    | undefined;
  const watchedTelegram = Form.useWatch("telegram", form) as string | undefined;
  const watchedPriceItems = Form.useWatch("priceItems", form) as
    | { adFormatLabel?: string; price?: number }[]
    | undefined;
  const priceItemsCount = (watchedPriceItems ?? []).filter(
    (item) => item?.adFormatLabel && (item?.price ?? 0) > 0,
  ).length;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CREATOR_DRAFT);
      if (saved) {
        const parsed = JSON.parse(saved);
        form.setFieldsValue(parsed);
      }
    } catch {
      /* ignore corrupted data */
    }
  }, [form]);

  const saveDraft = () => {
    try {
      const allValues = form.getFieldsValue(true);
      localStorage.setItem(
        STORAGE_KEYS.CREATOR_DRAFT,
        JSON.stringify(allValues),
      );
    } catch {
      /* ignore quota errors */
    }
  };

  const handleFetchFollowers = async (platformKey: string) => {
    const raw =
      (form.getFieldValue(["platformHandles", platformKey]) as
        | string
        | undefined) ?? "";
    const value = raw.trim();
    if (!value) {
      toast.error("Сначала вставьте ссылку на профиль");
      return;
    }
    setFetchingPlatform(platformKey);
    try {
      const res = await fetch(
        `/api/scrape/followers?platform=${encodeURIComponent(platformKey)}&url=${encodeURIComponent(value)}`,
        { cache: "no-store" },
      );
      const data = (await res.json()) as
        | { ok: true; followers: number }
        | { ok: false; error: string };
      if (data.ok) {
        form.setFieldValue(["platformFollowers", platformKey], data.followers);
        toast.success(
          `${platformKey}: ${data.followers.toLocaleString("ru-RU")} подписчиков`,
        );
      } else {
        toast.error(data.error || "Не удалось получить подписчиков");
      }
    } catch {
      toast.error("Ошибка запроса");
    } finally {
      setFetchingPlatform(null);
    }
  };

  const stepFieldMap: Record<1 | 2 | 3, string[]> = {
    1: ["title", "city", "categories"],
    2: [],
    3: ["telegram"],
  };

  const handleNext = async () => {
    try {
      const fields = stepFieldMap[step];
      if (fields.length > 0) {
        await form.validateFields(fields);
      }
      if (step < 3) {
        setStep((s) => (s + 1) as 1 | 2 | 3);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch {
      /* validation errors shown inline */
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((s) => (s - 1) as 1 | 2 | 3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      router.push("/cabinet");
    }
  };

  const handleSubmit = async () => {
    let values: Record<string, unknown>;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setLoading(true);
    try {
      const rawItems =
        (values.priceItems as
          | { platform?: string; adFormatLabel: string; price: number }[]
          | undefined) ?? [];
      const priceItems = rawItems
        .filter((item) => item?.adFormatLabel && item?.price > 0)
        .map((item) => ({
          label: buildPriceLabel(item.platform, item.adFormatLabel),
          price: item.price,
        }));
      const minimumRate =
        priceItems.length > 0 ? Math.min(...priceItems.map((i) => i.price)) : 0;
      const platformHandles =
        (values.platformHandles as Record<string, string> | undefined) ?? {};
      const platformFollowers =
        (values.platformFollowers as
          | Record<string, number | null | undefined>
          | undefined) ?? {};
      const platformsPayload = Object.entries(platformHandles)
        .map(([name, raw]) => {
          const handle = extractHandle(raw ?? "");
          const followers = platformFollowers[name];
          return handle
            ? {
                name,
                handle,
                url: buildPlatformUrl(name, raw ?? ""),
                followers:
                  typeof followers === "number" && followers >= 0
                    ? followers
                    : null,
              }
            : null;
        })
        .filter((v): v is NonNullable<typeof v> => v !== null);
      const profile = await api.post<{ id: string }>("/api/creators", {
        title: values.title,
        fullName: values.title,
        city: values.city,
        availability: "available",
        contentCategories: values.categories,
        platforms: platformsPayload,
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
        toast.error(
          err.status === 401 ? "Необходима авторизация" : err.message,
        );
      } else {
        toast.error("Ошибка создания профиля");
      }
    } finally {
      setLoading(false);
    }
  };

  const isLastStep = step === 3;
  const primaryLabel = isLastStep ? "Создать профиль" : "Далее";
  const primaryAction = isLastStep ? handleSubmit : handleNext;

  return (
    <PublicLayout>
      <div className="-mt-8 sm:mt-0" />
      <Breadcrumb
        className="mb-4 hidden sm:block"
        items={[
          { title: <Link href="/">Главная</Link> },
          { title: <Link href="/cabinet">Кабинет</Link> },
          { title: "Новый профиль" },
        ]}
      />

      <StepHeader
        step={step}
        stepTitle={STEP_TITLES[step]}
        stepLabels={STEP_LABELS}
      />

      <div className="max-w-5xl mx-auto">
        <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-8 lg:items-start">
          <div className="pb-28 lg:pb-8">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <Form
                form={form}
                name="creator_new"
                layout="vertical"
                size="large"
                onValuesChange={saveDraft}
              >
                <div className={step === 1 ? "" : "hidden"}>
                  <Step1Basics
                    form={form}
                    cities={cities}
                    categories={categories}
                  />
                </div>
                <div className={step === 2 ? "" : "hidden"}>
                  <Step2Platforms
                    form={form}
                    platforms={platforms}
                    fetchingPlatform={fetchingPlatform}
                    onFetchFollowers={handleFetchFollowers}
                    platformUrlConfig={PLATFORM_URL_CONFIG}
                  />
                </div>
                <div className={step === 3 ? "" : "hidden"}>
                  <Step3Contacts
                    form={form}
                    platforms={platforms}
                    adFormats={adFormats}
                  />
                </div>
              </Form>
            </div>

            <div className="hidden lg:flex items-center gap-3 mt-6 pt-4 border-t border-gray-100">
              <Button
                size="large"
                icon={step === 1 ? <CloseOutlined /> : <ArrowLeftOutlined />}
                onClick={handleBack}
                style={{ height: 48, width: 48, flexShrink: 0, padding: 0 }}
                aria-label={step === 1 ? "Отменить" : "Назад"}
              />
              <Button
                type="primary"
                size="large"
                block
                icon={<ArrowRightOutlined />}
                iconPlacement="end"
                onClick={primaryAction}
                loading={loading}
                style={{
                  height: 48,
                  fontSize: 16,
                  fontWeight: 600,
                  background: "#3B82F6",
                  borderColor: "#3B82F6",
                  flex: 1,
                }}
              >
                {primaryLabel}
              </Button>
            </div>
          </div>

          <aside className="hidden lg:block lg:sticky lg:top-[88px] self-start">
            <ProfileTipsSidebar
              title={watchedTitle}
              city={watchedCity}
              platforms={watchedPlatforms}
              categories={watchedCategories}
              telegram={watchedTelegram}
              priceItemsCount={priceItemsCount}
            />
          </aside>
        </div>
      </div>

      <StickyBottomBar
        primaryLabel={primaryLabel}
        onPrimary={primaryAction}
        primaryIcon={<ArrowRightOutlined />}
        primaryLoading={loading}
        onBack={handleBack}
        isFirstStep={step === 1}
        cancelHref="/cabinet"
        className="lg:hidden"
      />
    </PublicLayout>
  );
}
