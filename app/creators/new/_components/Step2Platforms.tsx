import { useState } from "react";
import { Form, Input, InputNumber, Button } from "antd";
import {
  SyncOutlined,
  PlusOutlined,
  CloseOutlined,
} from "@ant-design/icons";
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

function PlatformBadge({
  p,
  cfg,
}: {
  p: RefItem;
  cfg: { letter: string; badgeClass: string } | undefined;
}) {
  if (p.iconUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={p.iconUrl}
        alt={p.label}
        className="w-7 h-7 rounded-md object-cover shrink-0"
      />
    );
  }
  return (
    <span
      className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-bold shrink-0 ${cfg?.badgeClass ?? "bg-gray-200 text-gray-700"}`}
      aria-hidden
    >
      {cfg?.letter ?? p.label[0]}
    </span>
  );
}

export default function Step2Platforms({
  form,
  platforms,
  fetchingPlatform,
  onFetchFollowers,
  platformUrlConfig,
}: Step2PlatformsProps) {
  const [expanded, setExpanded] = useState<Set<string> | null>(null);

  const activeExpanded: Set<string> =
    expanded ??
    (() => {
      const next = new Set<string>();
      for (const p of platforms) {
        const handle = form.getFieldValue(["platformHandles", p.key]) as
          | string
          | undefined;
        const followers = form.getFieldValue(["platformFollowers", p.key]) as
          | number
          | null
          | undefined;
        if (
          (handle && handle.trim()) ||
          (followers !== null && followers !== undefined)
        ) {
          next.add(p.key);
        }
      }
      return next;
    })();

  const expand = (key: string) => {
    const base = expanded ?? activeExpanded;
    const next = new Set(base);
    next.add(key);
    setExpanded(next);
  };

  const collapse = (key: string) => {
    form.setFieldValue(["platformHandles", key], "");
    form.setFieldValue(["platformFollowers", key], null);
    const base = expanded ?? activeExpanded;
    const next = new Set(base);
    next.delete(key);
    setExpanded(next);
  };

  const renderCollapsed = (p: RefItem) => {
    const cfg = platformUrlConfig[p.key];
    return (
      <button
        key={p.key}
        type="button"
        onClick={() => expand(p.key)}
        className="w-full flex items-center justify-between rounded-xl border border-gray-200 p-3 bg-white hover:border-blue-400 hover:bg-blue-50/30 transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <PlatformBadge p={p} cfg={cfg} />
          <span className="font-medium text-gray-900">{p.label}</span>
        </span>
        <span className="flex items-center gap-1 text-sm font-medium text-blue-600">
          <PlusOutlined />
          добавить
        </span>
      </button>
    );
  };

  const renderExpanded = (p: RefItem) => {
    const cfg = platformUrlConfig[p.key];
    const isFetching = fetchingPlatform === p.key;
    const canAutoFetch = p.key === "TikTok" || p.key === "YouTube";

    return (
      <div
        key={p.key}
        className="rounded-xl border border-blue-200 p-3 bg-white ring-1 ring-blue-100"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="flex items-center gap-2">
            <PlatformBadge p={p} cfg={cfg} />
            <span className="font-medium text-gray-900">{p.label}</span>
          </span>
          <button
            type="button"
            onClick={() => collapse(p.key)}
            aria-label={`Убрать ${p.label}`}
            className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-red-500 transition-colors cursor-pointer px-2 py-1 rounded-md hover:bg-red-50"
          >
            <CloseOutlined className="text-[11px]" />
            убрать
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Form.Item name={["platformHandles", p.key]} className="!mb-0">
            <Input
              size="large"
              placeholder={cfg?.placeholder ?? "Ссылка или логин"}
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
        Нажмите на платформу, чтобы добавить. Минимум одну. Можно вернуться и
        убрать в любой момент — данные очистятся.
      </div>

      <div className="flex flex-col gap-2.5">
        {platforms.map((p) =>
          activeExpanded.has(p.key) ? renderExpanded(p) : renderCollapsed(p),
        )}
      </div>
    </>
  );
}
