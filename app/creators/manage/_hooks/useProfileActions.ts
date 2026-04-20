import { useCallback, useState } from "react";
import { Modal } from "antd";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api-client";
import type { CreatorProfile } from "@/lib/types/creator";
import { track } from "@/lib/analytics";

type SetProfiles = React.Dispatch<React.SetStateAction<CreatorProfile[]>>;

export function useProfileActions(setProfiles: SetProfiles) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const router = useRouter();

  const publish = useCallback(
    async (id: string) => {
      track("manage_action_click", { entity: "creator", entity_id: id, action: "publish" });
      setPendingId(id);
      try {
        await api.post(`/api/creators/${id}/publish`);
        setProfiles((prev) =>
          prev.map((p) => (p.id === id ? { ...p, isPublished: true } : p)),
        );
        router.push(`/creators/${id}/published`);
      } catch (err) {
        if (err instanceof ApiError) toast.error(err.message);
      } finally {
        setPendingId(null);
      }
    },
    [setProfiles, router],
  );

  const unpublish = useCallback(
    async (id: string) => {
      track("manage_action_click", { entity: "creator", entity_id: id, action: "unpublish" });
      setPendingId(id);
      try {
        await api.post(`/api/creators/${id}/unpublish`);
        setProfiles((prev) =>
          prev.map((p) => (p.id === id ? { ...p, isPublished: false } : p)),
        );
        toast.success("Профиль снят с публикации");
      } catch (err) {
        if (err instanceof ApiError) toast.error(err.message);
      } finally {
        setPendingId(null);
      }
    },
    [setProfiles],
  );

  const remove = useCallback(
    (id: string) => {
      track("manage_action_click", { entity: "creator", entity_id: id, action: "delete" });
      Modal.confirm({
        title: "Удалить профиль?",
        content: "Это действие необратимо. Все данные профиля будут удалены.",
        okText: "Удалить",
        okType: "danger",
        cancelText: "Отмена",
        onOk: async () => {
          setPendingId(id);
          try {
            await api.delete(`/api/creators/${id}`);
            setProfiles((prev) => prev.filter((p) => p.id !== id));
            toast.success("Профиль удалён");
          } catch (err) {
            if (err instanceof ApiError) toast.error(err.message);
          } finally {
            setPendingId(null);
          }
        },
      });
    },
    [setProfiles],
  );

  return { publish, unpublish, remove, pendingId };
}
