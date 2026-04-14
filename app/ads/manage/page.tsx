"use client";

import Link from "next/link";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Tag, Tabs, Table, Dropdown, Badge, Spin, Modal } from "antd";
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  PauseOutlined,
  PlayCircleOutlined,
  InboxOutlined,
  DeleteOutlined,
  EllipsisOutlined,
  CreditCardOutlined,
  CloseOutlined,
  MessageOutlined,
  RocketOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { toast } from "sonner";
import PublicLayout from "@/components/layout/PublicLayout";
import AdManagementCard from "@/components/ads/AdManagementCard";
import {
  AD_STATUS_COLORS,
  AD_STATUS_LABELS,
  STORAGE_KEYS,
  PUBLICATION_PRICE,
} from "@/lib/constants";
import { formatDate, daysUntilExpiry, formatPrice } from "@/lib/utils";
import type { Ad, AdStatus } from "@/lib/types/ad";
import { api, ApiError } from "@/lib/api-client";
import { useRequireAuth } from "@/hooks/useRequireAuth";

type FilterKey = "all" | "active" | "paused" | "expired";

const FILTER_LABELS: Record<FilterKey, string> = {
  all: "Все",
  active: "Активные",
  paused: "Пауза",
  expired: "Истекшие",
};

const FILTER_STATUSES: Record<FilterKey, AdStatus[]> = {
  all: [
    "draft",
    "pending_payment",
    "active",
    "paused",
    "expired",
    "archived",
    "deleted",
  ],
  active: ["active"],
  paused: ["paused"],
  expired: ["expired", "archived"],
};

function AdsManagePageInner() {
  // Защита страницы — редирект если не авторизован
  const { isLoading: authLoading } = useRequireAuth();

  const searchParams = useSearchParams();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [activeTab, setActiveTab] = useState("all");
  const [pendingPayment, setPendingPayment] = useState<{
    savedAt: string;
  } | null>(null);

  // Обработка возврата с платёжного провайдера
  const paymentHandled = useRef(false);
  useEffect(() => {
    if (paymentHandled.current) return;
    const payment = searchParams.get("payment");
    if (payment === "success") {
      paymentHandled.current = true;
      toast.success("Оплата прошла! Объявление опубликовано.");
      try {
        localStorage.removeItem(STORAGE_KEYS.PAYMENT_STATE);
        localStorage.removeItem(STORAGE_KEYS.AD_DRAFT);
      } catch {
        /* ignore */
      }
      window.history.replaceState({}, "", "/ads/manage");
    } else if (payment === "failed") {
      paymentHandled.current = true;
      toast.error("Оплата не прошла. Попробуйте ещё раз.");
      window.history.replaceState({}, "", "/ads/manage");
    }
  }, [searchParams]);

  // Загружаем объявления с сервера
  useEffect(() => {
    if (authLoading) return;
    const fetchAds = async () => {
      setLoading(true);
      try {
        const data = await api.get<Ad[]>("/api/tasks/my");
        setAds(data);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          toast.error("Необходима авторизация");
        }
        setAds([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAds();
  }, [authLoading]);

  if (authLoading) {
    return (
      <PublicLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Spin size="large" />
        </div>
      </PublicLayout>
    );
  }

  // Проверяем незавершённую оплату публикации в localStorage
  useEffect(() => {
    try {
      const state = localStorage.getItem(STORAGE_KEYS.PAYMENT_STATE);
      if (state) {
        const parsed = JSON.parse(state) as { savedAt: string };
        setPendingPayment(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  const dismissPendingPayment = () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.PAYMENT_STATE);
      localStorage.removeItem(STORAGE_KEYS.AD_DRAFT);
    } catch {
      // ignore
    }
    setPendingPayment(null);
  };

  const filterByStatus = (statuses: AdStatus[]) =>
    ads.filter((a) => statuses.includes(a.status));

  const filteredCards =
    activeFilter === "all"
      ? ads
      : filterByStatus(FILTER_STATUSES[activeFilter]);

  const handleAction = async (adId: string, action: string) => {
    try {
      if (action === "pause") {
        await api.post(`/api/tasks/${adId}/pause`);
        setAds((prev) =>
          prev.map((a) =>
            a.id === adId ? { ...a, status: "paused" as AdStatus } : a,
          ),
        );
        toast.success("Объявление приостановлено");
      } else if (action === "resume") {
        await api.post(`/api/tasks/${adId}/resume`);
        setAds((prev) =>
          prev.map((a) =>
            a.id === adId ? { ...a, status: "active" as AdStatus } : a,
          ),
        );
        toast.success("Объявление возобновлено");
      } else if (action === "archive") {
        await api.post(`/api/tasks/${adId}/archive`);
        setAds((prev) =>
          prev.map((a) =>
            a.id === adId ? { ...a, status: "archived" as AdStatus } : a,
          ),
        );
        toast.success("Объявление архивировано");
      } else if (action === "delete") {
        await api.delete(`/api/tasks/${adId}`);
        setAds((prev) => prev.filter((a) => a.id !== adId));
        toast.success("Объявление удалено");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error("Ошибка выполнения");
      }
    }
  };

  const columns: ColumnsType<Ad> = [
    {
      title: "Объявление",
      key: "title",
      render: (_, ad) => (
        <div>
          <Link
            href={`/ads/${ad.id}`}
            className="font-medium text-gray-900 hover:text-blue-600"
          >
            {ad.title}
          </Link>
          <div className="flex items-center gap-2 mt-1">
            <Tag>{ad.platform}</Tag>
            <Tag>{ad.city}</Tag>
          </div>
        </div>
      ),
    },
    {
      title: "Статус",
      key: "status",
      width: 140,
      render: (_, ad) => (
        <div>
          <Badge
            status={AD_STATUS_COLORS[ad.status] as any}
            text={AD_STATUS_LABELS[ad.status]}
          />
          {ad.status === "active" && ad.expiresAt && (
            <div className="text-xs text-gray-400 mt-0.5">
              Осталось: {daysUntilExpiry(ad.expiresAt)} дн.
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Статистика",
      key: "stats",
      width: 140,
      render: (_, ad) => (
        <div className="text-sm">
          <div className="text-gray-700 flex items-center gap-1">
            <EyeOutlined /> {ad.metadata.viewCount} просм.
          </div>
          <div className="text-gray-500 flex items-center gap-1">
            <MessageOutlined /> {ad.metadata.contactClickCount} обращ.
          </div>
        </div>
      ),
    },
    {
      title: "Опубликовано",
      key: "date",
      width: 120,
      render: (_, ad) => (
        <span className="text-sm text-gray-500">
          {formatDate(ad.publishedAt)}
        </span>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 60,
      render: (_, ad) => {
        const menuItems = [
          {
            key: "view",
            icon: <EyeOutlined />,
            label: <Link href={`/ads/${ad.id}`}>Просмотр</Link>,
          },
          {
            key: "edit",
            icon: <EditOutlined />,
            label: <Link href={`/ads/${ad.id}/edit`}>Редактировать</Link>,
          },
          { type: "divider" as const },
          ...(ad.status === "active"
            ? [
                {
                  key: "boost",
                  icon: <RocketOutlined />,
                  label: <Link href={`/ads/${ad.id}/boost`}>Продвинуть</Link>,
                },
                {
                  key: "pause",
                  icon: <PauseOutlined />,
                  label: "Поставить на паузу",
                  onClick: () => handleAction(ad.id, "pause"),
                },
              ]
            : []),
          ...(ad.status === "paused"
            ? [
                {
                  key: "resume",
                  icon: <PlayCircleOutlined />,
                  label: "Возобновить",
                  onClick: () => handleAction(ad.id, "resume"),
                },
              ]
            : []),
          {
            key: "archive",
            icon: <InboxOutlined />,
            label: "Архивировать",
            onClick: () => handleAction(ad.id, "archive"),
          },
          { type: "divider" as const },
          {
            key: "delete",
            icon: <DeleteOutlined />,
            label: "Удалить",
            danger: true,
            onClick: () =>
              Modal.confirm({
                title: "Удалить объявление?",
                content: "Это действие необратимо.",
                okText: "Удалить",
                okType: "danger",
                cancelText: "Отмена",
                onOk: () => handleAction(ad.id, "delete"),
              }),
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
      label: `Все (${ads.length})`,
      children: (
        <Table
          dataSource={ads}
          columns={columns}
          rowKey="id"
          size="middle"
          loading={loading}
        />
      ),
    },
    {
      key: "active",
      label: `Активные (${filterByStatus(["active"]).length})`,
      children: (
        <Table
          dataSource={filterByStatus(["active"])}
          columns={columns}
          rowKey="id"
          size="middle"
        />
      ),
    },
    {
      key: "paused",
      label: `Пауза (${filterByStatus(["paused"]).length})`,
      children: (
        <Table
          dataSource={filterByStatus(["paused"])}
          columns={columns}
          rowKey="id"
          size="middle"
        />
      ),
    },
    {
      key: "expired",
      label: `Истекшие (${filterByStatus(["expired", "archived"]).length})`,
      children: (
        <Table
          dataSource={filterByStatus(["expired", "archived"])}
          columns={columns}
          rowKey="id"
          size="middle"
        />
      ),
    },
  ];

  const filterCounts: Record<FilterKey, number> = {
    all: ads.length,
    active: filterByStatus(["active"]).length,
    paused: filterByStatus(["paused"]).length,
    expired: filterByStatus(["expired", "archived"]).length,
  };

  return (
    <PublicLayout>
      {/* Шапка */}
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
            Мои задания
          </h1>
          <p className="text-gray-500 text-sm sm:text-base">
            Управляйте своими размещениями
          </p>
        </div>
        <Link href="/ads/new" className="w-full sm:w-auto sm:flex-shrink-0">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            className="w-full sm:w-auto"
            style={{ background: "#0EA5E9", borderColor: "#0EA5E9" }}
          >
            Создать задание
          </Button>
        </Link>
      </div>

      {/* Баннер незавершённой оплаты публикации */}
      {pendingPayment && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <CreditCardOutlined className="text-amber-600 text-lg" />
            </div>
            <div>
              <p className="font-semibold text-amber-900 text-sm">
                Незавершённая оплата
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Объявление заполнено, но не оплачено —{" "}
                {formatPrice(PUBLICATION_PRICE)} за публикацию на 7 дней
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/ads/new?resume=true">
              <Button
                type="primary"
                size="small"
                icon={<CreditCardOutlined />}
                style={{ background: "#F59E0B", borderColor: "#F59E0B" }}
              >
                Оплатить
              </Button>
            </Link>
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined />}
              onClick={dismissPendingPayment}
              className="text-amber-600 hover:text-amber-800"
              title="Отменить и удалить черновик"
            />
          </div>
        </div>
      )}

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Активных",
            value: filterByStatus(["active"]).length,
            color: "#22c55e",
          },
          {
            label: "На паузе",
            value: filterByStatus(["paused"]).length,
            color: "#3B82F6",
          },
          {
            label: "Истекших",
            value: filterByStatus(["expired"]).length,
            color: "#ef4444",
          },
          {
            label: "Всего обращений",
            value: ads.reduce(
              (sum, a) => sum + a.metadata.contactClickCount,
              0,
            ),
            color: "#0EA5E9",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-gray-200 p-4"
          >
            <div className="text-2xl font-bold" style={{ color: stat.color }}>
              {stat.value}
            </div>
            <div className="text-sm text-gray-500 mt-0.5">{stat.label}</div>
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

        <div>
          {filteredCards.length === 0 ? (
            <div className="text-center text-gray-400 py-12 text-sm">
              Нет объявлений
            </div>
          ) : (
            filteredCards.map((ad) => (
              <AdManagementCard key={ad.id} ad={ad} onAction={handleAction} />
            ))
          )}
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

export default function AdsManagePage() {
  return (
    <Suspense fallback={null}>
      <AdsManagePageInner />
    </Suspense>
  );
}
