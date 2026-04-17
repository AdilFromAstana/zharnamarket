import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const alt = "Профиль креатора на Zharnamarket";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const creator = await prisma.creatorProfile.findFirst({
    where: { id, isPublished: true },
    select: {
      fullName: true,
      bio: true,
      avatar: true,
      averageRating: true,
      reviewCount: true,
      city: { select: { label: true } },
      platforms: { select: { name: true } },
    },
  });

  if (!creator) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #0EA5E9, #0284C7)",
            color: "white",
            fontSize: 48,
            fontWeight: 700,
          }}
        >
          Zharnamarket
        </div>
      ),
      size,
    );
  }

  const city = creator.city?.label ?? "Казахстан";
  const platforms = creator.platforms.map((p) => p.name).join(" · ");
  const rating = creator.averageRating
    ? `⭐ ${creator.averageRating.toFixed(1)}`
    : null;
  const bio = creator.bio
    ? creator.bio.length > 120
      ? creator.bio.slice(0, 117) + "..."
      : creator.bio
    : null;

  // First letter for avatar fallback
  const initial = creator.fullName.charAt(0).toUpperCase();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0EA5E9, #0284C7)",
          padding: 60,
          color: "white",
        }}
      >
        {/* Top bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 40,
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 700, opacity: 0.9 }}>
            Zharnamarket
          </div>
          <div style={{ fontSize: 20, opacity: 0.7 }}>Автор видеоконтента</div>
        </div>

        {/* Main content */}
        <div style={{ display: "flex", flex: 1, gap: 40, alignItems: "center" }}>
          {/* Avatar */}
          {creator.avatar ? (
            <img
              src={creator.avatar}
              width={160}
              height={160}
              style={{ borderRadius: 80, objectFit: "cover", border: "4px solid rgba(255,255,255,0.3)" }}
            />
          ) : (
            <div
              style={{
                width: 160,
                height: 160,
                borderRadius: 80,
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 64,
                fontWeight: 800,
                border: "4px solid rgba(255,255,255,0.3)",
              }}
            >
              {initial}
            </div>
          )}

          {/* Info */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 12 }}>
            <div style={{ fontSize: 48, fontWeight: 800, lineHeight: 1.1 }}>
              {creator.fullName}
            </div>
            {bio && (
              <div style={{ fontSize: 22, opacity: 0.8, lineHeight: 1.4 }}>
                {bio}
              </div>
            )}
            <div style={{ display: "flex", gap: 20, fontSize: 20, opacity: 0.85, marginTop: 8 }}>
              <span>📍 {city}</span>
              {platforms && <span>🎬 {platforms}</span>}
              {rating && <span>{rating}</span>}
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div
            style={{
              background: "white",
              color: "#0EA5E9",
              borderRadius: 28,
              padding: "12px 28px",
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            zharnamarket.kz
          </div>
        </div>
      </div>
    ),
    size,
  );
}
