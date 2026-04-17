import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const alt = "Объявление на Zharnamarket";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const ad = await prisma.ad.findFirst({
    where: { id, deletedAt: null },
    select: {
      title: true,
      platform: true,
      budgetFrom: true,
      budgetTo: true,
      city: { select: { label: true } },
      category: { select: { label: true } },
    },
  });

  if (!ad) {
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

  const budget =
    ad.budgetFrom && ad.budgetTo
      ? `${ad.budgetFrom.toLocaleString("ru")} – ${ad.budgetTo.toLocaleString("ru")} ₸`
      : ad.budgetFrom
        ? `от ${ad.budgetFrom.toLocaleString("ru")} ₸`
        : null;

  const location = ad.city?.label ?? "Казахстан";
  const category = ad.category?.label ?? "";

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
          <div
            style={{
              display: "flex",
              gap: 12,
            }}
          >
            <div
              style={{
                background: "rgba(255,255,255,0.2)",
                borderRadius: 20,
                padding: "8px 20px",
                fontSize: 18,
              }}
            >
              {ad.platform}
            </div>
            {category && (
              <div
                style={{
                  background: "rgba(255,255,255,0.2)",
                  borderRadius: 20,
                  padding: "8px 20px",
                  fontSize: 18,
                }}
              >
                {category}
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 52,
            fontWeight: 800,
            lineHeight: 1.2,
            flex: 1,
            display: "flex",
            alignItems: "center",
          }}
        >
          {ad.title.length > 80 ? ad.title.slice(0, 77) + "..." : ad.title}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div style={{ display: "flex", gap: 32, fontSize: 24, opacity: 0.85 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              📍 {location}
            </div>
            {budget && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                💰 {budget}
              </div>
            )}
          </div>
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
