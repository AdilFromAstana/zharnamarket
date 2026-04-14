"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Хук защиты админ-страниц — перенаправляет на главную,
 * если пользователь не авторизован или не является админом.
 *
 * @example
 * export default function AdminPage() {
 *   const { user, isLoading } = useRequireAdmin();
 *   if (isLoading) return <LoadingSpinner />;
 *   ...
 * }
 */
export function useRequireAdmin() {
  const { user, isLoggedIn, isLoading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isLoggedIn) {
      router.replace("/auth/login");
      return;
    }

    if (!isAdmin) {
      router.replace("/");
    }
  }, [isLoading, isLoggedIn, isAdmin, router]);

  return { user, isLoading: isLoading || (!isAdmin && !isLoading) };
}
