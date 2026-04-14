"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Хук защиты страницы — перенаправляет на /auth/login
 * если пользователь не авторизован.
 *
 * @example
 * export default function CabinetPage() {
 *   const { user, isLoading } = useRequireAuth();
 *   if (isLoading) return <LoadingSpinner />;
 *   ...
 * }
 */
export function useRequireAuth() {
  const { user, isLoggedIn, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Ждём завершения инициализации
    if (isLoading) return;

    if (!isLoggedIn) {
      const next = encodeURIComponent(pathname ?? "/");
      router.replace(`/auth/login?next=${next}`);
    }
  }, [isLoading, isLoggedIn, router, pathname]);

  return { user, isLoading: isLoading || (!isLoggedIn && isLoading) };
}

/**
 * Хук для страниц входа/регистрации —
 * перенаправляет на / если пользователь уже авторизован.
 *
 * @example
 * export default function LoginPage() {
 *   useRedirectIfAuth();
 *   ...
 * }
 */
export function useRedirectIfAuth(to = "/") {
  const { isLoggedIn, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (isLoggedIn) {
      router.replace(to);
    }
  }, [isLoading, isLoggedIn, router, to]);

  return { isLoading };
}
