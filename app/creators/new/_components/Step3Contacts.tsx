import { useState } from "react";
import { Form, Input, InputNumber, Select, AutoComplete, Radio } from "antd";
import {
  SendOutlined,
  WhatsAppOutlined,
  DeleteOutlined,
  PlusOutlined,
  PhoneOutlined,
  MailOutlined,
} from "@ant-design/icons";
import type { FormInstance } from "antd";

const CONTACT_DEPS = ["telegram", "whatsapp", "phone", "email"] as const;
const contactFilled = (getFieldValue: (key: string) => unknown) =>
  CONTACT_DEPS.some((f) => {
    const v = getFieldValue(f);
    return typeof v === "string" && v.trim().length > 0;
  });

type RefItem = { key: string; label: string; iconUrl?: string | null };
type AdFormatOption = { id: string; key: string; label: string };

type Step3ContactsProps = {
  form: FormInstance;
  platforms: RefItem[];
  adFormats: AdFormatOption[];
};

const QUICK_ADD_FORMATS = [
  "Нативная интеграция",
  "Баннер на видео",
  "Хук (зацепка)",
  "Полный рекламный ролик",
];

const PRICE_UNITS: { label: string; value: string }[] = [
  { label: "за интеграцию", value: "per_integration" },
  { label: "за ролик", value: "per_video" },
  { label: "за 1000 показов", value: "per_1000_views" },
];

type PriceRowProps = {
  name: number;
  restField: object;
  platforms: RefItem[];
  adFormats: AdFormatOption[];
  onRemove: () => void;
};

function PriceRow({
  name,
  restField,
  platforms,
  adFormats,
  onRemove,
}: PriceRowProps) {
  const form = Form.useFormInstance();
  const [isPreset] = useState(() => {
    const label = form.getFieldValue([
      "priceItems",
      name,
      "adFormatLabel",
    ]) as string | undefined;
    return Boolean(label && QUICK_ADD_FORMATS.includes(label));
  });
  const currentLabel = form.getFieldValue([
    "priceItems",
    name,
    "adFormatLabel",
  ]) as string | undefined;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        {isPreset ? (
          <>
            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-sm font-medium">
              {currentLabel || "Формат"}
            </span>
            <Form.Item
              {...restField}
              name={[name, "adFormatLabel"]}
              hidden
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
          </>
        ) : (
          <Form.Item
            {...restField}
            name={[name, "adFormatLabel"]}
            rules={[
              { required: true, message: "Укажите название формата" },
            ]}
            style={{ flex: 1, marginBottom: 0 }}
          >
            <AutoComplete
              placeholder="Например: сторис, пост в ленту, AMA"
              options={adFormats.map((f) => ({
                label: f.label,
                value: f.label,
              }))}
              filterOption={(input, option) =>
                (option?.label as string)
                  ?.toLowerCase()
                  .includes(input.toLowerCase())
              }
            />
          </Form.Item>
        )}
        <button
          type="button"
          onClick={onRemove}
          aria-label="Удалить формат"
          className="text-gray-300 hover:text-red-500 transition-colors p-1 shrink-0 cursor-pointer"
        >
          <DeleteOutlined />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Form.Item
          {...restField}
          name={[name, "platform"]}
          label={<span className="text-xs text-gray-500">Платформа</span>}
          style={{ marginBottom: 0 }}
        >
          <Select
            allowClear
            placeholder="Выберите платформу"
            options={platforms.map((p) => ({
              label: p.label,
              value: p.key,
            }))}
          />
        </Form.Item>
        <Form.Item
          {...restField}
          name={[name, "price"]}
          label={<span className="text-xs text-gray-500">Стоимость</span>}
          rules={[{ required: true, message: "Укажите цену" }]}
          style={{ marginBottom: 0 }}
        >
          <InputNumber
            placeholder="15000"
            min={0}
            step={1000}
            style={{ width: "100%" }}
            suffix="₸"
          />
        </Form.Item>
      </div>

      <Form.Item
        {...restField}
        name={[name, "priceUnit"]}
        label={<span className="text-xs text-gray-500">Цена считается</span>}
        initialValue="per_integration"
        style={{ marginTop: 12, marginBottom: 0 }}
      >
        <Select options={PRICE_UNITS} />
      </Form.Item>
    </div>
  );
}

export default function Step3Contacts({
  platforms,
  adFormats,
}: Step3ContactsProps) {
  return (
    <div className="space-y-8">
      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            Как с вами связаться
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Укажите хотя бы один контакт — по нему заказчики будут писать
            напрямую.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Form.Item
            label={
              <span className="flex items-center gap-1.5">
                <SendOutlined className="text-sky-500" />
                Telegram
              </span>
            }
            name="telegram"
            dependencies={["whatsapp", "phone", "email"]}
            rules={[
              ({ getFieldValue }) => ({
                validator() {
                  if (contactFilled(getFieldValue)) return Promise.resolve();
                  return Promise.reject(
                    new Error("Укажите хотя бы один контакт"),
                  );
                },
              }),
            ]}
            extra={
              <span className="text-xs text-gray-400">
                Только username, без @
              </span>
            }
          >
            <Input
              prefix={
                <span className="text-gray-400 select-none pr-1">@</span>
              }
              placeholder="username"
            />
          </Form.Item>

          <Form.Item
            label={
              <span className="flex items-center gap-1.5">
                <WhatsAppOutlined className="text-green-600" />
                WhatsApp
              </span>
            }
            name="whatsapp"
            extra={
              <span className="text-xs text-gray-400">Необязательно</span>
            }
          >
            <Input placeholder="+7 (000) 000-00-00" />
          </Form.Item>

          <Form.Item
            label={
              <span className="flex items-center gap-1.5">
                <PhoneOutlined className="text-gray-500" />
                Телефон
              </span>
            }
            name="phone"
            extra={
              <span className="text-xs text-gray-400">Необязательно</span>
            }
          >
            <Input placeholder="+7 (000) 000-00-00" />
          </Form.Item>

          <Form.Item
            label={
              <span className="flex items-center gap-1.5">
                <MailOutlined className="text-gray-500" />
                Email
              </span>
            }
            name="email"
            rules={[{ type: "email", message: "Неверный формат email" }]}
            extra={
              <span className="text-xs text-gray-400">Необязательно</span>
            }
          >
            <Input placeholder="email@example.com" />
          </Form.Item>
        </div>
      </section>

      <div className="border-t border-gray-100" />

      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            Ваши форматы и цены
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Выберите форматы, которые делаете, и укажите цены. Можно
            пропустить и заполнить позже — но с ценами заказчики пишут чаще.
          </p>
        </div>

        <Form.Item
          name="negotiable"
          initialValue={true}
          className="!mb-4"
        >
          <Radio.Group>
            <Radio value={true}>Ставка договорная</Radio>
            <Radio value={false}>Ставка фиксированная</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.List name="priceItems">
          {(fields, { add, remove }) => (
            <>
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 mb-2">
                  Выберите формат, чтобы добавить:
                </p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_ADD_FORMATS.map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() =>
                        add({
                          adFormatLabel: fmt,
                          priceUnit: "per_integration",
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-indigo-100 bg-indigo-50 text-sm font-medium text-indigo-700 hover:bg-indigo-100 hover:border-indigo-200 transition-colors cursor-pointer"
                    >
                      <PlusOutlined className="text-[11px]" />
                      {fmt}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => add({ priceUnit: "per_integration" })}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-dashed border-gray-300 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-colors cursor-pointer"
                  >
                    <PlusOutlined className="text-[11px]" />
                    Свой формат
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-2">
                  Не нашли нужный формат? Нажмите «Свой формат» и впишите
                  название сами.
                </p>
              </div>

              {fields.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
                  <p className="text-sm text-gray-600">
                    Пока не выбрано ни одного формата
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Нажмите на формат выше — появится карточка с ценой.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {fields.map(({ key, name, ...restField }) => (
                    <PriceRow
                      key={key}
                      name={name}
                      restField={restField}
                      platforms={platforms}
                      adFormats={adFormats}
                      onRemove={() => remove(name)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </Form.List>
      </section>
    </div>
  );
}
