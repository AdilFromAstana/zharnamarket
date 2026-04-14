import { Form, Input } from "antd";
import { SmileOutlined } from "@ant-design/icons";
import type { FormInstance } from "antd";
import type { Step0Values } from "../_types";

type Step0FormProps = {
  form: FormInstance<Step0Values>;
};

export default function Step0Form({ form }: Step0FormProps) {
  return (
    <div className="space-y-4">
      <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 text-sm text-sky-800">
        <p className="font-medium mb-1 flex items-center gap-1.5">
          <SmileOutlined /> Один маленький шаг
        </p>
        <p className="text-sky-700">
          Это нужно только один раз. Введите как к вам обращаться и куда писать
          по заданиям.
        </p>
      </div>
      <div className="md:bg-white md:rounded-xl md:border md:border-gray-200 md:shadow-sm md:p-6">
        <Form
          form={form}
          name="step0_contact"
          layout="vertical"
          size="large"
        >
          <Form.Item
            label="Как к вам обращаться?"
            name="displayName"
            rules={[{ required: true, message: "Введите имя или название" }]}
            extra="Например: «Кофейня Алишера», «Zara KZ» или просто ваше имя"
          >
            <Input placeholder="Ваше имя или название бизнеса" />
          </Form.Item>

          <Form.Item
            label="Telegram для входящих"
            name="telegram"
            rules={[{ required: true, message: "Введите Telegram" }]}
            extra="Именно сюда будут писать авторы контента"
          >
            <Input prefix="@" placeholder="username" />
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
