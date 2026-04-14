"use client";

import { useState } from "react";
import { Form, Input, Button, Select, Steps, Space, Typography } from "antd";
import {
  SendOutlined,
  ArrowRightOutlined,
  ShopOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { CITIES, BUSINESS_CATEGORIES } from "@/lib/constants";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api-client";

interface OnboardingFormValues {
  companyName: string;
  city: string;
  category: string;
  telegram: string;
  whatsapp?: string;
  description?: string;
}

export default function BusinessOnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: OnboardingFormValues) => {
    setLoading(true);
    try {
      await api.put("/api/users/me/advertiser-profile", {
        companyName: values.companyName,
        city: values.city,
        companyType: values.category,
        telegram: values.telegram,
        whatsapp: values.whatsapp ?? null,
        description: values.description ?? null,
      });
      toast.success("Бизнес-профиль создан!");
      router.push("/");
    } catch (err: unknown) {
      const message =
        err instanceof ApiError ? err.message : "Ошибка при сохранении профиля";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3 flex justify-center">
            <ShopOutlined className="text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Профиль бизнеса</h1>
          <p className="text-gray-500 mt-2">Расскажите о вашей компании</p>
        </div>

        {/* Steps indicator */}
        <div className="mb-8">
          <Steps
            current={2}
            size="small"
            items={[
              { title: "Данные" },
              { title: "Роль" },
              { title: "Профиль" },
            ]}
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <Form
            name="business_onboarding"
            onFinish={handleSubmit}
            layout="vertical"
            size="large"
          >
            <Form.Item
              label="Название компании"
              name="companyName"
              rules={[{ required: true, message: "Введите название" }]}
            >
              <Input placeholder="Например: Coffee House Almaty" />
            </Form.Item>

            <Form.Item
              label="Город"
              name="city"
              rules={[{ required: true, message: "Выберите город" }]}
            >
              <Select
                placeholder="Выберите город"
                options={CITIES.map((c) => ({ label: c, value: c }))}
              />
            </Form.Item>

            <Form.Item
              label="Сфера деятельности"
              name="category"
              rules={[{ required: true, message: "Выберите сферу" }]}
            >
              <Select
                placeholder="Еда и напитки, Ретейл..."
                options={BUSINESS_CATEGORIES.map((c) => ({
                  label: c,
                  value: c,
                }))}
              />
            </Form.Item>

            <Form.Item
              label="Telegram для входящих"
              name="telegram"
              rules={[{ required: true, message: "Укажите контакт" }]}
              extra="На этот контакт будут писать заинтересованные креаторы"
            >
              <Space.Compact style={{ width: "100%" }}>
                <Typography.Text className="flex items-center px-3 bg-gray-50 border border-gray-300 border-r-0 rounded-l-md text-gray-500 text-sm whitespace-nowrap">
                  t.me/
                </Typography.Text>
                <Input
                  prefix={<SendOutlined className="text-gray-400" />}
                  placeholder="@company_username"
                />
              </Space.Compact>
            </Form.Item>

            <Form.Item label="WhatsApp (необязательно)" name="whatsapp">
              <Input placeholder="+7 (000) 000-00-00" />
            </Form.Item>

            <Form.Item
              label="Описание компании (необязательно)"
              name="description"
            >
              <Input.TextArea
                placeholder="Кратко о вашем бизнесе..."
                rows={3}
              />
            </Form.Item>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => router.push("/")}
                style={{ height: 48 }}
              >
                ← Назад
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                style={{
                  height: 48,
                  flex: 1,
                  background: "#3B82F6",
                  borderColor: "#3B82F6",
                }}
              >
                Создать профиль <ArrowRightOutlined />
              </Button>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}
