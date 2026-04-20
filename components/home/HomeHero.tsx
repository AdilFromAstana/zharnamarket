import { Users, BadgeCheck, Video } from "lucide-react";
import RoleCtaCard from "./RoleCtaCard";
import { HERO_COPY_VARIANTS, HERO_ROLES } from "@/lib/home/home-content";
import type { HomeHeroVariant } from "@/lib/home/types";

interface HomeHeroProps {
  variant?: HomeHeroVariant;
}

export default function HomeHero({ variant = "A" }: HomeHeroProps) {
  const copy = HERO_COPY_VARIANTS[variant];

  return (
    <section className="py-10 md:py-16">
      <div className="text-center max-w-3xl mx-auto mb-8 md:mb-12">
        <div className="inline-flex items-center gap-2 text-xs font-medium text-sky-700 bg-sky-50 border border-sky-100 rounded-full px-3 py-1 mb-5">
          {copy.eyebrow}
        </div>
        <h1 className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight mb-4">
          {copy.headline}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-blue-600">
            {copy.highlight}
          </span>
        </h1>
        <p className="text-base md:text-lg text-gray-600 px-4">
          {copy.subheadline}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 max-w-3xl mx-auto">
        <RoleCtaCard role={HERO_ROLES.business} accent="business" />
        <RoleCtaCard role={HERO_ROLES.creator} accent="creator" />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8 text-xs md:text-sm text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <Users className="w-4 h-4 text-emerald-500" aria-hidden />
          Без посредников
        </span>
        <span className="inline-flex items-center gap-1.5">
          <BadgeCheck className="w-4 h-4 text-sky-500" aria-hidden />
          Без комиссии со сделки
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Video className="w-4 h-4 text-violet-500" aria-hidden />
          TikTok · Instagram · YouTube
        </span>
      </div>
    </section>
  );
}
