import type { CreatorProfile } from "@/lib/types/creator";

export type FilterKey = "all" | "published" | "draft";

export const FILTER_LABELS: Record<FilterKey, string> = {
  all: "Все",
  published: "Опубликованные",
  draft: "Черновики",
};

export function filterProfiles(
  profiles: CreatorProfile[],
  key: FilterKey,
): CreatorProfile[] {
  if (key === "published") return profiles.filter((p) => p.isPublished);
  if (key === "draft") return profiles.filter((p) => !p.isPublished);
  return profiles;
}

export function getFilterCounts(
  profiles: CreatorProfile[],
): Record<FilterKey, number> {
  return {
    all: profiles.length,
    published: profiles.filter((p) => p.isPublished).length,
    draft: profiles.filter((p) => !p.isPublished).length,
  };
}
