import { cn } from "@/lib/utils";

interface ActionSheetButtonProps {
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick: () => void;
}

export function ActionSheetButton({
  icon,
  label,
  color,
  onClick,
}: ActionSheetButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-5 py-3.5 text-left text-[15px] font-medium transition-colors active:bg-gray-50",
        color,
      )}
    >
      <span className="text-lg w-5 flex items-center justify-center">
        {icon}
      </span>
      {label}
    </button>
  );
}
