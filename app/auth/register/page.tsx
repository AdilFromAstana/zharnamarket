"use client";

import Link from "next/link";
import { useState } from "react";
import { Form, Input, Button, Checkbox, Divider } from "antd";
import {
  PhoneOutlined,
  LockOutlined,
  UserOutlined,
  MailOutlined,
  GoogleOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api-client";
import { useAuth, type AuthUser } from "@/contexts/AuthContext";
import { useRedirectIfAuth } from "@/hooks/useRequireAuth";

function TelegramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="currentColor"
      aria-hidden="true"
      style={{ verticalAlign: "-0.125em" }}
    >
      <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
    </svg>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  // Редирект если уже авторизован
  useRedirectIfAuth("/");

  const handleSubmit = async (values: {
    name: string;
    phone: string;
    email: string;
    password: string;
  }) => {
    setLoading(true);
    try {
      const data = await api.post<{
        user?: AuthUser;
        requireVerification?: boolean;
        email?: string;
      }>("/api/auth/register", {
        name: values.name,
        phone: values.phone,
        email: values.email,
        password: values.password,
      });

      if (data.requireVerification && data.email) {
        // Нужно подтвердить email — переходим на страницу ввода кода
        toast.success("Код подтверждения отправлен на email");
        router.push(`/auth/verify-email?email=${encodeURIComponent(data.email)}`);
      } else if (data.user) {
        login(data.user);
        toast.success("Аккаунт создан!");
        router.push("/");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          toast.error("Пользователь с таким email уже зарегистрирован");
        } else {
          toast.error(err.message);
        }
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
          <h1 className="text-2xl font-bold text-gray-900">Создать аккаунт</h1>
          <p className="text-gray-500 mt-1">Это займет меньше минуты</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <Form
            name="register"
            onFinish={handleSubmit}
            layout="vertical"
            size="large"
          >
            <Form.Item
              name="name"
              rules={[{ required: true, message: "Введите имя" }]}
            >
              <Input
                prefix={<UserOutlined className="text-gray-400" />}
                placeholder="Ваше имя"
              />
            </Form.Item>

            <Form.Item
              name="phone"
              rules={[
                { required: true, message: "Введите номер телефона" },
                { pattern: /^\+?[0-9\s\-()]{7,20}$/, message: "Введите корректный номер телефона" },
              ]}
            >
              <Input
                prefix={<PhoneOutlined className="text-gray-400" />}
                placeholder="+7 (000) 000-00-00"
              />
            </Form.Item>

            <Form.Item
              name="email"
              rules={[
                { required: true, message: "Введите email" },
                { type: "email", message: "Некорректный email" },
              ]}
            >
              <Input
                prefix={<MailOutlined className="text-gray-400" />}
                placeholder="email@example.com"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: "Введите пароль" },
                { min: 8, message: "Минимум 8 символов" },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined className="text-gray-400" />}
                placeholder="Пароль (минимум 8 символов)"
              />
            </Form.Item>

            <Form.Item
              name="agreement"
              valuePropName="checked"
              rules={[
                {
                  validator: (_, value) =>
                    value
                      ? Promise.resolve()
                      : Promise.reject("Необходимо согласие"),
                },
              ]}
            >
              <Checkbox>
                Согласен с{" "}
                <Link href="/terms" className="text-sky-600 hover:underline">
                  условиями использования
                </Link>
              </Checkbox>
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
                Продолжить →
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
            Зарегистрироваться через Google
          </Button>

          <Button
            block
            href="/api/auth/telegram"
            icon={<TelegramIcon />}
            style={{ height: 48, marginBottom: 12 }}
          >
            Зарегистрироваться через Telegram
          </Button>

          <div className="text-center text-sm text-gray-600">
            Уже есть аккаунт?{" "}
            <Link
              href="/auth/login"
              className="text-sky-600 font-medium hover:underline"
            >
              Войти
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
