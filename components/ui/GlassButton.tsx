"use client";

import { CSSProperties, ReactNode } from "react";

type ButtonVariant =
  | "filled"
  | "glass"
  | "neutral"
  | "premium"
  | "vip"
  | "rise"
  | "featured";

interface GlassButtonProps {
  onClick?: () => void;
  block?: boolean;
  label?: string;
  icon?: ReactNode;
  /** Переопределить цвет тени/свечения (rgba строка) */
  glowColor?: string;
  /** Вариант кнопки */
  variant?: ButtonVariant;
}

const baseShape: CSSProperties = {
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: 48,
  padding: "0 28px",
  borderRadius: 14,
  cursor: "pointer",
  overflow: "hidden",
  fontSize: 15,
  fontWeight: 600,
  letterSpacing: "0.01em",
  outline: "none",
  transition:
    "transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, border-color 0.18s ease",
};

// ── sky-blue (filled / rise) ────────────────────────────────────────────────
const makeFilledStyle = (): CSSProperties => ({
  ...baseShape,
  border: "none",
  background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
  boxShadow: "0 4px 20px rgba(14,165,233,0.4), 0 1px 4px rgba(0,0,0,0.1)",
});

// ── glass (secondary) ───────────────────────────────────────────────────────
const makeGlassStyle = (glowColor: string): CSSProperties => ({
  ...baseShape,
  border: "1.5px solid rgba(125, 211, 252, 0.55)",
  background: "rgba(186, 230, 253, 0.25)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  boxShadow: `0 4px 20px ${glowColor}, 0 1px 4px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.5)`,
});

// ── neutral (обычная карточка) ──────────────────────────────────────────────
const makeNeutralStyle = (): CSSProperties => ({
  ...baseShape,
  border: "1.5px solid #e5e7eb",
  background: "#ffffff",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
});

// ── premium (золотой/янтарный) ──────────────────────────────────────────────
const makePremiumStyle = (): CSSProperties => ({
  ...baseShape,
  border: "none",
  background: "linear-gradient(135deg, #fbbf24 0%, #d97706 100%)",
  boxShadow: "0 4px 20px rgba(251,191,36,0.45), 0 1px 4px rgba(0,0,0,0.1)",
});

// ── vip (фиолетово-розовый) ──────────────────────────────────────────────────
const makeVipStyle = (): CSSProperties => ({
  ...baseShape,
  border: "none",
  background: "linear-gradient(135deg, #a78bfa 0%, #ec4899 100%)",
  boxShadow: "0 4px 20px rgba(167,139,250,0.45), 0 1px 4px rgba(0,0,0,0.1)",
});

// ── featured (тёплый янтарный мягкий) ──────────────────────────────────────
const makeFeaturedStyle = (): CSSProperties => ({
  ...baseShape,
  border: "1.5px solid #fcd34d",
  background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
  boxShadow: "0 4px 18px rgba(245,158,11,0.3), 0 1px 4px rgba(0,0,0,0.07)",
});

// ── shimmer ─────────────────────────────────────────────────────────────────
const shimmerStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  borderRadius: "inherit",
  background:
    "linear-gradient(105deg, transparent 15%, rgba(255,255,255,0.55) 50%, transparent 85%)",
  backgroundSize: "200% 100%",
  animation: "wowShimmer 2.4s linear infinite",
  pointerEvents: "none",
};

function getContentStyle(variant: ButtonVariant): CSSProperties {
  const base: CSSProperties = {
    position: "relative",
    zIndex: 1,
    display: "flex",
    alignItems: "center",
    gap: 8,
  };
  switch (variant) {
    case "neutral":
      return { ...base, color: "#374151" }; // gray-700
    case "featured":
      return { ...base, color: "#92400e" }; // amber-900
    case "glass":
      return {
        ...base,
        color: "#0369A1",
        textShadow: "0 1px 2px rgba(255,255,255,0.6)",
      };
    default:
      // filled, rise, premium, vip — белый текст
      return { ...base, color: "#ffffff" };
  }
}

function makeBaseStyle(
  variant: ButtonVariant,
  glowColor: string,
): CSSProperties {
  switch (variant) {
    case "filled":
    case "rise":
      return makeFilledStyle();
    case "glass":
      return makeGlassStyle(glowColor);
    case "neutral":
      return makeNeutralStyle();
    case "premium":
      return makePremiumStyle();
    case "vip":
      return makeVipStyle();
    case "featured":
      return makeFeaturedStyle();
  }
}

// hover стили ────────────────────────────────────────────────────────────────
function applyHoverIn(
  el: HTMLButtonElement,
  variant: ButtonVariant,
  glowColor: string,
) {
  el.style.transform = "translateY(-2px) scale(1.015)";
  switch (variant) {
    case "filled":
    case "rise":
      el.style.boxShadow =
        "0 8px 28px rgba(14,165,233,0.5), 0 2px 8px rgba(0,0,0,0.12)";
      el.style.background = "linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)";
      break;
    case "glass":
      el.style.background = "rgba(186, 230, 253, 0.45)";
      el.style.borderColor = "rgba(14, 165, 233, 0.7)";
      el.style.boxShadow = `0 8px 28px rgba(14,165,233,0.35), 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.6)`;
      break;
    case "neutral":
      el.style.background = "#f9fafb";
      el.style.borderColor = "#d1d5db";
      el.style.boxShadow = "0 4px 14px rgba(0,0,0,0.08)";
      break;
    case "premium":
      el.style.boxShadow =
        "0 8px 28px rgba(251,191,36,0.55), 0 2px 8px rgba(0,0,0,0.1)";
      el.style.background = "linear-gradient(135deg, #fcd34d 0%, #f59e0b 100%)";
      break;
    case "vip":
      el.style.boxShadow =
        "0 8px 28px rgba(167,139,250,0.55), 0 2px 8px rgba(0,0,0,0.1)";
      el.style.background = "linear-gradient(135deg, #c4b5fd 0%, #f472b6 100%)";
      break;
    case "featured":
      el.style.boxShadow =
        "0 8px 24px rgba(245,158,11,0.4), 0 2px 8px rgba(0,0,0,0.08)";
      el.style.background = "linear-gradient(135deg, #fef3c7 0%, #fbbf24 100%)";
      break;
  }
}

function applyHoverOut(
  el: HTMLButtonElement,
  variant: ButtonVariant,
  glowColor: string,
) {
  el.style.transform = "";
  const s = makeBaseStyle(variant, glowColor);
  el.style.background = (s.background as string) ?? "";
  el.style.boxShadow = (s.boxShadow as string) ?? "";
  el.style.borderColor = "";
}

// ── компонент ────────────────────────────────────────────────────────────────
export default function GlassButton({
  onClick,
  block = false,
  label,
  icon,
  glowColor = "rgba(14, 165, 233, 0.2)",
  variant = "filled",
}: GlassButtonProps) {
  const style: CSSProperties = {
    ...makeBaseStyle(variant, glowColor),
    ...(block ? { width: "100%", minWidth: "unset" } : {}),
  };

  const hasShimmer = variant === "glass";

  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      onMouseEnter={(e) => applyHoverIn(e.currentTarget, variant, glowColor)}
      onMouseLeave={(e) => applyHoverOut(e.currentTarget, variant, glowColor)}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = "translateY(0) scale(0.985)";
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = "translateY(-2px) scale(1.015)";
      }}
    >
      {hasShimmer && <span style={shimmerStyle} />}
      <span style={getContentStyle(variant)}>
        {icon && <span style={{ fontSize: 15, display: "flex" }}>{icon}</span>}
        {label}
      </span>
    </button>
  );
}
