import {
  CheckOutlined,
  SafetyOutlined,
} from "@ant-design/icons";
import type { BudgetType } from "@/lib/types/ad";
import type { FormValues } from "../_types";

export default function StepSidebar({
  step,
  budgetType,
  values,
  form,
  isEscrowMode,
  finalPayPrice,
  walletBalance,
}: {
  step: 0 | 1 | 2 | 3 | 4;
  budgetType: BudgetType | null;
  values: FormValues;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any;
  isEscrowMode: boolean;
  finalPayPrice: number;
  walletBalance: number | null;
}) {
  if (step === 3) {
    const title = form.getFieldValue("title");
    const platform = form.getFieldValue("platform");
    const city = form.getFieldValue("city");
    const category = form.getFieldValue("category");
    const description = form.getFieldValue("description");
    const telegram = form.getFieldValue("telegram");
    return (
      <div className="space-y-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <CheckOutlined className="text-green-500" /> Чеклист перед оплатой
          </h3>
          <ul className="space-y-2 text-sm">
            {[
              { label: "Название объявления", ok: !!title },
              { label: "Платформа выбрана", ok: !!platform },
              { label: "Город и категория", ok: !!city && !!category },
              { label: "Описание заполнено", ok: !!description },
              {
                label: "Контакты / оплата",
                ok: !!budgetType && (isEscrowMode || !!telegram),
              },
            ].map(({ label, ok }) => (
              <li key={label} className="flex items-center gap-2">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${ok ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}
                >
                  {ok ? (
                    <CheckOutlined style={{ fontSize: 10 }} />
                  ) : (
                    <span className="text-xs">–</span>
                  )}
                </span>
                <span className={ok ? "text-gray-700" : "text-gray-400"}>
                  {label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  if (step === 4) {
    return (
      <div className="space-y-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <SafetyOutlined className="text-blue-500" /> Безопасная оплата
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <CheckOutlined className="text-green-500 shrink-0 mt-0.5" />
              Данные карты не хранятся на нашем сервере
            </li>
            <li className="flex items-start gap-2">
              <CheckOutlined className="text-green-500 shrink-0 mt-0.5" />
              Оплата через сертифицированных провайдеров
            </li>
            <li className="flex items-start gap-2">
              <CheckOutlined className="text-green-500 shrink-0 mt-0.5" />
              Объявление публикуется сразу после подтверждения
            </li>
          </ul>
        </div>
      </div>
    );
  }

  // suppress unused-vars warning
  void values;

  return null;
}
