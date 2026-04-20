import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface EmptyListStateProps {
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
}

export default function EmptyListState({
  title,
  description,
  ctaLabel,
  ctaHref,
}: EmptyListStateProps) {
  return (
    <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-8 md:p-10 text-center">
      <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-500 max-w-md mx-auto mb-5">
        {description}
      </p>
      <Link
        href={ctaHref}
        className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition group"
      >
        {ctaLabel}
        <ArrowRight className="w-4 h-4 transition group-hover:translate-x-0.5" aria-hidden />
      </Link>
    </div>
  );
}
