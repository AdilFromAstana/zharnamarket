import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { mapCreatorFromApi } from "@/lib/mappers/creator";
import type { CreatorProfile } from "@/lib/types/creator";

export function useMyProfiles(authLoading: boolean) {
  const [profiles, setProfiles] = useState<CreatorProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    api
      .get<unknown[]>("/api/creators/my")
      .then((data) => setProfiles((data ?? []).map(mapCreatorFromApi)))
      .catch(() => setProfiles([]))
      .finally(() => setLoading(false));
  }, [authLoading]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    if (!payment) return;

    window.history.replaceState({}, "", "/creators/manage");

    if (payment === "success") {
      toast.success("Профиль опубликован!");
      api
        .get<unknown[]>("/api/creators/my")
        .then((data) => setProfiles((data ?? []).map(mapCreatorFromApi)))
        .catch(() => {});
    } else if (payment === "failed") {
      toast.error("Оплата не прошла. Попробуйте ещё раз.");
    }
  }, []);

  return { profiles, setProfiles, loading };
}
