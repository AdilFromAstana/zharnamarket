import { useState } from "react";
import { toast } from "sonner";
import type { FormInstance } from "antd";

export function useFetchFollowers(form: FormInstance) {
  const [fetchingPlatform, setFetchingPlatform] = useState<string | null>(null);

  const fetchFollowers = async (platformKey: string) => {
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

  return { fetchingPlatform, fetchFollowers };
}
