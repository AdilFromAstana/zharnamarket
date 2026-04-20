"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { Form, Button, Spin, Upload } from "antd";
import {
  PlusOutlined,
  ArrowRightOutlined,
  DeleteOutlined,
  RocketOutlined,
} from "@ant-design/icons";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import PublicLayout from "@/components/layout/PublicLayout";
import StickyBottomBar from "@/components/ui/StickyBottomBar";
import { api } from "@/lib/api-client";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import type { BoostType } from "@/lib/types/payment";
import {
  useCities,
  usePlatforms,
  useCategories,
  useAdFormats,
} from "@/hooks/useRefData";
import {
  PLATFORM_URL_CONFIG,
  buildCreatorPlatforms,
  buildCreatorPortfolio,
  buildCreatorPricing,
  parsePriceLabelForForm,
} from "@/lib/creator-form-config";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";
import { useFetchFollowers } from "@/hooks/useFetchFollowers";
import Step1Basics from "../new/_components/Step1Basics";
import Step2Platforms from "../new/_components/Step2Platforms";
import Step3Contacts from "../new/_components/Step3Contacts";
import Step4Portfolio from "../new/_components/Step4Portfolio";

interface PortfolioItem {
  id?: string;
  videoUrl: string;
  category: string;
  description?: string | null;
  thumbnail?: string | null;
  views?: number | null;
  likes?: number | null;
  title?: string | null;
  platform?: string | null;
}

interface PortfolioApiItem {
  id?: string;
  videoUrl: string;
  description?: string | null;
  thumbnail?: string | null;
  views?: number | null;
  likes?: number | null;
  platform?: string | null;
  categoryId?: string | null;
  category?: { key?: string | null } | string | null;
}

interface PlatformData {
  name: string;
  handle: string;
  url: string;
  followers: number | null;
}

interface CreatorApiResponse {
  id: string;
  title: string;
  fullName: string;
  username?: string | null;
  bio?: string | null;
  avatar?: string | null;
  city?: { id: string; key: string; label: string } | string | null;
  availability: string;
  categories?: Array<{ id: string; key: string; label: string }>;
  contentCategories?: string[];
  minimumRate: number;
  negotiable: boolean;
  contactTelegram?: string | null;
  contactWhatsapp?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  portfolio: PortfolioApiItem[];
  platforms: PlatformData[];
  priceItems?: { label: string; price: number }[];
  screenshots?: string[];
  isPublished?: boolean;
  boosts?: Array<{ boostType: BoostType; expiresAt: string | Date }>;
}

function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function EditCreatorPageInner() {
  useRequireAuth();

  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [hasActiveBoost, setHasActiveBoost] = useState(false);
  const [form] = Form.useForm();
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const {
    url: avatarUrl,
    setUrl: setAvatarUrl,
    uploading: avatarUploading,
    upload: handleAvatarUpload,
  } = useAvatarUpload();
  const [screenshotUrls, setScreenshotUrls] = useState<string[]>([]);
  const [screenshotUploading, setScreenshotUploading] = useState(false);
  const { fetchingPlatform, fetchFollowers: handleFetchFollowers } =
    useFetchFollowers(form);
  const { data: adFormats = [] } = useAdFormats();
  const { data: cities = [] } = useCities();
  const { data: platforms = [] } = usePlatforms();
  const { data: categories = [] } = useCategories();

  const profileId = searchParams.get("id") ?? "";

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
        const platformKeys = platforms.map((p) => p.key);
        const mappedPortfolio: PortfolioItem[] = (data.portfolio ?? []).map(
          (item) => {
            const categoryKey =
              typeof item.category === "string"
                ? item.category
                : (item.category?.key ?? "");
            return {
              id: item.id,
              videoUrl: item.videoUrl,
              category: categoryKey,
              description: item.description ?? null,
              thumbnail: item.thumbnail ?? null,
              views: item.views ?? null,
              likes: item.likes ?? null,
              platform: item.platform ?? null,
            };
          },
        );
        setPortfolioItems(mappedPortfolio);
        setAvatarUrl(data.avatar ?? null);
        setScreenshotUrls(data.screenshots ?? []);
        setIsPublished(!!data.isPublished);
        const activeBoosts = (data.boosts ?? []).filter(
          (b) => new Date(b.expiresAt).getTime() >= Date.now(),
        );
        setHasActiveBoost(activeBoosts.length > 0);

        const platformHandles: Record<string, string> = {};
        const platformFollowers: Record<string, number | null> = {};
        for (const p of data.platforms ?? []) {
          platformHandles[p.name] = p.handle ?? "";
          platformFollowers[p.name] = p.followers ?? null;
        }

        const formValues: Record<string, unknown> = {
          title: data.title,
          fullName: data.fullName,
          username: data.username ?? "",
          bio: data.bio ?? "",
          city:
            typeof data.city === "string"
              ? data.city
              : (data.city?.key ?? undefined),
          availability: data.availability,
          categories:
            data.categories?.map((c) => c.key) ?? data.contentCategories ?? [],
          negotiable: data.negotiable,
          telegram: data.contactTelegram?.replace(/^@/, "") ?? "",
          whatsapp: data.contactWhatsapp ?? "",
          phone: data.contactPhone ?? "",
          email: data.contactEmail ?? "",
          platformHandles,
          platformFollowers,
        };

        if (data.priceItems && data.priceItems.length > 0) {
          formValues.priceItems = data.priceItems.map((item) => {
            const parsed = parsePriceLabelForForm(item.label, platformKeys);
            return {
              platform: parsed.platform,
              adFormatLabel: parsed.adFormatLabel,
              priceUnit: parsed.priceUnit ?? "per_integration",
              price: item.price,
            };
          });
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
  }, [profileId, form, platforms, setAvatarUrl]);

  const handleSave = async () => {
    let values: Record<string, unknown>;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    setLoading(true);
    try {
      const pricing = buildCreatorPricing(
        values.priceItems as Parameters<typeof buildCreatorPricing>[0],
      );
      const platformsPayload = buildCreatorPlatforms(
        values.platformHandles as
          | Record<string, string | undefined>
          | undefined,
        values.platformFollowers as
          | Record<string, number | null | undefined>
          | undefined,
      );
      const portfolio = buildCreatorPortfolio(portfolioItems);

      await api.put(`/api/creators/${profileId}`, {
        avatar: avatarUrl,
        screenshots: screenshotUrls,
        title: values.title,
        fullName: values.fullName,
        username: values.username || null,
        bio: values.bio || null,
        city: values.city,
        availability: values.availability,
        contentCategories: values.categories ?? [],
        platforms: platformsPayload,
        portfolio,
        pricing: {
          minimumRate: pricing.minimumRate,
          negotiable: values.negotiable ?? true,
          items: pricing.items,
        },
        contacts: {
          telegram: values.telegram ? `@${values.telegram}` : null,
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

  const handleBack = () => {
    router.push("/creators/manage");
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
      <div className="-mt-8 sm:mt-0" />

      <div className="sticky top-14 md:top-16 lg:static z-10 bg-white -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-6 pt-2 sm:pt-4 pb-3 sm:pb-4 lg:pt-6 lg:pb-6 mb-3 sm:mb-4 lg:mb-6 border-b border-gray-100 shadow-sm lg:border lg:border-gray-200 lg:shadow-none lg:rounded-2xl">
        <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest mb-0.5">
          Редактирование
        </p>
        <h1 className="text-lg lg:text-xl font-bold text-gray-900 leading-tight">
          Обновите профиль креатора
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Заполните профиль полностью для лучшей видимости в каталоге
        </p>
      </div>

      {isPublished && !hasActiveBoost && (
        <div className="mb-4 rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-fuchsia-50 p-4 flex items-center gap-3">
          <div className="w-10 h-10 shrink-0 rounded-full bg-purple-600 flex items-center justify-center">
            <RocketOutlined className="text-white text-lg" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 text-sm sm:text-base leading-tight">
              Обновили профиль? Продвиньте его
            </div>
            <div className="text-xs sm:text-sm text-gray-600 mt-0.5">
              Поднимите в топ каталога — больше заказчиков увидят вас первым
            </div>
          </div>
          <Link href={`/creators/${profileId}/boost`} className="shrink-0">
            <Button
              type="primary"
              icon={<RocketOutlined />}
              style={{ background: "#7c3aed", borderColor: "#7c3aed" }}
            >
              Продвинуть
            </Button>
          </Link>
        </div>
      )}

      <div>
        <div className="pb-28 lg:pb-8">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <Form
              form={form}
              name="creator_edit"
              layout="vertical"
              size="large"
            >
              <section>
                <SectionHeading title="Расскажите о себе" />
                <Step1Basics
                  form={form}
                  cities={cities}
                  categories={categories}
                  avatar={{
                    url: avatarUrl,
                    uploading: avatarUploading,
                    onUpload: handleAvatarUpload,
                  }}
                />
              </section>

              <div className="border-t border-gray-100 my-8" />

              <section>
                <SectionHeading
                  title="Где вы публикуете контент"
                  subtitle="Укажите платформы и ссылки на ваши профили"
                />
                <Step2Platforms
                  form={form}
                  platforms={platforms}
                  fetchingPlatform={fetchingPlatform}
                  onFetchFollowers={handleFetchFollowers}
                  platformUrlConfig={PLATFORM_URL_CONFIG}
                />
              </section>

              <div className="border-t border-gray-100 my-8" />

              <Step3Contacts
                form={form}
                platforms={platforms}
                adFormats={adFormats}
              />

              <div className="border-t border-gray-100 my-8" />

              <section>
                <SectionHeading
                  title="Портфолио"
                  subtitle="Покажите заказчикам примеры ваших работ"
                />

                <p className="text-sm font-medium text-gray-700 mb-1">
                  Скриншоты работ
                </p>
                <p className="text-xs text-gray-400 mb-3">
                  Статистика, примеры работ, отзывы клиентов
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {screenshotUrls.map((url, i) => (
                    <div
                      key={i}
                      className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 group"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Скриншот ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setScreenshotUrls((prev) =>
                            prev.filter((_, idx) => idx !== i),
                          )
                        }
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
                  <Button icon={<PlusOutlined />} loading={screenshotUploading}>
                    {screenshotUploading ? "Загрузка..." : "Добавить скриншот"}
                  </Button>
                </Upload>

                <div className="mt-6">
                  <p className="text-sm font-medium text-gray-700 mb-3">
                    Ссылки на видео
                  </p>
                  <Step4Portfolio
                    items={portfolioItems}
                    onChange={setPortfolioItems}
                    categories={categories}
                    createNew={() => ({
                      videoUrl: "",
                      category: "",
                      description: "",
                      thumbnail: null,
                    })}
                    hideTip
                  />
                </div>
              </section>
            </Form>
          </div>

          <div className="hidden lg:flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={handleBack}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
            >
              Отменить
            </button>
            <Button
              type="primary"
              size="large"
              icon={<ArrowRightOutlined />}
              iconPlacement="end"
              onClick={handleSave}
              loading={loading}
              style={{
                height: 44,
                fontSize: 15,
                fontWeight: 600,
                paddingLeft: 32,
                paddingRight: 32,
                background: "#3B82F6",
                borderColor: "#3B82F6",
              }}
            >
              Сохранить изменения
            </Button>
          </div>
        </div>
      </div>

      <StickyBottomBar
        primaryLabel="Сохранить"
        onPrimary={handleSave}
        primaryIcon={<ArrowRightOutlined />}
        primaryLoading={loading}
        onBack={handleBack}
        isFirstStep
        cancelHref="/creators/manage"
        className="lg:hidden"
      />
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
