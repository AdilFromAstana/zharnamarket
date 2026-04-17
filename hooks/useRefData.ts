import { useQuery } from "@tanstack/react-query";
import type { RefItem } from "@/lib/constants";

export type CategoryOption = {
  id: string;
  key: string;
  label: string;
  icon?: string | null;
  description?: string | null;
};

async function fetchRefItems(endpoint: string): Promise<RefItem[]> {
  const response = await fetch(`/api/${endpoint}`);
  if (!response.ok) throw new Error(`Failed to fetch ${endpoint}`);
  const json = await response.json();
  // Some endpoints wrap data in { data: [...] }, others return array directly
  const items = Array.isArray(json) ? json : json.data ?? [];
  return items.map(
    (item: { key: string; label: string; iconUrl?: string | null }) => ({
      key: item.key,
      label: item.label,
      ...(item.iconUrl != null ? { iconUrl: item.iconUrl } : {}),
    }),
  );
}

async function fetchCategoryOptions(endpoint: string): Promise<CategoryOption[]> {
  const response = await fetch(`/api/${endpoint}`);
  if (!response.ok) throw new Error(`Failed to fetch ${endpoint}`);
  const json = await response.json();
  return json.data ?? [];
}

const STALE = 5 * 60 * 1000; // 5 min — справочники меняются редко

export function useCities() {
  return useQuery({ queryKey: ["ref", "cities"], queryFn: () => fetchRefItems("cities"), staleTime: STALE });
}

export function usePlatforms() {
  return useQuery({ queryKey: ["ref", "platforms"], queryFn: () => fetchRefItems("platforms"), staleTime: STALE });
}

export function useCategories() {
  return useQuery({ queryKey: ["ref", "categories"], queryFn: () => fetchRefItems("categories"), staleTime: STALE });
}

export function useBudgetTypes() {
  return useQuery({ queryKey: ["ref", "budget-types"], queryFn: () => fetchRefItems("budget-types"), staleTime: STALE });
}

export function useBusinessCategories() {
  return useQuery({ queryKey: ["ref", "business-categories"], queryFn: () => fetchRefItems("business-categories"), staleTime: STALE });
}

export function useVideoFormats() {
  return useQuery({ queryKey: ["ref", "video-formats"], queryFn: () => fetchCategoryOptions("video-formats"), staleTime: STALE });
}

export function useAdFormats() {
  return useQuery({ queryKey: ["ref", "ad-formats"], queryFn: () => fetchCategoryOptions("ad-formats"), staleTime: STALE });
}

export function useAdSubjects() {
  return useQuery({ queryKey: ["ref", "ad-subjects"], queryFn: () => fetchCategoryOptions("ad-subjects"), staleTime: STALE });
}
