"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth, type AuthUser } from "@/contexts/AuthContext";
import { toast } from "sonner";

/**
 * Telegram OAuth callback (клиентская часть).
 *
 * `oauth.telegram.org` редиректит сюда с фрагментом:
 *   /auth/telegram/callback#tgAuthResult=<base64-JSON>
 *
 * Фрагмент не доходит до сервера — читаем его на клиенте, декодируем
 * base64-JSON и отправляем POST на /api/auth/telegram/callback, где
 * сервер проверяет HMAC-подпись и выдаёт httpOnly JWT-cookies.
 */

function base64UrlDecode(input: string): string {
  let b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4;
  if (pad) b64 += "=".repeat(4 - pad);
  return atob(b64);
}

export default function TelegramCallbackPage() {
  const router = useRouter();
  const { login } = useAuth();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const raw = params.get("tgAuthResult");

    if (!raw) {
      toast.error("Нет данных от Telegram");
      router.replace("/auth/login?error=telegram_no_data");
      return;
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(base64UrlDecode(raw));
    } catch {
      toast.error("Не удалось разобрать ответ Telegram");
      router.replace("/auth/login?error=telegram_bad_payload");
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/auth/telegram/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? "Ошибка входа через Telegram");
        }

        const data = (await res.json()) as { user: AuthUser };
        login(data.user);
        toast.success("Вход через Telegram выполнен!");
        router.replace("/");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Ошибка входа через Telegram";
        toast.error(message);
        router.replace("/auth/login?error=telegram_verify_failed");
      }
    })();
  }, [router, login]);

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
