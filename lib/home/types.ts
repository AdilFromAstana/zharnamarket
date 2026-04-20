import type { LucideIcon } from "lucide-react";

export type HomeHeroVariant = "A" | "B" | "C";

export interface HeroCopy {
  eyebrow: string;
  headline: string;
  highlight: string;
  subheadline: string;
}

export interface RoleCtaContent {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  bullets: string[];
  href: string;
  cta: string;
}

export interface HowItWorksStep {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface TrustItem {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
}

export interface Testimonial {
  author: string;
  role: string;
  text: string;
}

export interface VideoFormatCard {
  key: string;
  label: string;
  description: string | null;
}

export interface FinalCtaButton {
  label: string;
  href: string;
  primary?: boolean;
}
