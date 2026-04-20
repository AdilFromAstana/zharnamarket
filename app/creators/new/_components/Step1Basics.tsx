import { Form, Input, Select, Button, Avatar, Upload, Radio } from "antd";
import {
  BulbOutlined,
  CameraOutlined,
  UserOutlined,
  CheckCircleOutlined,
  PauseCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import type { FormInstance } from "antd";

type RefItem = { key: string; label: string; iconUrl?: string | null };

type AvatarSlotProps = {
  url: string | null;
  uploading: boolean;
  onUpload: (file: File) => void;
};

type Step1BasicsProps = {
  form: FormInstance;
  cities: RefItem[];
  categories: RefItem[];
  avatar?: AvatarSlotProps;
};

export default function Step1Basics({
  cities,
  categories,
  avatar,
}: Step1BasicsProps) {
  return (
    <>
      {avatar && (
        <div className="mb-5 pb-5 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <Avatar
              size={72}
              icon={<UserOutlined />}
              src={avatar.url ?? undefined}
              style={{ background: "#3B82F6", flexShrink: 0 }}
            />
            <div>
              <Upload
                accept="image/*"
                showUploadList={false}
                disabled={avatar.uploading}
                beforeUpload={(file) => {
                  avatar.onUpload(file as unknown as File);
                  return false;
                }}
              >
                <Button
                  icon={<CameraOutlined />}
                  loading={avatar.uploading}
                >
                  {avatar.url
                    ? "Сменить фото"
                    : avatar.uploading
                      ? "Загрузка..."
                      : "Загрузить фото"}
                </Button>
              </Upload>
              <p className="text-xs text-gray-400 mt-1">
                Профили с фото получают в 3-5 раз больше откликов
              </p>
            </div>
          </div>
        </div>
      )}

      <Form.Item
        label="Ваше имя"
        name="fullName"
        rules={[
          { required: true, message: "Укажите ваше имя" },
          { min: 2, message: "Минимум 2 символа" },
        ]}
        extra="Настоящее имя — его увидят заказчики"
      >
        <Input placeholder="Данияр Сейткали" maxLength={80} />
      </Form.Item>

      <Form.Item
        label="Ник (username)"
        name="username"
        extra={<span className="text-xs text-gray-400">Необязательно</span>}
      >
        <Input placeholder="@username" />
      </Form.Item>

      <Form.Item
        label="О себе"
        name="bio"
        extra={<span className="text-xs text-gray-400">Необязательно</span>}
      >
        <Input.TextArea
          rows={3}
          placeholder="Коротко о себе и вашем стиле"
          maxLength={500}
          showCount
        />
      </Form.Item>

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

      <Form.Item
        label="Статус доступности"
        name="availability"
        initialValue="available"
        extra={
          <span className="text-xs text-gray-400">
            Показываем заказчикам, открыты ли вы к заказам
          </span>
        }
      >
        <Radio.Group buttonStyle="solid" className="flex flex-wrap gap-y-2">
          <Radio.Button value="available">
            <CheckCircleOutlined className="mr-1 text-green-500" />
            Свободен
          </Radio.Button>
          <Radio.Button value="partially_available">
            <PauseCircleOutlined className="mr-1 text-yellow-500" />
            Частично
          </Radio.Button>
          <Radio.Button value="busy">
            <CloseCircleOutlined className="mr-1 text-red-500" />
            Занят
          </Radio.Button>
        </Radio.Group>
      </Form.Item>
    </>
  );
}
