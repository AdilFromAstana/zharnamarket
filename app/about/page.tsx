import Link from "next/link";
import PublicLayout from "@/components/layout/PublicLayout";

export const metadata = {
  title: "О сервисе — Zharnamarket",
  description:
    "Zharnamarket — маркетплейс для прямого взаимодействия бизнеса и креаторов в Казахстане",
};

const steps = {
  business: [
    {
      number: "1",
      title: "Создайте задание",
      description:
        "Опишите что нужно сделать, укажите бюджет и требования к креатору",
    },
    {
      number: "2",
      title: "Получите отклики",
      description:
        "Креаторы увидят ваше задание и предложат свои услуги",
    },
    {
      number: "3",
      title: "Выберите исполнителя",
      description:
        "Изучите профили, статистику и портфолио, выберите лучшего креатора",
    },
  ],
  creator: [
    {
      number: "1",
      title: "Создайте профиль",
      description:
        "Укажите свои соцсети, статистику аудитории и категории контента",
    },
    {
      number: "2",
      title: "Найдите задание",
      description:
        "Просматривайте актуальные задания от бизнеса и откликайтесь на подходящие",
    },
    {
      number: "3",
      title: "Получите оплату",
      description:
        "Выполните задание и получите оплату на свой баланс",
    },
  ],
};

const advantages = [
  {
    title: "Прямое взаимодействие",
    description:
      "Без посредников и агентств — бизнес и креаторы общаются напрямую",
  },
  {
    title: "Безопасные платежи",
    description:
      "Оплата через Kaspi Pay и Halyk Bank. Данные карт не хранятся на платформе",
  },
  {
    title: "Модерация",
    description:
      "Все объявления и профили проходят проверку перед публикацией",
  },
  {
    title: "Фокус на Казахстан",
    description:
      "Платформа создана специально для казахстанского рынка",
  },
];

export default function AboutPage() {
  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto py-8">
        <div className="mb-6">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
          >
            ← Главная
          </Link>
        </div>

        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Связываем бизнес и креаторов
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Zharnamarket — маркетплейс, где казахстанский бизнес находит
            блогеров и креаторов для продвижения своих товаров и услуг
          </p>
        </div>

        {/* How it works — Business */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Как это работает для бизнеса
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {steps.business.map((step) => (
              <div
                key={step.number}
                className="bg-white border border-gray-200 rounded-xl p-5"
              >
                <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-600 font-bold text-sm flex items-center justify-center mb-3">
                  {step.number}
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  {step.title}
                </h3>
                <p className="text-sm text-gray-500">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works — Creator */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Как это работает для креаторов
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {steps.creator.map((step) => (
              <div
                key={step.number}
                className="bg-white border border-gray-200 rounded-xl p-5"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 font-bold text-sm flex items-center justify-center mb-3">
                  {step.number}
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  {step.title}
                </h3>
                <p className="text-sm text-gray-500">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Advantages */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Почему Zharnamarket
          </h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {advantages.map((item) => (
              <div
                key={item.title}
                className="bg-gray-50 rounded-xl p-5"
              >
                <h3 className="font-semibold text-gray-900 mb-1">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-500">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center bg-gradient-to-br from-sky-50 to-blue-50 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Начните прямо сейчас
          </h2>
          <p className="text-gray-600 mb-6">
            Регистрация бесплатная, начните находить креаторов или задания за
            пару минут
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/auth/register"
              className="px-6 py-2.5 bg-sky-600 text-white rounded-lg font-medium hover:bg-sky-700 transition-colors"
            >
              Зарегистрироваться
            </Link>
            <Link
              href="/ads"
              className="px-6 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Смотреть задания
            </Link>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
