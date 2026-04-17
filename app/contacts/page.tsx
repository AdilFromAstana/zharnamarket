import Link from "next/link";
import PublicLayout from "@/components/layout/PublicLayout";

export const metadata = {
  title: "Контакты — Zharnamarket",
  description:
    "Свяжитесь с командой Zharnamarket — email, Telegram, WhatsApp",
};

const channels = [
  {
    label: "Email",
    value: "support@zharnamarket.kz",
    href: "mailto:support@zharnamarket.kz",
    description: "Для вопросов, предложений и жалоб",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
        />
      </svg>
    ),
  },
  {
    label: "Telegram",
    value: "@zharnamarket",
    href: "https://t.me/zharnamarket",
    description: "Быстрые ответы и новости платформы",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    ),
  },
  {
    label: "WhatsApp",
    value: "+7 (7XX) XXX-XX-XX",
    href: "https://wa.me/77XXXXXXXXX",
    description: "Поддержка в рабочее время",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
  },
];

export default function ContactsPage() {
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

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Контакты</h1>
        <p className="text-gray-500 text-sm mb-8">
          Свяжитесь с нами любым удобным способом
        </p>

        <div className="space-y-4 mb-10">
          {channels.map((ch) => (
            <a
              key={ch.label}
              href={ch.href}
              target={ch.href.startsWith("http") ? "_blank" : undefined}
              rel={
                ch.href.startsWith("http")
                  ? "noopener noreferrer"
                  : undefined
              }
              className="flex items-start gap-4 bg-white border border-gray-200 rounded-xl p-5 hover:border-sky-300 hover:shadow-sm transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                {ch.icon}
              </div>
              <div>
                <div className="font-semibold text-gray-900 text-sm">
                  {ch.label}
                </div>
                <div className="text-sky-600 text-sm">{ch.value}</div>
                <div className="text-gray-500 text-xs mt-1">
                  {ch.description}
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* Working hours */}
        <div className="bg-gray-50 rounded-xl p-6 mb-10">
          <h2 className="font-semibold text-gray-900 mb-3">Время работы поддержки</h2>
          <div className="text-sm text-gray-600 space-y-1">
            <p>Пн–Пт: 09:00 – 18:00 (Астана, UTC+5)</p>
            <p>Сб–Вс: выходные</p>
            <p className="text-gray-400 mt-2">
              Email-обращения обрабатываются в течение 24 часов в рабочие дни
            </p>
          </div>
        </div>

        {/* Links */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
          <Link
            href="/faq"
            className="text-sky-600 hover:underline"
          >
            Частые вопросы
          </Link>
          <span className="hidden sm:inline text-gray-300">|</span>
          <Link
            href="/terms"
            className="text-sky-600 hover:underline"
          >
            Условия использования
          </Link>
          <span className="hidden sm:inline text-gray-300">|</span>
          <Link
            href="/privacy"
            className="text-sky-600 hover:underline"
          >
            Политика конфиденциальности
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}
