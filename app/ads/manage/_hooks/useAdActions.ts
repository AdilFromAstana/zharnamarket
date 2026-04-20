import { useCallback, useState } from "react";
import { Modal } from "antd";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api-client";
import type { Ad, AdStatus } from "@/lib/types/ad";
import { track } from "@/lib/analytics";

type SetAds = React.Dispatch<React.SetStateAction<Ad[]>>;

export function useAdActions(setAds: SetAds) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  const updateStatus = useCallback(
    (id: string, next: AdStatus) =>
      setAds((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: next } : a)),
      ),
    [setAds],
  );

  const pause = useCallback(
    async (id: string) => {
      track("manage_action_click", { entity: "ad", entity_id: id, action: "pause" });
      setPendingId(id);
      try {
        await api.post(`/api/tasks/${id}/pause`);
        updateStatus(id, "paused");
        toast.success("Объявление приостановлено");
      } catch (err) {
        if (err instanceof ApiError) toast.error(err.message);
        else toast.error("Ошибка выполнения");
      } finally {
        setPendingId(null);
      }
    },
    [updateStatus],
  );

  const resume = useCallback(
    async (id: string) => {
      track("manage_action_click", { entity: "ad", entity_id: id, action: "resume" });
      setPendingId(id);
      try {
        await api.post(`/api/tasks/${id}/resume`);
        updateStatus(id, "active");
        toast.success("Объявление возобновлено");
      } catch (err) {
        if (err instanceof ApiError) toast.error(err.message);
        else toast.error("Ошибка выполнения");
      } finally {
        setPendingId(null);
      }
    },
    [updateStatus],
  );

  const archive = useCallback(
    async (id: string) => {
      track("manage_action_click", { entity: "ad", entity_id: id, action: "archive" });
      setPendingId(id);
      try {
        await api.post(`/api/tasks/${id}/archive`);
        updateStatus(id, "archived");
        toast.success("Объявление архивировано");
      } catch (err) {
        if (err instanceof ApiError) toast.error(err.message);
        else toast.error("Ошибка выполнения");
      } finally {
        setPendingId(null);
      }
    },
    [updateStatus],
  );

  const remove = useCallback(
    (id: string) => {
      track("manage_action_click", { entity: "ad", entity_id: id, action: "delete" });
      Modal.confirm({
        title: "Удалить объявление?",
        content: "Это действие необратимо.",
        okText: "Удалить",
        okType: "danger",
        cancelText: "Отмена",
        onOk: async () => {
          setPendingId(id);
          try {
            await api.delete(`/api/tasks/${id}`);
            setAds((prev) => prev.filter((a) => a.id !== id));
            toast.success("Объявление удалено");
          } catch (err) {
            if (err instanceof ApiError) toast.error(err.message);
            else toast.error("Ошибка выполнения");
          } finally {
            setPendingId(null);
          }
        },
      });
    },
    [setAds],
  );

  return { pause, resume, archive, remove, pendingId };
}
