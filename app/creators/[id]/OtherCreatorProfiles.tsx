import Link from "next/link";
import { cn, getAvatarGradient } from "@/lib/utils";

interface OtherProfile {
  id: string;
  title: string;
  fullName: string;
  city: string;
  avatar: string | null;
  avatarColor: string | null;
}

export default function OtherCreatorProfiles({
  profiles,
}: {
  profiles: OtherProfile[];
}) {
  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-5 md:p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Ещё профили автора
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {profiles.map((p) => {
          const initial = p.fullName.charAt(0).toUpperCase() || "U";
          const gradient =
            p.avatarColor ?? getAvatarGradient(p.fullName);
          return (
            <Link
              key={p.id}
              href={`/creators/${p.id}`}
              className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-sky-300 hover:bg-sky-50/40 transition-colors"
            >
              {p.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.avatar}
                  alt={p.fullName}
                  className="w-12 h-12 rounded-full object-cover shrink-0"
                />
              ) : (
                <div
                  className={cn(
                    "w-12 h-12 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-semibold shrink-0",
                    gradient,
                  )}
                >
                  {initial}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900 truncate">
                  {p.title}
                </div>
                {p.city && (
                  <div className="text-xs text-gray-500 truncate">
                    {p.city}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
