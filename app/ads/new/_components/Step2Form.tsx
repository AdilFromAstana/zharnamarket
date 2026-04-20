import { Form, Input, InputNumber } from "antd";
import { CheckOutlined, TeamOutlined, LockOutlined } from "@ant-design/icons";
import type { FormInstance } from "antd";
import type { BudgetType } from "@/lib/types/ad";
import type { FormValues, PaymentMode } from "../_types";
import { BUDGET_TYPE_OPTIONS } from "../_constants";
import { SHOW_PLATFORM_ESCROW } from "@/lib/constants";

type Step2FormProps = {
  form: FormInstance<FormValues>;
  budgetType: BudgetType | null;
  paymentMode: PaymentMode;
  setBudgetType: (v: BudgetType) => void;
  setPaymentMode: (v: PaymentMode) => void;
  saveDraft: (v: Partial<FormValues>) => void;
};

export default function Step2Form({
  form,
  budgetType,
  paymentMode,
  setBudgetType,
  setPaymentMode,
  saveDraft,
}: Step2FormProps) {
  return (
    <div className="md:bg-white md:rounded-xl md:border md:border-gray-200 md:shadow-sm md:p-6">
      {/* Как вы платите блогеру */}
      <Form.Item
        label={
          <span className="font-semibold text-gray-900">
            Как вы платите блогеру? <span className="text-red-500">*</span>
          </span>
        }
        name="budgetType"
        rules={[{ required: true, message: "Выберите модель оплаты" }]}
      >
        <div className="space-y-2">
          {BUDGET_TYPE_OPTIONS.map((opt) => {
            const isSelected = budgetType === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setBudgetType(opt.value);
                  form.setFieldValue("budgetType", opt.value);
                  saveDraft({ budgetType: opt.value });
                }}
                className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all cursor-pointer min-h-[52px] ${
                  isSelected
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`text-lg shrink-0 ${isSelected ? "text-blue-600" : "text-gray-400"}`}
                  >
                    {opt.icon}
                  </span>
                  <span
                    className={`flex-1 text-sm font-medium ${isSelected ? "text-blue-700" : "text-gray-700"}`}
                  >
                    {opt.label}
                  </span>
                  {isSelected && (
                    <CheckOutlined className="text-blue-600 shrink-0" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </Form.Item>

      {/* Подсказка и поля для выбранного типа */}
      {budgetType && (
        <div className="mb-4">
          {BUDGET_TYPE_OPTIONS.find((o) => o.value === budgetType)?.hint && (
            <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-500 mb-3">
              {BUDGET_TYPE_OPTIONS.find((o) => o.value === budgetType)?.hint}
            </div>
          )}

          {/* Фиксированная сумма → два числовых поля */}
          {budgetType === "fixed" && (
            <div className="flex gap-3 items-center">
              <Form.Item
                name="budgetFrom"
                noStyle
                rules={[{ required: true, message: "Укажите сумму от" }]}
              >
                <InputNumber
                  placeholder="от ₸"
                  min={0}
                  step={1000}
                  style={{ flex: 1 }}
                  formatter={(v) =>
                    `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                  }
                  parser={(v) =>
                    (v ? parseFloat(v.replace(/,/g, "")) : 0) as unknown as 0
                  }
                />
              </Form.Item>
              <span className="text-gray-400 shrink-0">—</span>
              <Form.Item name="budgetTo" noStyle>
                <InputNumber
                  placeholder="до ₸ (необязательно)"
                  min={0}
                  step={1000}
                  style={{ flex: 1 }}
                  formatter={(v) =>
                    `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                  }
                  parser={(v) =>
                    (v ? parseFloat(v.replace(/,/g, "")) : 0) as unknown as 0
                  }
                />
              </Form.Item>
            </div>
          )}

          {/* За просмотры → выбор: сам / через платформу */}
          {budgetType === "per_views" && (
            <div className="space-y-3">
              {SHOW_PLATFORM_ESCROW && (
                <>
                  <div className="text-sm font-medium text-gray-700 mb-1">
                    Как хотите оплачивать?
                  </div>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMode("direct");
                        form.setFieldValue("paymentMode", "direct");
                        saveDraft({ paymentMode: "direct" });
                      }}
                      className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all cursor-pointer ${
                        paymentMode === "direct"
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <TeamOutlined
                          className={`text-lg ${paymentMode === "direct" ? "text-blue-600" : "text-gray-400"}`}
                        />
                        <div className="flex-1">
                          <div
                            className={`text-sm font-medium ${paymentMode === "direct" ? "text-blue-700" : "text-gray-700"}`}
                          >
                            Договорюсь с креатором сам
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            Укажете бюджет текстом, связь напрямую
                          </div>
                        </div>
                        {paymentMode === "direct" && (
                          <CheckOutlined className="text-blue-600 shrink-0" />
                        )}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMode("escrow");
                        form.setFieldValue("paymentMode", "escrow");
                        saveDraft({ paymentMode: "escrow" });
                      }}
                      className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all cursor-pointer ${
                        paymentMode === "escrow"
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <LockOutlined
                          className={`text-lg ${paymentMode === "escrow" ? "text-green-600" : "text-gray-400"}`}
                        />
                        <div className="flex-1">
                          <div
                            className={`text-sm font-medium ${paymentMode === "escrow" ? "text-green-700" : "text-gray-700"}`}
                          >
                            Через платформу (гарантия оплаты)
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            Деньги замораживаются, креатор получает выплату
                            автоматически
                          </div>
                        </div>
                        {paymentMode === "escrow" && (
                          <CheckOutlined className="text-green-600 shrink-0" />
                        )}
                      </div>
                    </button>
                  </div>
                </>
              )}

              {/* Direct mode: текстовое описание */}
              {paymentMode === "direct" && (
                <Form.Item
                  name="budgetDetails"
                  rules={[
                    { required: true, message: "Опишите условие оплаты" },
                  ]}
                  noStyle
                >
                  <Input
                    placeholder={
                      BUDGET_TYPE_OPTIONS.find((o) => o.value === budgetType)
                        ?.placeholder
                    }
                    size="large"
                  />
                </Form.Item>
              )}

              {/* Escrow mode: RPM, бюджет, лимиты, дедлайн */}
              {paymentMode === "escrow" && (
                <div className="space-y-3 p-4 bg-green-50 rounded-xl border border-green-200">
                  <Form.Item
                    name="rpm"
                    label={
                      <span className="text-sm font-medium text-gray-700">
                        Ставка за 1 000 просмотров (RPM)
                      </span>
                    }
                    rules={[{ required: true, message: "Укажите RPM" }]}
                  >
                    <InputNumber
                      placeholder="150"
                      min={50}
                      max={10000}
                      suffix="₸"
                      style={{ width: "100%" }}
                    />
                  </Form.Item>

                  <Form.Item
                    name="totalBudget"
                    label={
                      <span className="text-sm font-medium text-gray-700">
                        Общий бюджет задания
                      </span>
                    }
                    rules={[{ required: true, message: "Укажите бюджет" }]}
                  >
                    <InputNumber
                      placeholder="50 000"
                      min={1000}
                      suffix="₸"
                      style={{ width: "100%" }}
                      formatter={(v) =>
                        `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                      }
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      parser={(v: any) =>
                        v ? parseFloat(v.replace(/,/g, "")) : 0
                      }
                    />
                  </Form.Item>

                  {/* Калькулятор */}
                  {form.getFieldValue("rpm") &&
                    form.getFieldValue("totalBudget") && (
                      <div className="p-3 bg-white rounded-lg border border-green-200 text-sm">
                        <span className="text-gray-500">
                          Бюджета хватит примерно на{" "}
                        </span>
                        <span className="font-semibold text-green-700">
                          {Math.floor(
                            (form.getFieldValue("totalBudget") /
                              form.getFieldValue("rpm")) *
                              1000,
                          ).toLocaleString("ru")}
                        </span>
                        <span className="text-gray-500"> просмотров</span>
                      </div>
                    )}

                  <div className="flex gap-3">
                    <Form.Item
                      name="minViews"
                      label={
                        <span className="text-xs text-gray-600">
                          Мин. просмотров
                        </span>
                      }
                      className="flex-1 mb-0"
                    >
                      <InputNumber
                        placeholder="10 000"
                        min={0}
                        style={{ width: "100%" }}
                        formatter={(v) =>
                          `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                        }
                        parser={(v) =>
                          (v
                            ? parseFloat(v.replace(/,/g, ""))
                            : 0) as unknown as 0
                        }
                      />
                    </Form.Item>
                    <Form.Item
                      name="maxViewsPerCreator"
                      label={
                        <span className="text-xs text-gray-600">
                          Макс. на 1 креатора
                        </span>
                      }
                      className="flex-1 mb-0"
                    >
                      <InputNumber
                        placeholder="Без лимита"
                        min={0}
                        style={{ width: "100%" }}
                        formatter={(v) =>
                          `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                        }
                        parser={(v) =>
                          (v
                            ? parseFloat(v.replace(/,/g, ""))
                            : 0) as unknown as 0
                        }
                      />
                    </Form.Item>
                  </div>

                  <Form.Item
                    name="submissionDeadline"
                    label={
                      <span className="text-sm font-medium text-gray-700">
                        Дедлайн подачи видео
                      </span>
                    }
                    rules={[{ required: true, message: "Укажите дедлайн" }]}
                  >
                    <Input
                      type="date"
                      min={
                        new Date(Date.now() + 86400000)
                          .toISOString()
                          .split("T")[0]
                      }
                    />
                  </Form.Item>
                </div>
              )}
            </div>
          )}

          {/* % от продаж → текстовое поле */}
          {budgetType === "revenue" && (
            <Form.Item
              name="budgetDetails"
              rules={[{ required: true, message: "Опишите условие оплаты" }]}
              noStyle
            >
              <Input
                placeholder={
                  BUDGET_TYPE_OPTIONS.find((o) => o.value === budgetType)
                    ?.placeholder
                }
                size="large"
              />
            </Form.Item>
          )}
        </div>
      )}

      {/* Контакты — не нужны для escrow */}
      {!(budgetType === "per_views" && paymentMode === "escrow") && (
        <div className="border-t border-gray-100 pt-5 mt-1">
          <h3 className="font-semibold text-gray-900 mb-1">
            Контакты для связи
          </h3>
          <p className="text-xs text-gray-400 mb-4">
            Авторы напишут напрямую вам — выберите удобный способ
          </p>

          <Form.Item
            label="Telegram"
            name="telegram"
            rules={[{ required: true, message: "Telegram обязателен" }]}
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

          <Form.Item label="WhatsApp" name="whatsapp">
            <Input placeholder="+7 (000) 000-00-00" />
          </Form.Item>
        </div>
      )}
      {budgetType === "per_views" && paymentMode === "escrow" && (
        <div className="border-t border-gray-100 pt-5 mt-1">
          <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
            Контакты не нужны — креаторы будут подавать видео через платформу, а
            связь происходит внутри системы.
          </div>
        </div>
      )}
    </div>
  );
}
