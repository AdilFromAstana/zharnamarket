import { cn } from "@/lib/utils";

interface SmartPaginationProps {
  current: number;
  total: number;
  onChange: (page: number) => void;
}

export function SmartPagination({
  current,
  total,
  onChange,
}: SmartPaginationProps) {
  if (total <= 1) return null;

  const pages: (number | "...")[] = [];
  if (total <= 5) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else if (current <= 3) {
    pages.push(1, 2, 3, 4, "...", total);
  } else if (current >= total - 2) {
    pages.push(1, "...", total - 3, total - 2, total - 1, total);
  } else {
    pages.push(1, "...", current - 1, current, current + 1, "...", total);
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-6 pb-2">
      <button
        onClick={() => onChange(Math.max(1, current - 1))}
        disabled={current === 1}
        className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 text-sm"
      >
        ‹
      </button>
      {pages.map((p, i) =>
        p === "..." ? (
          <span
            key={`d${i}`}
            className="w-6 text-center text-gray-300 text-sm"
          >
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p as number)}
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center text-sm font-medium transition-colors",
              p === current
                ? "bg-sky-500 text-white shadow-sm"
                : "border border-gray-200 text-gray-600 hover:bg-gray-100",
            )}
          >
            {p}
          </button>
        ),
      )}
      <button
        onClick={() => onChange(Math.min(total, current + 1))}
        disabled={current === total}
        className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 text-sm"
      >
        ›
      </button>
    </div>
  );
}
