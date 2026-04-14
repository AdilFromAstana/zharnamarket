interface VerifiedBadgeProps {
  /** Icon size in pixels (default 16) */
  size?: number;
  className?: string;
  title?: string;
}

/**
 * Instagram-style verified badge: solid blue circle with a white checkmark.
 * Pure SVG — no external icon library dependency.
 */
export default function VerifiedBadge({
  size = 16,
  className = "shrink-0",
  title = "Верифицирован",
}: VerifiedBadgeProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-label={title}
      role="img"
    >
      <circle cx="12" cy="12" r="12" fill="#0095F6" />
      <path
        d="M9 12.5L11 14.5L15.5 9.5"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
