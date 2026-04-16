import type { Metadata } from "next";
import "./globals.css";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: "Zharnamarket",
  description: "Платформа для рекламных объявлений — бизнес и креаторы без посредников",
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
          <AuthProvider>
            {children}
          </AuthProvider>
        </AntdRegistry>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
