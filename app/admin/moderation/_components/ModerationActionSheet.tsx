"use client";

import { Drawer, Modal } from "antd";
import {
  CheckCircleOutlined,
  StarOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  UndoOutlined,
  DeleteOutlined,
  CloseOutlined,
  LinkOutlined,
} from "@ant-design/icons";
import { api, ApiError } from "@/lib/api-client";
import { toast } from "sonner";
import { AdItem, CreatorItem } from "./types";
import { ActionSheetButton } from "./ActionSheetButton";

interface ModerationActionSheetProps {
  open: boolean;
  onClose: () => void;
  ad: AdItem | null;
  creator: CreatorItem | null;
  onAdUpdated: (id: string, updated: Partial<AdItem>) => void;
  onCreatorUpdated: (id: string, updated: Partial<CreatorItem>) => void;
}

export function ModerationActionSheet({
  open,
  onClose,
  ad,
  creator,
  onAdUpdated,
  onCreatorUpdated,
}: ModerationActionSheetProps) {
  // ─── Ad actions ─────────────────────────────────────────────────────────
  const handleAdAction = async (
    id: string,
    action: { status?: string; restore?: boolean },
  ) => {
    onClose();
    try {
      const updated = await api.patch<AdItem>(`/api/admin/ads/${id}`, action);
      onAdUpdated(id, updated);
      toast.success("Объявление обновлено");
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    }
  };

  const handleDeleteAd = (adItem: AdItem) => {
    onClose();
    Modal.confirm({
      title: "Удалить объявление?",
      content: adItem.title,
      okText: "Удалить",
      okType: "danger",
      cancelText: "Отмена",
      onOk: () => handleAdAction(adItem.id, { status: "deleted" }),
    });
  };

  // ─── Creator actions ────────────────────────────────────────────────────
  const handleCreatorAction = async (
    id: string,
    action: Record<string, boolean>,
  ) => {
    onClose();
    try {
      const updated = await api.patch<CreatorItem>(
        `/api/admin/creators/${id}`,
        action,
      );
      onCreatorUpdated(id, updated);
      toast.success("Профиль обновлён");
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="bottom"
      size="default"
      closable={false}
      styles={{
        wrapper: { borderRadius: "16px 16px 0 0" },
        body: { padding: "0 0 env(safe-area-inset-bottom, 16px) 0" },
      }}
      rootClassName="admin-user-actions-drawer"
    >
      {/* Drag handle */}
      <div className="flex justify-center pt-3 pb-2">
        <div className="w-10 h-1 bg-gray-200 rounded-full" />
      </div>

      {/* ── Ad actions ──────────────────────────────── */}
      {ad && (
        <div>
          <div className="px-5 pb-3 border-b border-gray-100">
            <p className="font-semibold text-gray-900 text-[15px] truncate">
              {ad.title}
            </p>
            <p className="text-[13px] text-gray-500 truncate">
              {ad.owner.name} · {ad.owner.email}
            </p>
          </div>
          <div className="py-2">
            <ActionSheetButton
              icon={<LinkOutlined />}
              label="Открыть объявление"
              color="text-gray-700"
              onClick={() => {
                onClose();
                window.open(`/ads/${ad.id}`, "_blank");
              }}
            />
            {ad.deletedAt ? (
              <ActionSheetButton
                icon={<UndoOutlined />}
                label="Восстановить"
                color="text-green-600"
                onClick={() => handleAdAction(ad.id, { restore: true })}
              />
            ) : (
              <>
                {ad.status === "active" && (
                  <ActionSheetButton
                    icon={<EyeInvisibleOutlined />}
                    label="Скрыть (в черновик)"
                    color="text-gray-700"
                    onClick={() =>
                      handleAdAction(ad.id, { status: "draft" })
                    }
                  />
                )}
                <ActionSheetButton
                  icon={<DeleteOutlined />}
                  label="Удалить"
                  color="text-red-600"
                  onClick={() => handleDeleteAd(ad)}
                />
              </>
            )}
            <div className="mx-4 mt-1 border-t border-gray-100" />
            <ActionSheetButton
              icon={<CloseOutlined />}
              label="Отмена"
              color="text-gray-500"
              onClick={onClose}
            />
          </div>
        </div>
      )}

      {/* ── Creator actions ─────────────────────────── */}
      {creator && (
        <div>
          <div className="px-5 pb-3 border-b border-gray-100">
            <p className="font-semibold text-gray-900 text-[15px] truncate">
              {creator.title}
            </p>
            <p className="text-[13px] text-gray-500 truncate">
              {creator.user.name} · {creator.user.email}
            </p>
          </div>
          <div className="py-2">
            <ActionSheetButton
              icon={<LinkOutlined />}
              label="Открыть профиль"
              color="text-gray-700"
              onClick={() => {
                onClose();
                window.open(`/creators/${creator.id}`, "_blank");
              }}
            />
            <ActionSheetButton
              icon={<CheckCircleOutlined />}
              label={
                creator.verified ? "Снять верификацию" : "Верифицировать"
              }
              color={creator.verified ? "text-gray-700" : "text-green-600"}
              onClick={() =>
                handleCreatorAction(creator.id, {
                  verified: !creator.verified,
                })
              }
            />
            <ActionSheetButton
              icon={<StarOutlined />}
              label={
                creator.featured
                  ? "Убрать Featured"
                  : "Добавить в Featured"
              }
              color={creator.featured ? "text-gray-700" : "text-amber-600"}
              onClick={() =>
                handleCreatorAction(creator.id, {
                  featured: !creator.featured,
                })
              }
            />
            {creator.isPublished ? (
              <ActionSheetButton
                icon={<EyeInvisibleOutlined />}
                label="Скрыть профиль"
                color="text-red-600"
                onClick={() =>
                  handleCreatorAction(creator.id, { isPublished: false })
                }
              />
            ) : (
              <ActionSheetButton
                icon={<EyeOutlined />}
                label="Опубликовать профиль"
                color="text-green-600"
                onClick={() =>
                  handleCreatorAction(creator.id, { isPublished: true })
                }
              />
            )}
            <div className="mx-4 mt-1 border-t border-gray-100" />
            <ActionSheetButton
              icon={<CloseOutlined />}
              label="Отмена"
              color="text-gray-500"
              onClick={onClose}
            />
          </div>
        </div>
      )}
    </Drawer>
  );
}
