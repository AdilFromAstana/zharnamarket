"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Button,
  Tag,
  Tabs,
  Table,
  Dropdown,
  Badge,
  Spin,
  Modal,
} from "antd";
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  EllipsisOutlined,
  CheckCircleFilled,
  FileTextOutlined,
  RocketOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { toast } from "sonner";
import PublicLayout from "@/components/layout/PublicLayout";
import { api, ApiError } from "@/lib/api-client";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { mapCreatorFromApi } from "@/lib/mappers/creator";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import {
  PLATFORM_COLORS,
  AVAILABILITY_COLORS,
  AVAILABILITY_LABELS,
  BOOST_LABELS,
  BOOST_COLORS,
} from "@/lib/constants";
import { formatFollowers, getAvatarGradient, cn } from "@/lib/utils";
import type {
  CreatorProfile,
  CreatorPlatform,
  PortfolioItem,
} from "@/lib/types/creator";

type FilterKey = "all" | "published" | "draft";

const FILTER_LABELS: Record<FilterKey, string> = {
  all: "Все",
  published: "Опубликованные",
  draft: "Черновики",
};

export default function CreatorsManagePage() {
  // Защита страницы — редирект если не авторизован
  const { isLoading: authLoading } = useRequireAuth();

  const [profiles, setProfiles] = useState<CreatorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [activeTab, setActiveTab] = useState("all");


  useEffect(() => {
    if (authLoading) return;
    api
      .get<unknown[]>("/api/creators/my")
      .then((data) => setProfiles((data ?? []).map(mapCreatorFromApi)))
      .catch(() => setProfiles([]))
      .finally(() => setLoading(false));
  }, [authLoading]);

  // Обработка redirect после mock-оплаты
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      toast.success("Профиль опубликован!");
      // Очищаем query params из URL
      window.history.replaceState({}, "", "/creators/manage");
      // Обновляем список профилей
      api
        .get<unknown[]>("/api/creators/my")
        .then((data) => setProfiles((data ?? []).map(mapCreatorFromApi)))
        .catch(() => {});
    } else if (params.get("payment") === "failed") {
      toast.error("Оплата не прошла. Попробуйте ещё раз.");
      window.history.replaceState({}, "", "/creators/manage");
    }
  }, []);

  if (authLoading) {
    return (
      <PublicLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Spin size="large" />
        </div>
      </PublicLayout>
    );
  }

  const filterProfiles = (key: FilterKey): CreatorProfile[] => {
    if (key === "published")
      return profiles.filter((p: CreatorProfile) => p.isPublished);
    if (key === "draft")
      return profiles.filter((p: CreatorProfile) => !p.isPublished);
    return profiles;
  };

  const filteredCards = filterProfiles(activeFilter);

  const filterCounts: Record<FilterKey, number> = {
    all: profiles.length,
    published: profiles.filter((p: CreatorProfile) => p.isPublished).length,
    draft: profiles.filter((p: CreatorProfile) => !p.isPublished).length,
  };



  // ─── Обработчик действий над профилем ───

  const handleAction = async (profileId: string, action: string) => {
    try {
      if (action === "unpublish") {
        await api.post(`/api/creators/${profileId}/unpublish`);
        setProfiles((prev) =>
          prev.map((p) =>
            p.id === profileId ? { ...p, isPublished: false } : p,
          ),
        );
        toast.success("Профиль снят с публикации");
      } else if (action === "delete") {
        await new Promise<void>((resolve, reject) => {
          Modal.confirm({
            title: "Удалить профиль?",
            content: "Это действие необратимо. Все данные профиля будут удалены.",
            okText: "Удалить",
            okType: "danger",
            cancelText: "Отмена",
            onOk: async () => {
              try {
                await api.delete(`/api/creators/${profileId}`);
                setProfiles((prev) => prev.filter((p) => p.id !== profileId));
                toast.success("Профиль удалён");
                resolve();
              } catch (e) { reject(e); }
            },
            onCancel: () => resolve(),
          });
        });
        return; // already handled
      } else if (action === "publish") {
        await api.post(`/api/creators/${profileId}/publish`);
        setProfiles((prev) =>
          prev.map((p) =>
            p.id === profileId ? { ...p, isPublished: true } : p,
          ),
        );
        toast.success("Профиль опубликован!");
      }
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    }
  };

  const columns: ColumnsType<CreatorProfile> = [
    {
      title: "Профиль",
      key: "title",
      render: (_, profile) => (
        <div>
          <div className="flex items-center gap-2">
            <Link
              href={`/creators/${profile.id}`}
              className="font-medium text-gray-900 hover:text-blue-600"
            >
              {profile.fullName}
            </Link>
            {profile.verified && <VerifiedBadge size={14} />}
          </div>
          <div className="text-xs text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full inline-flex items-center gap-1 mt-1">
            <FileTextOutlined /> {profile.title}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {profile.platforms.slice(0, 3).map((p: CreatorPlatform) => (
              <div
                key={p.name}
                className="flex items-center gap-1 text-xs text-gray-600"
              >
                <span
                  className="w-4 h-4 rounded flex items-center justify-center text-white text-[10px] font-bold"
                  style={{ background: PLATFORM_COLORS[p.name] }}
                >
                  {p.name.charAt(0)}
                </span>
                {p.name}
                {p.followers && (
                  <span className="text-gray-400">
                    {formatFollowers(p.followers)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: "Статус",
      key: "status",
      width: 160,
      render: (_, profile) => {
        const availabilityColor = AVAILABILITY_COLORS[profile.availability];
        const availabilityLabel = AVAILABILITY_LABELS[profile.availability];
        const activeBoosts = profile.boosts ?? [];
        return (
          <div>
            {profile.isPublished ? (
              <Badge status="success" text="Опубликован" />
            ) : (
              <Badge status="default" text="Черновик" />
            )}
            {activeBoosts.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {activeBoosts.map((bt) => (
                  <Tag key={bt} color={BOOST_COLORS[bt]}>
                    {BOOST_LABELS[bt]}
                  </Tag>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1 mt-0.5">
              <span
                className="w-1.5 h-1.5 rounded-full inline-block"
                style={{ background: availabilityColor }}
              />
              <span className="text-xs" style={{ color: availabilityColor }}>
                {availabilityLabel}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      title: "Город",
      key: "city",
      width: 120,
      render: (_, profile) => (
        <span className="text-sm text-gray-500">{profile.city}</span>
      ),
    },
    {
      title: "Ставка",
      key: "rate",
      width: 140,
      render: (_, profile) => (
        <div className="text-sm text-gray-700">
          от {profile.pricing.minimumRate.toLocaleString("ru-KZ")} ₸
          {profile.pricing.negotiable && (
            <div className="text-xs text-gray-400">договорная</div>
          )}
        </div>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 60,
      render: (_, profile) => {
        const menuItems = [
          {
            key: "view",
            icon: <EyeOutlined />,
            label: profile.isPublished ? (
              <Link href={`/creators/${profile.id}`}>Просмотр</Link>
            ) : (
              <Link href={`/creators/${profile.id}/preview`}>Предпросмотр</Link>
            ),
          },
          {
            key: "edit",
            icon: <EditOutlined />,
            label: (
              <Link href={`/creators/edit?id=${profile.id}`}>
                Редактировать
              </Link>
            ),
          },
          { type: "divider" as const },
          ...(profile.isPublished
            ? [
                ...((profile.boosts ?? []).length === 0
                  ? [
                      {
                        key: "boost",
                        icon: <RocketOutlined />,
                        label: (
                          <Link href={`/creators/${profile.id}/boost`}>
                            Продвинуть профиль
                          </Link>
                        ),
                      },
                    ]
                  : []),
                {
                  key: "unpublish",
                  icon: <EyeOutlined />,
                  label: "Снять с публикации",
                  onClick: () => handleAction(profile.id, "unpublish"),
                },
              ]
            : [
                {
                  key: "publish",
                  icon: <CheckCircleFilled />,
                  label: "Опубликовать",
                  onClick: () => handleAction(profile.id, "publish"),
                },
              ]),
          { type: "divider" as const },
          {
            key: "delete",
            icon: <DeleteOutlined />,
            label: "Удалить",
            danger: true,
            onClick: () => handleAction(profile.id, "delete"),
          },
        ];

        return (
          <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
            <Button type="text" icon={<EllipsisOutlined />} />
          </Dropdown>
        );
      },
    },
  ];

  const tabItems = [
    {
      key: "all",
      label: `Все (${profiles.length})`,
      children: (
        <Table
          dataSource={profiles}
          columns={columns}
          rowKey="id"
          size="middle"
        />
      ),
    },
    {
      key: "published",
      label: `Опубликованные (${filterCounts.published})`,
      children: (
        <Table
          dataSource={filterProfiles("published")}
          columns={columns}
          rowKey="id"
          size="middle"
        />
      ),
    },
    {
      key: "draft",
      label: `Черновики (${filterCounts.draft})`,
      children: (
        <Table
          dataSource={filterProfiles("draft")}
          columns={columns}
          rowKey="id"
          size="middle"
        />
      ),
    },
  ];

  return (
    <PublicLayout>
      {/* Шапка */}
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
            Мои профили
          </h1>
          <p className="text-gray-500 text-sm sm:text-base">
            Ваши анкеты в каталоге креаторов
          </p>
        </div>
        <Link
          href="/creators/new"
          className="w-full sm:w-auto sm:flex-shrink-0"
        >
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            className="w-full sm:w-auto"
            style={{ background: "#0EA5E9", borderColor: "#0EA5E9" }}
          >
            Создать профиль
          </Button>
        </Link>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Всего", value: profiles.length, color: "#0EA5E9" },
          {
            label: "Опубликовано",
            value: filterCounts.published,
            color: "#22c55e",
          },
          { label: "Черновиков", value: filterCounts.draft, color: "#9ca3af" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-gray-200 p-3 text-center"
          >
            <div className="text-2xl font-bold" style={{ color: stat.color }}>
              {stat.value}
            </div>
            <div className="text-xs text-gray-500 mt-0.5 leading-tight">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Мобиль: горизонтальные чипы-фильтры + карточки */}
      <div className="block md:hidden">
        <div className="overflow-x-auto scrollbar-hide pb-2 mb-4 -mx-4 px-4">
          <div className="flex gap-2 w-max">
            {(Object.keys(FILTER_LABELS) as FilterKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setActiveFilter(key)}
                className={[
                  "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                  activeFilter === key
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600",
                ].join(" ")}
              >
                {FILTER_LABELS[key]}
                <span
                  className={[
                    "text-xs px-1.5 py-0.5 rounded-full font-semibold leading-none",
                    activeFilter === key
                      ? "bg-white/20 text-white"
                      : "bg-gray-100 text-gray-500",
                  ].join(" ")}
                >
                  {filterCounts[key]}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {filteredCards.length === 0 ? (
            <div className="text-center text-gray-400 py-12 text-sm">
              Нет профилей
            </div>
          ) : (
            filteredCards.map((profile) => {
              const availabilityColor =
                AVAILABILITY_COLORS[profile.availability];
              const availabilityLabel =
                AVAILABILITY_LABELS[profile.availability];
              return (
                <div
                  key={profile.id}
                  className={[
                    "bg-white rounded-2xl border border-gray-200 overflow-hidden",
                    "border-l-4",
                    profile.isPublished
                      ? "border-l-sky-400"
                      : "border-l-gray-300",
                  ].join(" ")}
                >
                  {/* Шапка карточки */}
                  <div className="p-4 pb-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn("w-12 h-12 shrink-0 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-xl shadow-sm", profile.avatarColor ?? getAvatarGradient(profile.fullName))}>
                          {profile.fullName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 text-base flex items-center gap-1 leading-tight">
                            <span className="truncate">{profile.fullName}</span>
                            {profile.verified && <VerifiedBadge size={14} />}
                          </div>
                          <div className="text-xs text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full inline-flex items-center gap-1 mt-1 max-w-full truncate">
                            <FileTextOutlined className="shrink-0" />{" "}
                            {profile.title}
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 mt-0.5 flex flex-col items-end gap-1">
                        {profile.isPublished ? (
                          <Tag color="green" className="text-xs m-0">
                            Опубликован
                          </Tag>
                        ) : (
                          <Tag color="default" className="text-xs m-0">
                            Черновик
                          </Tag>
                        )}
                        {(profile.boosts ?? []).map((bt) => (
                          <Tag key={bt} color={BOOST_COLORS[bt]} className="text-xs m-0">
                            {BOOST_LABELS[bt]}
                          </Tag>
                        ))}
                      </div>
                    </div>

                    {/* Статус доступности + город */}
                    <div className="flex items-center gap-1.5 mb-3">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: availabilityColor }}
                      />
                      <span
                        style={{ color: availabilityColor }}
                        className="text-xs font-medium"
                      >
                        {availabilityLabel}
                      </span>
                      <span className="text-gray-300 text-xs">·</span>
                      <span className="text-gray-500 text-xs">
                        {profile.city}
                      </span>
                    </div>

                    {/* Платформы */}
                    <div className="flex flex-wrap gap-2">
                      {profile.platforms
                        .slice(0, 3)
                        .map((p: CreatorPlatform) => (
                          <div
                            key={p.name}
                            className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-full px-2.5 py-1 text-xs text-gray-700"
                          >
                            <span
                              className="w-4 h-4 rounded flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                              style={{ background: PLATFORM_COLORS[p.name] }}
                            >
                              {p.name.charAt(0)}
                            </span>
                            <span>{p.name}</span>
                            {p.followers && (
                              <span className="text-gray-400 font-medium">
                                {formatFollowers(p.followers)}
                              </span>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Портфолио */}
                  {profile.portfolio.length > 0 && (
                    <div className="px-4 pb-3">
                      <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
                        {profile.portfolio
                          .slice(0, 4)
                          .map((item: PortfolioItem) => (
                            <div
                              key={item.id}
                              className="w-20 h-20 shrink-0 rounded-xl overflow-hidden border border-gray-100 shadow-sm"
                            >
                              <img
                                src={item.thumbnail}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        {profile.portfolio.length > 4 && (
                          <div className="w-20 h-20 shrink-0 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center text-sm text-gray-400 font-medium">
                            +{profile.portfolio.length - 4}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Нижняя панель */}
                  <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="text-base font-bold text-gray-800">
                        от {profile.pricing.minimumRate.toLocaleString("ru-KZ")}{" "}
                        ₸
                      </div>
                      {profile.pricing.negotiable && (
                        <span className="text-xs text-gray-400">
                          договорная
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {!profile.isPublished && (
                        <Button
                          type="primary"
                          size="middle"
                          block
                          onClick={() => handleAction(profile.id, "publish")}
                          style={{
                            background: "#0EA5E9",
                            borderColor: "#0EA5E9",
                          }}
                          className="mb-1.5"
                        >
                          Опубликовать
                        </Button>
                      )}
                      {profile.isPublished && (profile.boosts ?? []).length === 0 && (
                        <Link href={`/creators/${profile.id}/boost`} className="w-full">
                          <Button
                            type="default"
                            size="middle"
                            icon={<RocketOutlined />}
                            block
                            className="mb-1.5 text-purple-600 border-purple-200 hover:border-purple-400"
                          >
                            Продвинуть профиль
                          </Button>
                        </Link>
                      )}
                      <div className="flex items-center gap-2 w-full">
                        <Link
                          href={`/creators/edit?id=${profile.id}`}
                          className="flex-1"
                        >
                          <Button
                            type="default"
                            size="middle"
                            icon={<EditOutlined />}
                            block
                          >
                            Изменить
                          </Button>
                        </Link>
                        <Link
                          href={`/creators/${profile.id}`}
                          className="flex-1"
                        >
                          <Button
                            type="default"
                            size="middle"
                            block
                            className="text-sky-600 border-sky-200"
                          >
                            Смотреть →
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Добавить ещё профиль */}
        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:border-sky-300 transition-colors mt-4">
          <div className="mb-2 flex justify-center">
            <PlusOutlined className="text-2xl text-gray-400" />
          </div>
          <p className="text-gray-500 text-sm mb-3">
            Другая специализация? Создайте отдельный профиль
          </p>
          <Link href="/creators/new">
            <Button type="default" icon={<PlusOutlined />}>
              Создать ещё профиль
            </Button>
          </Link>
        </div>
      </div>

      {/* Десктоп: Tabs + Table */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-200">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          tabBarStyle={{ paddingLeft: 16, paddingRight: 16 }}
        />
      </div>


    </PublicLayout>
  );
}
