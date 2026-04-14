import { cn } from "@/lib/utils";

interface StatusPillProps {
  dot: string;
  text: string;
  bg: string;
  label: string;
}

export function StatusPill({ dot, text, bg, label }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2 py-0.5 shrink-0",
        bg,
        text,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dot)} />
      {label}
    </span>
  );
}
