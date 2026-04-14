import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/cabinet",
          "/settings",
          "/ads/new",
          "/ads/manage",
          "/creators/new",
          "/creators/manage",
          "/creators/edit",
          "/onboarding",
          "/auth",
          "/api",
        ],
      },
    ],
    sitemap: "https://viraladds.kz/sitemap.xml",
  };
}
