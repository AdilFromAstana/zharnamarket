import Link from "next/link";
import PublicLayout from "@/components/layout/PublicLayout";

export const metadata = {
  title: "Политика конфиденциальности — Zharnamarket",
  description:
    "Как Zharnamarket собирает, хранит и защищает ваши персональные данные",
};

export default function PrivacyPage() {
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
          Политика конфиденциальности
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          Последнее обновление: апрель 2026
        </p>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              1. Какие данные мы собираем
            </h2>
            <p>При использовании Zharnamarket мы можем собирать:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>
                <strong>Данные при регистрации</strong> — имя, email, номер
                телефона, ссылки на социальные сети
              </li>
              <li>
                <strong>Данные профиля креатора</strong> — описание, категории,
                город, статистика аудитории, примеры работ
              </li>
              <li>
                <strong>Данные объявлений</strong> — текст задания, бюджет,
                требования
              </li>
              <li>
                <strong>Платёжные данные</strong> — информация о транзакциях
                (данные карты обрабатываются платёжными системами, мы их не
                храним)
              </li>
              <li>
                <strong>Технические данные</strong> — IP-адрес, тип браузера,
                cookies, данные об использовании сервиса
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              2. Цели сбора данных
            </h2>
            <p>Мы используем ваши данные для:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Регистрации и управления аккаунтом</li>
              <li>
                Обеспечения взаимодействия между бизнесом и креаторами
              </li>
              <li>Обработки платежей и ведения финансовой отчётности</li>
              <li>Улучшения работы платформы и пользовательского опыта</li>
              <li>
                Отправки уведомлений о заданиях, откликах и статусах заказов
              </li>
              <li>Предотвращения мошенничества и обеспечения безопасности</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              3. Хранение данных
            </h2>
            <p>
              Ваши данные хранятся на защищённых серверах. Мы принимаем
              технические и организационные меры для защиты данных от
              несанкционированного доступа, изменения или уничтожения.
            </p>
            <p className="mt-2">
              Данные хранятся в течение всего срока использования аккаунта. При
              удалении аккаунта персональные данные удаляются в течение 30 дней,
              за исключением данных, которые мы обязаны хранить по
              законодательству РК.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              4. Передача данных третьим лицам
            </h2>
            <p>Мы можем передавать данные:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>
                <strong>Платёжным системам</strong> (Kaspi Pay, Halyk Bank) —
                для обработки платежей
              </li>
              <li>
                <strong>Сервисам аналитики</strong> — для улучшения работы
                платформы (в обезличенном виде)
              </li>
              <li>
                <strong>Государственным органам</strong> — по запросу в
                соответствии с законодательством РК
              </li>
            </ul>
            <p className="mt-2">
              Мы не продаём и не передаём ваши персональные данные третьим лицам
              в рекламных целях.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              5. Файлы cookie
            </h2>
            <p>
              Мы используем cookies для авторизации, сохранения настроек и
              аналитики. Вы можете отключить cookies в настройках браузера, но
              это может ограничить функциональность сервиса.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              6. Ваши права
            </h2>
            <p>
              В соответствии с Законом РК «О персональных данных и их защите» вы
              имеете право:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Запросить доступ к своим персональным данным</li>
              <li>Потребовать исправления неточных данных</li>
              <li>Потребовать удаления своих данных</li>
              <li>Отозвать согласие на обработку данных</li>
            </ul>
            <p className="mt-2">
              Для реализации своих прав обращайтесь на{" "}
              <a
                href="mailto:support@zharnamarket.kz"
                className="text-sky-600 hover:underline"
              >
                support@zharnamarket.kz
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              7. Изменения политики
            </h2>
            <p>
              Мы можем обновлять настоящую политику. При существенных изменениях
              мы уведомим вас через email или уведомление на платформе.
              Продолжение использования сервиса после публикации изменений
              означает согласие с обновлённой политикой.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              8. Контакты
            </h2>
            <p>
              По вопросам конфиденциальности обращайтесь:
              <br />
              Email:{" "}
              <a
                href="mailto:support@zharnamarket.kz"
                className="text-sky-600 hover:underline"
              >
                support@zharnamarket.kz
              </a>
            </p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-100 text-center">
          <Link href="/terms" className="text-sky-600 hover:underline text-sm">
            Условия использования →
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}
