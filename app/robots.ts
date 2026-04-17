import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const publicDisallow = [
    "/cabinet",
    "/ads/new",
    "/ads/manage",
    "/creators/new",
    "/creators/manage",
    "/creators/edit",
    "/onboarding",
    "/auth",
    "/api",
  ];

  return {
    rules: [
      // Основные поисковики
      {
        userAgent: "*",
        allow: "/",
        disallow: publicDisallow,
      },
      // AI-краулеры — явно разрешаем индексацию
      {
        userAgent: "GPTBot",
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow: publicDisallow,
      },
      {
        userAgent: "ChatGPT-User",
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow: publicDisallow,
      },
      {
        userAgent: "PerplexityBot",
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow: publicDisallow,
      },
      {
        userAgent: "ClaudeBot",
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow: publicDisallow,
      },
      {
        userAgent: "Claude-Web",
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow: publicDisallow,
      },
      {
        userAgent: "Google-Extended",
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow: publicDisallow,
      },
      {
        userAgent: "Applebot-Extended",
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow: publicDisallow,
      },
      {
        userAgent: "Bytespider",
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow: publicDisallow,
      },
      {
        userAgent: "cohere-ai",
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow: publicDisallow,
      },
    ],
    sitemap: "https://zharnamarket.kz/sitemap.xml",
  };
}
