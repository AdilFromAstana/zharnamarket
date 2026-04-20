import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FINAL_CTA_HEADLINE, FINAL_CTA_SUBTEXT } from "@/lib/home/home-content";

export default function FinalCta() {
  return (
    <section className="bg-gradient-to-r from-sky-500 to-blue-600 rounded-3xl p-8 md:p-12 text-center text-white">
      <h2 className="text-2xl md:text-3xl font-bold mb-3 max-w-2xl mx-auto leading-tight">
        {FINAL_CTA_HEADLINE}
      </h2>
      <p className="text-sky-100 text-sm md:text-base mb-6 max-w-xl mx-auto">
        {FINAL_CTA_SUBTEXT}
      </p>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-xl mx-auto">
        <Link
          href="/ads/new"
          className="inline-flex items-center justify-center gap-2 bg-white text-sky-700 rounded-xl px-5 py-3 text-sm md:text-base font-semibold hover:bg-sky-50 transition group"
        >
          Разместить объявление — 990 ₸
          <ArrowRight className="w-4 h-4 transition group-hover:translate-x-0.5" aria-hidden />
        </Link>
        <Link
          href="/creators/new"
          className="inline-flex items-center justify-center gap-2 bg-white/10 text-white border border-white/40 rounded-xl px-5 py-3 text-sm md:text-base font-semibold hover:bg-white/20 transition group"
        >
          Создать профиль — бесплатно
          <ArrowRight className="w-4 h-4 transition group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
