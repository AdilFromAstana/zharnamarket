"use client";

import Link from "next/link";
import { useState } from "react";
import { Form, Input, Button } from "antd";
import { MailOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api-client";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (values: { email: string }) => {
    setLoading(true);
    try {
      await api.post("/api/auth/forgot-password", { email: values.email });
      setSent(true);
      toast.success("Инструкции отправлены на email");
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        toast.error("Подождите перед повторной отправкой");
      } else {
        toast.error("Ошибка отправки. Попробуйте ещё раз.");
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
          <h1 className="text-2xl font-bold text-gray-900">Сбросить пароль</h1>
          <p className="text-gray-500 mt-1">
            Введите email — пришлём инструкции
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          {sent ? (
            <div className="text-center py-4">
              <MailOutlined className="text-5xl text-sky-500 mb-3 block" />
              <p className="font-semibold text-gray-900 mb-2">Письмо отправлено!</p>
              <p className="text-sm text-gray-500 mb-6">
                Проверьте входящие и следуйте инструкциям в письме.
              </p>
              <Link href="/auth/login">
                <Button type="primary" block style={{ background: "#0EA5E9", borderColor: "#0EA5E9" }}>
                  Вернуться ко входу
                </Button>
              </Link>
            </div>
          ) : (
            <Form
              name="forgot_password"
              onFinish={handleSubmit}
              layout="vertical"
              size="large"
            >
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
                  Отправить инструкции
                </Button>
              </Form.Item>
            </Form>
          )}

          {!sent && (
            <div className="text-center mt-2">
              <Link
                href="/auth/login"
                className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
              >
                <ArrowLeftOutlined className="text-xs" />
                Вернуться ко входу
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
