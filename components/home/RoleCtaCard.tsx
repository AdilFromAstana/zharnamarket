import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import type { RoleCtaContent } from "@/lib/home/types";

interface RoleCtaCardProps {
  role: RoleCtaContent;
  accent: "business" | "creator";
}

export default function RoleCtaCard({ role, accent }: RoleCtaCardProps) {
  const Icon = role.icon;
  const accentClasses =
    accent === "business"
      ? "from-sky-500/10 to-blue-600/10 text-sky-600 border-sky-200"
      : "from-violet-500/10 to-fuchsia-500/10 text-violet-600 border-violet-200";
  const buttonClasses =
    accent === "business"
      ? "bg-sky-500 hover:bg-sky-600"
      : "bg-violet-500 hover:bg-violet-600";

  return (
    <Link
      href={role.href}
      className="group flex flex-col justify-between bg-white rounded-3xl border border-gray-200 p-6 hover:border-gray-300 hover:shadow-lg transition"
    >
      <div>
        <div
          className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br ${accentClasses} border mb-4`}
        >
          <Icon className="w-6 h-6" aria-hidden />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-1">{role.title}</h3>
        <p className="text-sm text-gray-500 mb-4">{role.subtitle}</p>
        <ul className="space-y-2 mb-6">
          {role.bullets.map((b) => (
            <li
              key={b}
              className="flex items-start gap-2 text-sm text-gray-700"
            >
              <Check className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" aria-hidden />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
      <span
        className={`inline-flex items-center justify-center gap-2 text-white ${buttonClasses} rounded-xl px-4 py-2.5 text-sm font-semibold transition w-full`}
      >
        {role.cta}
        <ArrowRight className="w-4 h-4 transition group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  );
}
