import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api-client";
import { STORAGE_KEYS } from "@/lib/constants";
import type { Ad } from "@/lib/types/ad";

export function useMyAds(authLoading: boolean) {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingPayment, setPendingPayment] = useState<{
    savedAt: string;
  } | null>(null);

  const refetch = useCallback(async () => {
    try {
      const data = await api.get<Ad[]>("/api/tasks/my");
      setAds(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        toast.error("Необходима авторизация");
      }
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    (async () => {
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
    })();
  }, [authLoading]);

  const paymentHandled = useRef(false);
  useEffect(() => {
    if (paymentHandled.current) return;
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    if (!payment) return;

    paymentHandled.current = true;
    params.delete("payment");
    const query = params.toString();
    window.history.replaceState(
      {},
      "",
      `/ads/manage${query ? `?${query}` : ""}`,
    );

    if (payment === "success") {
      toast.success("Оплата прошла! Объявление опубликовано.");
      try {
        localStorage.removeItem(STORAGE_KEYS.PAYMENT_STATE);
        localStorage.removeItem(STORAGE_KEYS.AD_DRAFT);
      } catch {
        /* ignore */
      }
    } else if (payment === "failed") {
      toast.error("Оплата не прошла. Попробуйте ещё раз.");
    }
  }, []);

  useEffect(() => {
    try {
      const state = localStorage.getItem(STORAGE_KEYS.PAYMENT_STATE);
      if (state) setPendingPayment(JSON.parse(state) as { savedAt: string });
    } catch {
      /* ignore */
    }
  }, []);

  const dismissPendingPayment = () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.PAYMENT_STATE);
      localStorage.removeItem(STORAGE_KEYS.AD_DRAFT);
    } catch {
      /* ignore */
    }
    setPendingPayment(null);
  };

  return {
    ads,
    setAds,
    loading,
    refetch,
    pendingPayment,
    dismissPendingPayment,
  };
}
