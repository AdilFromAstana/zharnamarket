import type { CreatorProfile } from "@/lib/types/creator";

export function formatRate(profile: CreatorProfile): {
  primary: string;
  secondary?: string;
} {
  const { minimumRate, negotiable } = profile.pricing;

  if (minimumRate === 0) {
    if (negotiable) return { primary: "Договорная" };
    if (!profile.isPublished) return { primary: "—" };
  }

  return {
    primary: `от ${minimumRate.toLocaleString("ru-KZ")} ₸`,
    secondary: negotiable ? "договорная" : undefined,
  };
}
