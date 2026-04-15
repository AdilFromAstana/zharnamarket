import {
  Form,
  Input,
  InputNumber,
  Button,
  Select,
  AutoComplete,
  Space,
} from "antd";
import {
  SendOutlined,
  PlusOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import type { FormInstance } from "antd";

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

export default function Step3Contacts({
  platforms,
  adFormats,
}: Step3ContactsProps) {
  return (
    <>
      <div className="mb-1">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Контакты
        </p>

        <Form.Item
          label="Telegram"
          name="telegram"
          rules={[{ required: true, message: "Укажите Telegram-username" }]}
          extra={
            <span className="text-xs text-gray-400">
              Только username, например: username
            </span>
          }
        >
          <Input
            size="large"
            prefix={
              <span className="flex items-center gap-1.5 text-gray-400 text-sm select-none pr-2 border-r border-gray-200 mr-2">
                <SendOutlined /> @
              </span>
            }
            placeholder="username"
          />
        </Form.Item>

        <Form.Item
          label={
            <span>
              WhatsApp
              <span className="ml-1.5 text-xs font-normal text-gray-400">
                (необязательно)
              </span>
            </span>
          }
          name="whatsapp"
        >
          <Input placeholder="+7 (000) 000-00-00" />
        </Form.Item>
      </div>

      <div className="mb-1 mt-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Прайс-лист{" "}
          <span className="text-gray-400 normal-case font-normal">
            (можно заполнить позже)
          </span>
        </p>

        <div className="mb-3 p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700 lg:hidden">
          Укажи цены по каждому типу рекламы — так заказчик сразу поймёт,
          сколько стоит интеграция, баннер или хук.
        </div>

        <Form.List name="priceItems">
          {(fields, { add, remove }) => (
            <>
              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className="text-xs text-gray-400 self-center shrink-0">
                  Добавить:
                </span>
                {QUICK_ADD_FORMATS.map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => add({ adFormatLabel: fmt })}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                  >
                    + {fmt}
                  </button>
                ))}
              </div>

              {fields.map(({ key, name, ...restField }) => (
                <div
                  key={key}
                  className="rounded-xl border border-gray-200 p-3 mb-2 bg-white"
                >
                  <div className="flex gap-2 items-start">
                    <Form.Item
                      {...restField}
                      name={[name, "adFormatLabel"]}
                      rules={[{ required: true, message: "Укажи тип" }]}
                      style={{ flex: 1, marginBottom: 0 }}
                    >
                      <AutoComplete
                        placeholder="Тип рекламы"
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
                    <Button
                      danger
                      type="text"
                      icon={<DeleteOutlined />}
                      onClick={() => remove(name)}
                    />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Form.Item
                      {...restField}
                      name={[name, "platform"]}
                      noStyle
                    >
                      <Select
                        allowClear
                        placeholder="Платформа"
                        style={{ flex: 1 }}
                        options={platforms.map((p) => ({
                          label: p.label,
                          value: p.key,
                        }))}
                      />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, "price"]}
                      rules={[{ required: true, message: "Цена" }]}
                      style={{ width: 140, marginBottom: 0 }}
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
                </div>
              ))}

              <Button
                type="dashed"
                onClick={() => add()}
                block
                icon={<PlusOutlined />}
              >
                Добавить формат
              </Button>
            </>
          )}
        </Form.List>
      </div>
    </>
  );
}
