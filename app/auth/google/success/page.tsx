"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/**
 * Google OAuth success page.
 *
 * Токены уже установлены в httpOnly cookies сервером при redirect.
 * Эта страница просто загружает пользователя и редиректит на главную.
 */
export default function GoogleSuccessPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const hasRun = useRef(false);

  useEffect(() => {
    // Защита от двойного выполнения в React.StrictMode
    if (hasRun.current) return;
    hasRun.current = true;

    refreshUser()
      .then(() => {
        toast.success("Вход через Google выполнен!");
        router.push("/");
      })
      .catch(() => {
        toast.error("Ошибка входа через Google");
        router.push("/auth/login");
      });
  }, [refreshUser, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg mx-auto mb-4">
          V
        </div>
        <p className="text-gray-500">Выполняем вход...</p>
      </div>
    </div>
  );
}
