"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function TelegramSuccessPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    refreshUser()
      .then(() => {
        toast.success("Вход через Telegram выполнен!");
        router.push("/");
      })
      .catch(() => {
        toast.error("Ошибка входа через Telegram");
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
