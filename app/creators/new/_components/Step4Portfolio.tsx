import { useEffect, useRef, useState } from "react";
import { Input, Select, Button, InputNumber, Upload, message } from "antd";
import type { UploadProps } from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  VideoCameraOutlined,
  EyeOutlined,
  HeartFilled,
  PlayCircleFilled,
  LoadingOutlined,
  DownOutlined,
  HolderOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  PictureOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { PLATFORM_COLORS } from "@/lib/constants";
import { formatFollowers, toDisplayThumbnailUrl } from "@/lib/utils";
import type { VideoMetaResult } from "@/lib/scrapers/types";

export type PortfolioDraftBase = {
  videoUrl: string;
  category: string;
  description?: string | null;
  thumbnail?: string | null;
  views?: number | null;
  likes?: number | null;
  title?: string | null;
  platform?: string | null;
  metaLoading?: boolean;
  metaError?: string | null;
};

type RefItem = { key: string; label: string; iconUrl?: string | null };

type Step4PortfolioProps<T extends PortfolioDraftBase> = {
  items: T[];
  onChange: (items: T[]) => void;
  categories: RefItem[];
  createNew?: () => T;
  hideTip?: boolean;
};

function detectPlatformFromUrl(
  url: string,
): "YouTube" | "TikTok" | "Instagram" | "VK" | null {
  const u = url.toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "YouTube";
  if (u.includes("tiktok.com")) return "TikTok";
  if (u.includes("vkvideo.ru") || u.includes("vk.com") || u.includes("vk.ru")) {
    return "VK";
  }
  if (u.includes("instagram.com")) return "Instagram";
  return null;
}

async function fetchVideoMeta(url: string): Promise<VideoMetaResult> {
  try {
    const res = await fetch(
      `/api/scrape/video?url=${encodeURIComponent(url)}`,
      { cache: "no-store" },
    );
    return (await res.json()) as VideoMetaResult;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

function Thumbnail({
  item,
  size = "md",
}: {
  item: PortfolioDraftBase;
  size?: "sm" | "md";
}) {
  const platform = item.platform ?? detectPlatformFromUrl(item.videoUrl ?? "");
  const isEmpty = !item.videoUrl?.trim();
  const [imgFailed, setImgFailed] = useState(false);
  const [prevThumb, setPrevThumb] = useState(item.thumbnail ?? null);
  if (prevThumb !== (item.thumbnail ?? null)) {
    setPrevThumb(item.thumbnail ?? null);
    setImgFailed(false);
  }

  const dims =
    size === "sm"
      ? "w-14 h-20 sm:w-16 sm:h-24"
      : "w-24 h-36";

  return (
    <div
      className={`${dims} rounded-lg overflow-hidden bg-gray-100 shrink-0 relative`}
    >
      {item.thumbnail && !imgFailed ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={toDisplayThumbnailUrl(item.thumbnail) ?? ""}
          alt={item.title ?? platform ?? "preview"}
          className="w-full h-full object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{
            background: isEmpty
              ? "#f3f4f6"
              : `linear-gradient(135deg, ${platform && PLATFORM_COLORS[platform] ? PLATFORM_COLORS[platform] : "#64748b"}, #1f2937)`,
          }}
        >
          {item.metaLoading ? (
            <LoadingOutlined
              className={
                isEmpty ? "text-gray-400 text-xl" : "text-white/80 text-2xl"
              }
              spin
            />
          ) : isEmpty ? (
            <VideoCameraOutlined className="text-gray-300 text-xl" />
          ) : (
            <PlayCircleFilled className="text-white/80 text-2xl" />
          )}
        </div>
      )}
    </div>
  );
}

function PlatformChip({ platform }: { platform: string }) {
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
      style={{ background: PLATFORM_COLORS[platform] ?? "#1f2937" }}
    >
      {platform}
    </span>
  );
}

type RowProps<T extends PortfolioDraftBase> = {
  item: T;
  idx: number;
  expanded: boolean;
  isFirst: boolean;
  isLast: boolean;
  categories: RefItem[];
  categoryLabel: string | null;
  onToggle: () => void;
  onUpdate: (patch: Partial<PortfolioDraftBase>) => void;
  onRemove: () => void;
  onMove: (dir: "up" | "down") => void;
  onUrlBlur: (url: string) => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  isDragOver: boolean;
};

function PortfolioRow<T extends PortfolioDraftBase>({
  item,
  idx,
  expanded,
  isFirst,
  isLast,
  categories,
  categoryLabel,
  onToggle,
  onUpdate,
  onRemove,
  onMove,
  onUrlBlur,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
  isDragOver,
}: RowProps<T>) {
  const platform = item.platform ?? detectPlatformFromUrl(item.videoUrl ?? "");
  const isEmpty = !item.videoUrl?.trim();
  const displayTitle =
    item.description?.trim() ||
    item.title?.trim() ||
    (isEmpty ? null : item.videoUrl);

  const [uploading, setUploading] = useState(false);

  const uploadProps: UploadProps = {
    accept: "image/jpeg,image/png,image/webp",
    showUploadList: false,
    beforeUpload: async (file) => {
      setUploading(true);
      try {
        const form = new FormData();
        form.append("file", file);
        form.append("type", "portfolio");
        const res = await fetch("/api/upload", {
          method: "POST",
          body: form,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          message.error(data.error || "Не удалось загрузить обложку");
          return false;
        }
        const data = (await res.json()) as { url: string };
        onUpdate({ thumbnail: data.url });
        message.success("Обложка обновлена");
      } catch {
        message.error("Ошибка загрузки");
      } finally {
        setUploading(false);
      }
      return false;
    },
  };

  return (
    <div
      className={[
        "rounded-xl border bg-white transition-all",
        isDragging ? "opacity-40" : "",
        isDragOver ? "border-violet-400 ring-2 ring-violet-100" : "border-gray-200",
        expanded ? "shadow-sm" : "hover:border-gray-300",
      ].join(" ")}
      onDragOver={onDragOver}
    >
      {/* Collapsed header (clickable) */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        className="flex items-center gap-3 p-3 cursor-pointer select-none"
      >
        {/* Drag handle — desktop only */}
        <div
          draggable
          onDragStart={(e) => {
            e.stopPropagation();
            onDragStart();
          }}
          onDragEnd={(e) => {
            e.stopPropagation();
            onDragEnd();
          }}
          onClick={(e) => e.stopPropagation()}
          className="hidden sm:flex items-center justify-center w-5 h-10 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0"
          aria-label="Переместить"
          title="Переместить"
        >
          <HolderOutlined />
        </div>

        <Thumbnail item={item} size="sm" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {platform && !isEmpty && <PlatformChip platform={platform} />}
            {categoryLabel && (
              <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700">
                {categoryLabel}
              </span>
            )}
            {item.metaError && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600">
                <WarningOutlined /> Без авто-превью
              </span>
            )}
          </div>
          <p className="text-sm text-gray-900 truncate mt-0.5">
            {displayTitle ?? (
              <span className="text-gray-400">Новая работа — вставьте ссылку</span>
            )}
          </p>
          {(!!item.views || !!item.likes) && (
            <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
              {!!item.views && (
                <span className="inline-flex items-center gap-1">
                  <EyeOutlined /> {formatFollowers(item.views)}
                </span>
              )}
              {!!item.likes && (
                <span className="inline-flex items-center gap-1">
                  <HeartFilled className="text-rose-400" />{" "}
                  {formatFollowers(item.likes)}
                </span>
              )}
            </div>
          )}
        </div>

        <DownOutlined
          className={`text-gray-400 text-xs transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-gray-100 px-3 pb-4 pt-4 sm:px-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Ссылка на видео
            </label>
            <Input
              size="large"
              value={item.videoUrl}
              placeholder="https://youtube.com / tiktok.com / vkvideo.ru"
              inputMode="url"
              onChange={(e) => onUpdate({ videoUrl: e.target.value })}
              onBlur={(e) => onUrlBlur(e.target.value)}
              suffix={
                <LoadingOutlined
                  spin
                  className="text-gray-400"
                  style={{
                    visibility: item.metaLoading ? "visible" : "hidden",
                  }}
                />
              }
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Категория
            </label>
            <Select
              size="large"
              value={item.category || undefined}
              options={categories.map((c) => ({
                label: c.label,
                value: c.key,
              }))}
              placeholder="Например: Подкасты, Обзоры"
              style={{ width: "100%" }}
              onChange={(val) => onUpdate({ category: val ?? "" })}
              allowClear
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Описание
            </label>
            <Input.TextArea
              value={item.description ?? ""}
              placeholder={
                item.title
                  ? `По умолчанию: «${item.title}»`
                  : "Короткое описание (необязательно)"
              }
              rows={2}
              onChange={(e) => onUpdate({ description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1 text-xs font-medium text-gray-500 mb-1">
                <EyeOutlined /> Просмотры
              </label>
              <InputNumber
                size="large"
                value={item.views ?? null}
                onChange={(v) =>
                  onUpdate({ views: typeof v === "number" ? v : null })
                }
                placeholder="Указать вручную"
                style={{ width: "100%" }}
                min={0}
                controls={false}
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-xs font-medium text-gray-500 mb-1">
                <HeartFilled className="text-rose-400" /> Лайки
              </label>
              <InputNumber
                size="large"
                value={item.likes ?? null}
                onChange={(v) =>
                  onUpdate({ likes: typeof v === "number" ? v : null })
                }
                placeholder="Указать вручную"
                style={{ width: "100%" }}
                min={0}
                controls={false}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Обложка
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <Upload {...uploadProps}>
                <Button
                  icon={uploading ? <LoadingOutlined spin /> : <PictureOutlined />}
                  disabled={uploading}
                >
                  {item.thumbnail ? "Заменить обложку" : "Загрузить обложку"}
                </Button>
              </Upload>
              {item.thumbnail && (
                <Button
                  type="text"
                  danger
                  onClick={() => onUpdate({ thumbnail: null })}
                >
                  Убрать
                </Button>
              )}
              {!item.thumbnail && !isEmpty && (
                <span className="text-[11px] text-gray-400">
                  Мы попробуем подтянуть автоматически
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            {/* Mobile reorder arrows */}
            <div className="flex items-center gap-1 sm:hidden">
              <Button
                size="small"
                icon={<ArrowUpOutlined />}
                disabled={isFirst}
                onClick={() => onMove("up")}
                aria-label="Переместить выше"
              />
              <Button
                size="small"
                icon={<ArrowDownOutlined />}
                disabled={isLast}
                onClick={() => onMove("down")}
                aria-label="Переместить ниже"
              />
            </div>
            <div className="hidden sm:block" />

            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={onRemove}
            >
              Удалить работу
            </Button>
          </div>
          <p className="text-[11px] text-gray-400">
            Работа #{idx + 1}
          </p>
        </div>
      )}
    </div>
  );
}

export default function Step4Portfolio<T extends PortfolioDraftBase>({
  items,
  onChange,
  categories,
  createNew,
  hideTip,
}: Step4PortfolioProps<T>) {
  const lastFetchedRef = useRef<Record<number, string>>({});
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const commit = (next: T[]) => {
    itemsRef.current = next;
    onChange(next);
  };

  const update = (idx: number, patch: Partial<PortfolioDraftBase>) => {
    const cur = itemsRef.current;
    const next = cur.map((it, i) =>
      i === idx ? ({ ...it, ...patch } as T) : it,
    );
    commit(next);
  };

  const remove = (idx: number) => {
    delete lastFetchedRef.current[idx];
    commit(itemsRef.current.filter((_, i) => i !== idx));
    setExpandedIdx((cur) => {
      if (cur === null) return cur;
      if (cur === idx) return null;
      return cur > idx ? cur - 1 : cur;
    });
  };

  const add = () => {
    const blank: PortfolioDraftBase = {
      videoUrl: "",
      category: "",
      description: "",
      thumbnail: null,
      views: null,
      title: null,
      platform: null,
    };
    const newItem = createNew ? createNew() : (blank as T);
    const nextLen = itemsRef.current.length;
    commit([...itemsRef.current, newItem]);
    setExpandedIdx(nextLen);
  };

  const move = (idx: number, dir: "up" | "down") => {
    const cur = itemsRef.current;
    const target = dir === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= cur.length) return;
    const next = [...cur];
    [next[idx], next[target]] = [next[target], next[idx]];
    commit(next);
    setExpandedIdx((e) => (e === idx ? target : e === target ? idx : e));
  };

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    const cur = itemsRef.current;
    if (from < 0 || from >= cur.length || to < 0 || to >= cur.length) return;
    const next = [...cur];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    commit(next);
    setExpandedIdx((e) => {
      if (e === null) return e;
      if (e === from) return to;
      if (from < e && to >= e) return e - 1;
      if (from > e && to <= e) return e + 1;
      return e;
    });
  };

  const triggerFetch = async (idx: number, url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    if (lastFetchedRef.current[idx] === trimmed) return;
    if (!detectPlatformFromUrl(trimmed)) return;
    lastFetchedRef.current[idx] = trimmed;

    update(idx, { metaLoading: true, metaError: null });
    const result = await fetchVideoMeta(trimmed);
    if (result.ok) {
      update(idx, {
        metaLoading: false,
        metaError: null,
        thumbnail: result.thumbnail ?? null,
        views: result.views ?? null,
        likes: result.likes ?? null,
        title: result.title ?? null,
        platform: result.platform,
      });
    } else {
      update(idx, {
        metaLoading: false,
        metaError: result.error,
        platform: detectPlatformFromUrl(trimmed),
      });
    }
  };

  // Автоподтяжка мета при маунте, если URL есть, но thumbnail/views ещё не подтянулись
  useEffect(() => {
    items.forEach((it, idx) => {
      const url = it.videoUrl?.trim();
      if (!url) return;
      if (it.thumbnail || it.title || typeof it.views === "number") return;
      if (it.metaLoading) return;
      if (lastFetchedRef.current[idx] === url) return;
      triggerFetch(idx, url);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  return (
    <div className="space-y-4">
      {!hideTip && (
        <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-800">
          <p className="font-medium mb-0.5 flex items-center gap-1.5">
            <VideoCameraOutlined /> Портфолио — ваш главный аргумент
          </p>
          <p>
            Добавьте минимум одну работу, чтобы профиль попал в каталог. Без
            работ заказчик не поймёт, что вы умеете — и не напишет.
          </p>
        </div>
      )}

      {items.length > 0 && (
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {items.length}{" "}
            {items.length === 1
              ? "работа"
              : items.length < 5
                ? "работы"
                : "работ"}
          </span>
          <span className="hidden sm:inline">
            Перетащите за <HolderOutlined /> чтобы изменить порядок
          </span>
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
          <p className="text-sm text-gray-600">Пока нет ни одной работы</p>
          <p className="text-xs text-gray-400 mt-1">
            Нажмите «Добавить работу» и вставьте ссылку на ваше видео
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item, idx) => {
            const categoryLabel =
              categories.find((c) => c.key === item.category)?.label ?? null;
            return (
              <PortfolioRow
                key={idx}
                item={item}
                idx={idx}
                expanded={expandedIdx === idx}
                isFirst={idx === 0}
                isLast={idx === items.length - 1}
                categories={categories}
                categoryLabel={categoryLabel}
                onToggle={() =>
                  setExpandedIdx((cur) => (cur === idx ? null : idx))
                }
                onUpdate={(patch) => update(idx, patch)}
                onRemove={() => remove(idx)}
                onMove={(dir) => move(idx, dir)}
                onUrlBlur={(url) => triggerFetch(idx, url)}
                onDragStart={() => {
                  setDragIdx(idx);
                  setExpandedIdx(null);
                }}
                onDragOver={(e) => {
                  if (dragIdx === null) return;
                  e.preventDefault();
                  if (dragOverIdx !== idx) setDragOverIdx(idx);
                }}
                onDragEnd={() => {
                  if (dragIdx !== null && dragOverIdx !== null) {
                    reorder(dragIdx, dragOverIdx);
                  }
                  setDragIdx(null);
                  setDragOverIdx(null);
                }}
                isDragging={dragIdx === idx}
                isDragOver={dragOverIdx === idx && dragIdx !== idx}
              />
            );
          })}
        </div>
      )}

      <Button type="dashed" icon={<PlusOutlined />} block onClick={add}>
        Добавить работу
      </Button>
    </div>
  );
}
