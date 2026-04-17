import Link from "next/link";
import PublicLayout from "@/components/layout/PublicLayout";

export const metadata = {
  title: "Частые вопросы — Zharnamarket",
  description:
    "Ответы на популярные вопросы о платформе Zharnamarket для бизнеса и креаторов",
};

type FaqItem = { q: string; a: string };

const sections: { title: string; items: FaqItem[] }[] = [
  {
    title: "Общие вопросы",
    items: [
      {
        q: "Что такое Zharnamarket?",
        a: "Zharnamarket — это маркетплейс, который связывает казахстанский бизнес с блогерами и креаторами. Бизнес размещает задания на продвижение, а креаторы откликаются и выполняют их.",
      },
      {
        q: "Регистрация бесплатная?",
        a: "Да, регистрация на платформе полностью бесплатна как для бизнеса, так и для креаторов.",
      },
      {
        q: "В каких городах работает сервис?",
        a: "Zharnamarket работает по всему Казахстану. Вы можете указать нужный город при создании задания или профиля креатора.",
      },
    ],
  },
  {
    title: "Для бизнеса",
    items: [
      {
        q: "Как разместить задание?",
        a: 'Зарегистрируйтесь, пополните баланс и нажмите "Создать задание". Заполните описание, укажите бюджет, категорию и требования к креатору. После модерации задание будет опубликовано.',
      },
      {
        q: "Сколько стоит размещение задания?",
        a: "Стоимость размещения зависит от выбранного тарифа. Актуальные цены указаны на странице создания задания.",
      },
      {
        q: "Как выбрать креатора?",
        a: "Вы можете просматривать каталог креаторов, фильтровать по категориям, городу и количеству подписчиков. У каждого креатора есть профиль со статистикой и примерами работ.",
      },
      {
        q: "Можно ли отменить задание?",
        a: "Вы можете скрыть или удалить задание в личном кабинете. Если задание уже оплачено и опубликовано, оплата за размещение не возвращается.",
      },
      {
        q: "Как пополнить баланс?",
        a: "Баланс пополняется через Kaspi Pay, Halyk Bank или банковскую карту в разделе «Баланс» в личном кабинете.",
      },
    ],
  },
  {
    title: "Для креаторов",
    items: [
      {
        q: "Как создать профиль креатора?",
        a: 'Зарегистрируйтесь и перейдите в раздел "Стать креатором". Заполните информацию о себе, укажите соцсети, статистику аудитории и категории контента.',
      },
      {
        q: "Как откликнуться на задание?",
        a: "Откройте интересующее задание и нажмите «Откликнуться». Бизнес увидит ваш отклик и профиль, и свяжется с вами при заинтересованности.",
      },
      {
        q: "Как получить оплату?",
        a: "После выполнения задания оплата поступает на ваш баланс в Zharnamarket. Оттуда вы можете вывести средства на банковскую карту.",
      },
      {
        q: "Как вывести деньги?",
        a: "Перейдите в раздел «Баланс» → «Вывод средств», укажите сумму и реквизиты карты. Вывод обрабатывается в течение 1–3 рабочих дней.",
      },
    ],
  },
  {
    title: "Платежи и безопасность",
    items: [
      {
        q: "Какие способы оплаты доступны?",
        a: "Kaspi Pay, Halyk Bank и банковские карты (Visa, Mastercard).",
      },
      {
        q: "Безопасны ли платежи?",
        a: "Да. Мы не храним данные ваших банковских карт — все платежи обрабатываются через сертифицированные платёжные системы.",
      },
      {
        q: "Что делать, если возник спор?",
        a: "Обратитесь в поддержку по адресу support@zharnamarket.kz. Мы рассмотрим обращение и поможем разрешить ситуацию.",
      },
    ],
  },
];

function FaqSection({
  title,
  items,
}: {
  title: string;
  items: FaqItem[];
}) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold text-gray-900 mb-4">{title}</h2>
      <div className="space-y-4">
        {items.map((item) => (
          <details
            key={item.q}
            className="group bg-white border border-gray-200 rounded-xl"
          >
            <summary className="flex items-center justify-between cursor-pointer px-5 py-4 text-gray-900 font-medium text-sm select-none">
              {item.q}
              <svg
                className="w-4 h-4 text-gray-400 shrink-0 ml-4 transition-transform group-open:rotate-180"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </summary>
            <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">
              {item.a}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

export default function FaqPage() {
  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto py-8">
        <div className="mb-6">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
          >
            ← Главная
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Частые вопросы
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          Ответы на популярные вопросы о платформе
        </p>

        {sections.map((section) => (
          <FaqSection
            key={section.title}
            title={section.title}
            items={section.items}
          />
        ))}

        {/* Contact block */}
        <div className="bg-gray-50 rounded-xl p-6 text-center">
          <h3 className="font-semibold text-gray-900 mb-2">
            Не нашли ответ?
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Напишите нам, и мы поможем разобраться
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="mailto:support@zharnamarket.kz"
              className="px-5 py-2.5 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700 transition-colors"
            >
              support@zharnamarket.kz
            </a>
            <Link
              href="/contacts"
              className="px-5 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Все контакты
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
