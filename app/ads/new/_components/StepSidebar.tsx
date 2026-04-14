import {
  CheckOutlined,
  DollarOutlined,
  EyeOutlined,
  PercentageOutlined,
  MessageOutlined,
  FileSearchOutlined,
  SafetyOutlined,
  RocketOutlined,
  BulbOutlined,
  InfoCircleOutlined,
  LockOutlined,
  UnorderedListOutlined,
  EditOutlined,
  MobileOutlined,
  FileTextOutlined,
  FileImageOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import type { BudgetType } from "@/lib/types/ad";
import { formatPrice } from "@/lib/utils";
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
  if (step === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-sky-50 border border-sky-200 rounded-2xl p-5">
          <h3 className="font-semibold text-sky-900 mb-3 flex items-center gap-2">
            <InfoCircleOutlined className="text-sky-500" /> Зачем это нужно?
          </h3>
          <ul className="space-y-2 text-sm text-sky-800">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-sky-400">•</span>
              Авторы будут видеть ваше имя рядом с объявлением
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-sky-400">•</span>
              Telegram — это основной канал для входящих откликов
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-sky-400">•</span>
              Эти данные сохраняются один раз и больше не запрашиваются
            </li>
          </ul>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <LockOutlined className="text-gray-400" /> Конфиденциальность
          </h3>
          <p className="text-sm text-gray-500">
            Ваш Telegram виден только авторам, которые откликаются на ваши
            объявления.
          </p>
        </div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
            <BulbOutlined className="text-amber-500" /> Советы для хорошего
            объявления
          </h3>
          <ul className="space-y-2.5 text-sm text-amber-800">
            <li className="flex items-start gap-2">
              <EditOutlined className="text-amber-500 mt-0.5 shrink-0" />
              <span>
                <b>Название</b> — конкретное и понятное. Например: «Нужен
                TikTok-блогер для обзора кафе»
              </span>
            </li>
            <li className="flex items-start gap-2">
              <MobileOutlined className="text-amber-500 mt-0.5 shrink-0" />
              <span>
                <b>Платформа</b> — выбирайте ту, где ваша аудитория активна
              </span>
            </li>
            <li className="flex items-start gap-2">
              <FileTextOutlined className="text-amber-500 mt-0.5 shrink-0" />
              <span>
                <b>Описание</b> — укажите продукт, формат видео, обязательные
                элементы и что нельзя делать
              </span>
            </li>
            <li className="flex items-start gap-2">
              <FileImageOutlined className="text-amber-500 mt-0.5 shrink-0" />
              <span>
                Добавьте фото — объявления с изображениями получают больше
                откликов
              </span>
            </li>
          </ul>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <RocketOutlined className="text-blue-400" /> Следующий шаг
          </h3>
          <p className="text-sm text-gray-500">
            На шаге 2 вы укажете бюджет и контакты. Авторы смогут сразу понять,
            стоит ли откликаться.
          </p>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="space-y-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <UnorderedListOutlined className="text-gray-400" /> Модели оплаты
          </h3>
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="font-medium text-gray-800 flex items-center gap-1.5 mb-0.5">
                <DollarOutlined className="text-blue-500" /> Фиксированная сумма
              </p>
              <p className="text-gray-500">
                Оговорённая сумма за одно видео. Самый простой и предсказуемый
                вариант.
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="font-medium text-gray-800 flex items-center gap-1.5 mb-0.5">
                <EyeOutlined className="text-green-500" /> За просмотры
              </p>
              <p className="text-gray-500">
                Оплата зависит от результата. Мотивирует автора стараться.
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="font-medium text-gray-800 flex items-center gap-1.5 mb-0.5">
                <PercentageOutlined className="text-purple-500" /> % от продаж
              </p>
              <p className="text-gray-500">
                Автор зарабатывает с каждой покупки по его ссылке или промокоду.
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="font-medium text-gray-800 flex items-center gap-1.5 mb-0.5">
                <MessageOutlined className="text-orange-500" /> Индивидуально
              </p>
              <p className="text-gray-500">
                Условия обсуждаются напрямую в Telegram после отклика.
              </p>
            </div>
          </div>
        </div>
        {budgetType === "per_views" && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
            <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
              <LockOutlined className="text-green-600" /> Гарантия через
              платформу
            </h3>
            <p className="text-sm text-green-800">
              При оплате через платформу (эскроу) деньги замораживаются и
              автоматически выплачиваются авторам по факту просмотров. Безопасно
              для обеих сторон.
            </p>
          </div>
        )}
      </div>
    );
  }

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
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
          <FileSearchOutlined className="mr-1.5" />
          После оплаты объявление пройдёт модерацию и появится в ленте на{" "}
          <b>7 дней</b>.
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
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
          <h3 className="font-semibold text-gray-900 mb-2">Итого к оплате</h3>
          {isEscrowMode ? (
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {formatPrice(form.getFieldValue("totalBudget") ?? 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Бюджет замораживается на эскроу-счёте
              </p>
            </div>
          ) : (
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {formatPrice(finalPayPrice)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Публикация на 7 дней</p>
            </div>
          )}
          {walletBalance !== null && (
            <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
              <WalletOutlined /> Баланс кошелька:{" "}
              {walletBalance.toLocaleString("ru")} ₸
            </p>
          )}
        </div>
      </div>
    );
  }

  // suppress unused-vars warning
  void values;

  return null;
}
