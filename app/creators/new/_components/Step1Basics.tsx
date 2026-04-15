import { Form, Input, Select } from "antd";
import { BulbOutlined } from "@ant-design/icons";
import type { FormInstance } from "antd";

type RefItem = { key: string; label: string; iconUrl?: string | null };

type Step1BasicsProps = {
  form: FormInstance;
  cities: RefItem[];
  categories: RefItem[];
};

export default function Step1Basics({
  cities,
  categories,
}: Step1BasicsProps) {
  return (
    <>
      <div className="mb-4 p-3 bg-sky-50 border border-sky-100 rounded-xl text-sm text-sky-700 lg:hidden">
        <p className="font-medium mb-0.5 flex items-center gap-1.5">
          <BulbOutlined /> Совет
        </p>
        <p>
          Дайте профилю понятное название — например «Мастер нарезок», «Обзорщик
          еды», «АСМР контент». Это поможет бизнесу найти именно нужного
          специалиста.
        </p>
      </div>

      <Form.Item
        label="Название профиля"
        name="title"
        rules={[
          { required: true, message: "Дайте название профилю" },
          { min: 5, message: "Минимум 5 символов" },
        ]}
        extra="Например: «Мастер нарезок», «Обзорщик еды и кафе», «TikTok фудблогер»"
      >
        <Input
          placeholder="Как назвать эту специализацию?"
          maxLength={60}
          showCount
        />
      </Form.Item>

      <Form.Item
        label="Город"
        name="city"
        rules={[{ required: true, message: "Выберите город" }]}
      >
        <Select
          placeholder="Выберите ваш город"
          options={cities.map((c) => ({
            label: c.label,
            value: c.key,
          }))}
          showSearch
          filterOption={(input, option) =>
            (option?.label as string)
              ?.toLowerCase()
              .includes(input.toLowerCase())
          }
        />
      </Form.Item>

      <Form.Item
        label="Категории контента"
        name="categories"
        rules={[
          {
            required: true,
            message: "Выберите хотя бы одну категорию",
          },
        ]}
        extra="Выберите те, в которых вы делаете контент"
      >
        <Select
          mode="multiple"
          placeholder="Мемы, Обзоры, Авто…"
          options={categories.map((c) => ({
            label: c.label,
            value: c.key,
          }))}
          maxTagCount="responsive"
        />
      </Form.Item>
    </>
  );
}
