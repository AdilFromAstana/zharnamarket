import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import QueryProvider from "@/providers/QueryProvider";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0EA5E9",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://zharnamarket.kz"),
  title: {
    default: "Zharnamarket — реклама через блогеров в Казахстане",
    template: "%s | Zharnamarket",
  },
  description:
    "Маркетплейс видеорекламы в Казахста��е. Вирусные ролики, обзоры, сторителлинг, продакт-плейсмент — авторы видео и бизнес без посредников.",
  applicationName: "Zharnamarket",
  authors: [{ name: "Zharnamarket", url: "https://zharnamarket.kz" }],
  creator: "Zharnamarket",
  publisher: "Zharnamarket",
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon-180.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { rel: "mask-icon", url: "/safari-pinned-tab.svg", color: "#0EA5E9" },
    ],
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "ru_KZ",
    siteName: "Zharnamarket",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Zharnamarket — маркетплейс видеорекламы в Казахстане",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/twitter-image.png"],
  },
  alternates: {
    canonical: "/",
    languages: {
      ru: "https://zharnamarket.kz",
      kk: "https://zharnamarket.kz",
      "x-default": "https://zharnamarket.kz",
    },
  },
  category: "business",
  other: {
    "msapplication-TileColor": "#0EA5E9",
    "geo.region": "KZ",
    "geo.placename": "Kazakhstan",
    "geo.position": "48.0196;66.9237",
    "ICBM": "48.0196, 66.9237",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">
        <AntdRegistry>
          <QueryProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </QueryProvider>
        </AntdRegistry>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
