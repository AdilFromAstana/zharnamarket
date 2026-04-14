"use client";

import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onRate?: (rating: number) => void;
  showValue?: boolean;
  className?: string;
}

const SIZE_MAP = {
  sm: "w-3.5 h-3.5",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

const TEXT_SIZE_MAP = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

function StarIcon({
  filled,
  half,
  className,
}: {
  filled: boolean;
  half: boolean;
  className?: string;
}) {
  if (half) {
    return (
      <svg
        viewBox="0 0 24 24"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="halfStar">
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="50%" stopColor="#D1D5DB" />
          </linearGradient>
        </defs>
        <path
          d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          fill="url(#halfStar)"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? "#F59E0B" : "#D1D5DB"}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

export default function StarRating({
  rating,
  maxStars = 5,
  size = "md",
  interactive = false,
  onRate,
  showValue = false,
  className,
}: StarRatingProps) {
  const stars = [];
  for (let i = 1; i <= maxStars; i++) {
    const filled = i <= Math.floor(rating);
    const half = !filled && i === Math.ceil(rating) && rating % 1 >= 0.25;

    stars.push(
      <button
        key={i}
        type="button"
        disabled={!interactive}
        onClick={() => interactive && onRate?.(i)}
        className={cn(
          "transition-transform",
          interactive && "cursor-pointer hover:scale-110 active:scale-95",
          !interactive && "cursor-default",
        )}
      >
        <StarIcon
          filled={filled}
          half={half}
          className={SIZE_MAP[size]}
        />
      </button>,
    );
  }

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {stars}
      {showValue && rating > 0 && (
        <span className={cn("ml-1 font-semibold text-gray-700", TEXT_SIZE_MAP[size])}>
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
