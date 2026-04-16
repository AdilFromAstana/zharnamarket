"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { Form, Input, Button, Progress } from "antd";
import { LockOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";

function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  if (!password) return { score: 0, label: "", color: "#e5e7eb" };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels = [
    { label: "Очень слабый", color: "#ef4444" },
    { label: "Слабый", color: "#f97316" },
    { label: "Средний", color: "#eab308" },
    { label: "Хороший", color: "#22c55e" },
    { label: "Отличный", color: "#16a34a" },
  ];
  const idx = Math.min(score, levels.length) - 1;
  return idx < 0
    ? { score: 0, label: "", color: "#e5e7eb" }
    : { score: score * 20, ...levels[idx] };
}

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const strength = getPasswordStrength(newPassword);

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="text-4xl mb-3">&#128683;</div>
            <p className="font-semibold text-gray-900 mb-2">
              Ссылка недействительна
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Запросите новую ссылку для сброса пароля.
            </p>
            <Link href="/auth/forgot-password">
              <Button
                type="primary"
                block
                style={{ background: "#0EA5E9", borderColor: "#0EA5E9" }}
              >
                Запросить сброс пароля
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (values: {
    password: string;
    confirmPassword: string;
  }) => {
    if (values.password !== values.confirmPassword) {
      toast.error("Пароли не совпадают");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/auth/reset-password", {
        token,
        password: values.password,
      });
      setDone(true);
      toast.success("Пароль успешно обновлён!");
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error("Ошибка сброса пароля");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                Z
              </div>
              <div>
                <div className="font-bold text-xl text-gray-900">Zharnamarket</div>
              </div>
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Новый пароль</h1>
          <p className="text-gray-500 mt-1">Придумайте надёжный пароль</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          {done ? (
            <div className="text-center py-4">
              <CheckCircleOutlined
                style={{ fontSize: 48, color: "#22c55e" }}
                className="mb-3"
              />
              <p className="font-semibold text-gray-900 mb-2">
                Пароль обновлён!
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Теперь вы можете войти с новым паролем.
              </p>
              <Button
                type="primary"
                block
                style={{ background: "#0EA5E9", borderColor: "#0EA5E9" }}
                onClick={() => router.push("/auth/login")}
              >
                Войти
              </Button>
            </div>
          ) : (
            <Form
              name="reset_password"
              onFinish={handleSubmit}
              layout="vertical"
              size="large"
            >
              <Form.Item
                name="password"
                rules={[
                  { required: true, message: "Введите новый пароль" },
                  { min: 8, message: "Минимум 8 символов" },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined className="text-gray-400" />}
                  placeholder="Новый пароль"
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </Form.Item>

              {newPassword && (
                <div className="mb-4 -mt-2">
                  <Progress
                    percent={strength.score}
                    showInfo={false}
                    strokeColor={strength.color}
                    size="small"
                  />
                  <div
                    className="text-xs mt-1"
                    style={{ color: strength.color }}
                  >
                    {strength.label}
                  </div>
                </div>
              )}

              <Form.Item
                name="confirmPassword"
                rules={[
                  { required: true, message: "Подтвердите пароль" },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue("password") === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject("Пароли не совпадают");
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined className="text-gray-400" />}
                  placeholder="Подтвердите пароль"
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  loading={loading}
                  style={{
                    height: 48,
                    background: "#0EA5E9",
                    borderColor: "#0EA5E9",
                  }}
                >
                  Установить пароль
                </Button>
              </Form.Item>
            </Form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}
