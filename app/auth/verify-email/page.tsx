"use client";

import Link from "next/link";
import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { Button } from "antd";
import { MailOutlined } from "@ant-design/icons";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api-client";
import { useAuth, type AuthUser } from "@/contexts/AuthContext";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 60; // секунд

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-50" />
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const email = searchParams.get("email") ?? "";

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);
  const [resendLoading, setResendLoading] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Таймер для resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Автофокус на первый input
  useEffect(() => {
    if (email) inputRefs.current[0]?.focus();
  }, [email]);

  const handleSubmit = useCallback(async (code: string) => {
    if (code.length !== CODE_LENGTH) return;
    setLoading(true);
    try {
      const data = await api.post<{ user: AuthUser }>("/api/auth/verify-email", {
        email,
        code,
      });
      login(data.user);
      toast.success("Email подтверждён!");
      router.push("/");
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error("Ошибка подтверждения");
      }
      // Сбрасываем поля при ошибке
      setDigits(Array(CODE_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }, [email, login, router]);

  const handleChange = (index: number, value: string) => {
    // Разрешаем только цифры
    const digit = value.replace(/\D/g, "").slice(-1);

    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    // Автопереход на следующее поле
    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Если все заполнены — автосубмит
    const fullCode = newDigits.join("");
    if (fullCode.length === CODE_LENGTH && newDigits.every((d) => d !== "")) {
      handleSubmit(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!pasted) return;

    const newDigits = Array(CODE_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);

    // Фокус на последнее заполненное поле (или следующее пустое)
    const nextEmpty = Math.min(pasted.length, CODE_LENGTH - 1);
    inputRefs.current[nextEmpty]?.focus();

    // Автосубмит при полной вставке
    if (pasted.length === CODE_LENGTH) {
      handleSubmit(pasted);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResendLoading(true);
    try {
      await api.post("/api/auth/resend-code", { email });
      toast.success("Код отправлен повторно");
      setResendCooldown(RESEND_COOLDOWN);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error("Ошибка отправки");
      }
    } finally {
      setResendLoading(false);
    }
  };

  // Без email — нечего делать
  if (!email) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Email не указан.</p>
          <Link href="/auth/register" className="text-sky-600 hover:underline">
            Вернуться к регистрации
          </Link>
        </div>
      </div>
    );
  }

  // Маскируем email: a***@gmail.com
  const maskedEmail = (() => {
    const [local, domain] = email.split("@");
    if (!domain) return email;
    const visible = local.slice(0, Math.min(2, local.length));
    return `${visible}***@${domain}`;
  })();

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                V
              </div>
              <div>
                <div className="font-bold text-xl text-gray-900">ViralAds</div>
                <div className="text-xs text-gray-500">PARTNER</div>
              </div>
            </div>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-sky-100 flex items-center justify-center mx-auto mb-4">
              <MailOutlined className="text-sky-600 text-2xl" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Подтвердите email
            </h1>
            <p className="text-sm text-gray-500">
              Мы отправили 6-значный код на{" "}
              <span className="font-medium text-gray-700">{maskedEmail}</span>
            </p>
          </div>

          {/* OTP Inputs */}
          <div className="flex gap-2 justify-center mb-6">
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={i === 0 ? handlePaste : undefined}
                disabled={loading}
                className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl
                  focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none
                  transition-all disabled:opacity-50 disabled:bg-gray-50"
              />
            ))}
          </div>

          {/* Submit button */}
          <Button
            type="primary"
            size="large"
            block
            loading={loading}
            disabled={digits.some((d) => !d)}
            onClick={() => handleSubmit(digits.join(""))}
            style={{ height: 48, background: "#0EA5E9", borderColor: "#0EA5E9" }}
            className="mb-4"
          >
            Подтвердить
          </Button>

          {/* Resend */}
          <div className="text-center">
            {resendCooldown > 0 ? (
              <p className="text-sm text-gray-400">
                Отправить повторно через{" "}
                <span className="font-medium">{resendCooldown} сек</span>
              </p>
            ) : (
              <button
                onClick={handleResend}
                disabled={resendLoading}
                className="text-sm text-sky-600 hover:underline disabled:opacity-50"
              >
                {resendLoading ? "Отправляем..." : "Отправить код повторно"}
              </button>
            )}
          </div>

          {/* Back link */}
          <div className="text-center mt-4 pt-4 border-t border-gray-100">
            <Link
              href="/auth/register"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Другой email? Зарегистрироваться заново
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
