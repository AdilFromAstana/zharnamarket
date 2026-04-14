"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { Form, Input, Button, Divider, Checkbox } from "antd";
import {
  PhoneOutlined,
  LockOutlined,
  ArrowRightOutlined,
  GoogleOutlined,
} from "@ant-design/icons";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { useAuth, type AuthUser } from "@/contexts/AuthContext";
import { useRedirectIfAuth } from "@/hooks/useRequireAuth";

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  // Редирект если уже авторизован
  useRedirectIfAuth("/");

  const handleSubmit = async (values: { phone: string; password: string }) => {
    setLoading(true);
    try {
      const data = await api.post<{
        user?: AuthUser;
        requireVerification?: boolean;
        email?: string;
        message?: string;
      }>("/api/auth/login", {
        login: values.phone,
        password: values.password,
      });

      if (data.requireVerification && data.email) {
        // Email не подтверждён — переходим на страницу ввода кода
        toast.info(data.message ?? "Подтвердите email для входа");
        router.push(`/auth/verify-email?email=${encodeURIComponent(data.email)}`);
      } else if (data.user) {
        login(data.user);
        toast.success("Добро пожаловать!");
        const next = searchParams.get("next") || "/";
        router.push(next);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        // Обрабатываем 403 с requireVerification (AxiosError pattern)
        if (err.status === 403 && err.data?.requireVerification && err.data?.email) {
          toast.info(err.data.message ?? "Подтвердите email для входа");
          router.push(`/auth/verify-email?email=${encodeURIComponent(err.data.email)}`);
          return;
        }
        toast.error(err.message);
      } else {
        toast.error("Ошибка соединения");
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
                V
              </div>
              <div>
                <div className="font-bold text-xl text-gray-900">ViralAds</div>
                <div className="text-xs text-gray-500">PARTNER</div>
              </div>
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Войти</h1>
          <p className="text-gray-500 mt-1">Рады видеть вас снова</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <Form
            name="login"
            onFinish={handleSubmit}
            layout="vertical"
            size="large"
          >
            <Form.Item
              name="phone"
              rules={[{ required: true, message: "Введите телефон или email" }]}
            >
              <Input
                prefix={<PhoneOutlined className="text-gray-400" />}
                placeholder="+7 (000) 000-00-00 или email"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: "Введите пароль" }]}
            >
              <Input.Password
                prefix={<LockOutlined className="text-gray-400" />}
                placeholder="Пароль"
              />
            </Form.Item>

            <div className="flex items-center justify-between mb-4">
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox>Запомнить меня</Checkbox>
              </Form.Item>
              <Link
                href="/auth/forgot-password"
                className="text-sm text-sky-600 hover:underline"
              >
                Забыли пароль?
              </Link>
            </div>

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
                Войти <ArrowRightOutlined />
              </Button>
            </Form.Item>
          </Form>

          <Divider plain className="text-gray-400 text-xs">
            или
          </Divider>

          <Button
            block
            href="/api/auth/google"
            icon={<GoogleOutlined />}
            style={{ height: 48, marginBottom: 12 }}
          >
            Войти через Google
          </Button>

          <div className="text-center text-sm text-gray-600">
            Нет аккаунта?{" "}
            <Link
              href="/auth/register"
              className="text-sky-600 font-medium hover:underline"
            >
              Зарегистрироваться
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
