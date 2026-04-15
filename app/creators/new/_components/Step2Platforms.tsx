import { useState } from "react";
import { Form, Input, InputNumber, Button } from "antd";
import { SyncOutlined, PlusOutlined } from "@ant-design/icons";
import type { FormInstance } from "antd";

type RefItem = { key: string; label: string; iconUrl?: string | null };

type Step2PlatformsProps = {
  form: FormInstance;
  platforms: RefItem[];
  fetchingPlatform: string | null;
  onFetchFollowers: (platformKey: string) => void;
  platformUrlConfig: Record<
    string,
    {
      prefix: string;
      letter: string;
      badgeClass: string;
      placeholder: string;
    }
  >;
};

const PRIMARY_PLATFORMS = ["TikTok", "Instagram"];

export default function Step2Platforms({
  platforms,
  fetchingPlatform,
  onFetchFollowers,
  platformUrlConfig,
}: Step2PlatformsProps) {
  const [showSecondary, setShowSecondary] = useState(false);

  const primary = platforms.filter((p) => PRIMARY_PLATFORMS.includes(p.key));
  const secondary = platforms.filter(
    (p) => !PRIMARY_PLATFORMS.includes(p.key),
  );

  const renderPlatformCard = (p: RefItem) => {
    const cfg = platformUrlConfig[p.key];
    const isFetching = fetchingPlatform === p.key;
    const canAutoFetch = p.key === "TikTok" || p.key === "YouTube";

    return (
      <div
        key={p.key}
        className="rounded-xl border border-gray-200 p-3 bg-white"
      >
        <div className="flex items-center gap-2 mb-2">
          {p.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.iconUrl}
              alt={p.label}
              className="w-7 h-7 rounded-md object-cover"
            />
          ) : (
            <span
              className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-bold ${cfg?.badgeClass ?? "bg-gray-200 text-gray-700"}`}
              aria-hidden
            >
              {cfg?.letter ?? p.label[0]}
            </span>
          )}
          <span className="font-medium text-gray-900">{p.label}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Form.Item name={["platformHandles", p.key]} className="!mb-0">
            <Input
              size="large"
              placeholder="Ссылка или логин"
              autoComplete="off"
              inputMode="url"
            />
          </Form.Item>
          <Form.Item name={["platformFollowers", p.key]} className="!mb-0">
            <InputNumber
              size="large"
              placeholder="Подписчики"
              min={0}
              className="!w-full"
              formatter={(v) =>
                `${v ?? ""}`.replace(/\B(?=(\d{3})+(?!\d))/g, " ")
              }
              parser={
                ((v: string | undefined) =>
                  Number((v ?? "").replace(/\s/g, "")) || 0) as never
              }
            />
          </Form.Item>
        </div>
        {canAutoFetch && (
          <Button
            type="link"
            size="small"
            icon={<SyncOutlined spin={isFetching} />}
            loading={isFetching}
            onClick={() => onFetchFollowers(p.key)}
            className="!px-0 !mt-1 !h-auto"
          >
            Получить автоматически
          </Button>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="mb-4 p-3 bg-sky-50 border border-sky-100 rounded-xl text-sm text-sky-700">
        Укажите хотя бы одну платформу — так заказчик увидит, где публиковать
        рекламу. Поля необязательные, но чем больше — тем лучше.
      </div>

      <div className="flex flex-col gap-3">{primary.map(renderPlatformCard)}</div>

      {secondary.length > 0 && !showSecondary && (
        <button
          type="button"
          onClick={() => setShowSecondary(true)}
          className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 py-3 text-sm font-medium text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-colors"
        >
          <PlusOutlined />
          Добавить другую платформу ({secondary.map((p) => p.label).join(", ")})
        </button>
      )}

      {showSecondary && (
        <div className="flex flex-col gap-3 mt-3">
          {secondary.map(renderPlatformCard)}
        </div>
      )}
    </>
  );
}
