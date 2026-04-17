import Link from "next/link";
import PublicLayout from "@/components/layout/PublicLayout";

export const metadata = {
  title: "Условия использования — Zharnamarket",
  description: "Правила и условия использования платформы Zharnamarket",
};

export default function TermsPage() {
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
          Условия использования
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          Последнее обновление: апрель 2026
        </p>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              1. Общие положения
            </h2>
            <p>
              Zharnamarket — маркетплейс для прямого взаимодействия бизнеса и
              создателей контента (блогеров, инфлюенсеров) в Казахстане.
              Регистрируясь на платформе, вы соглашаетесь с настоящими
              условиями.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              2. Регистрация и аккаунт
            </h2>
            <p>
              Для использования платформы необходима регистрация. Вы несёте
              ответственность за сохранность данных своего аккаунта. Запрещено
              создавать аккаунты от чужого имени или с использованием заведомо
              ложных данных.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              3. Размещение объявлений
            </h2>
            <p>
              Объявления публикуются за отдельную плату согласно действующему
              тарифу. Платформа оставляет за собой право отказать в публикации
              или удалить объявление, нарушающее правила сервиса.
            </p>
            <p className="mt-2">
              Запрещено размещать рекламу товаров и услуг, нарушающих
              законодательство Республики Казахстан, а также контент, вводящий
              пользователей в заблуждение.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              4. Оплата
            </h2>
            <p>
              Все платежи производятся через платёжные системы Kaspi Pay, Halyk
              Bank или банковскую карту. Оплата публикации объявления не
              возвращается после его публикации.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              5. Ответственность сторон
            </h2>
            <p>
              Платформа выступает посредником и не несёт ответственности за
              качество или результат сотрудничества между бизнесом и создателями
              контента. Все договорённости и расчёты между сторонами происходят
              напрямую.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              6. Конфиденциальность
            </h2>
            <p>
              Мы не передаём ваши персональные данные третьим лицам без вашего
              согласия, кроме случаев, предусмотренных законодательством
              Республики Казахстан.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              7. Изменения условий
            </h2>
            <p>
              Платформа оставляет за собой право изменять настоящие условия.
              Продолжение использования сервиса после публикации изменений
              означает согласие с ними.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              8. Контакты
            </h2>
            <p>
              По вопросам, связанным с условиями использования, обращайтесь:
              <br />
              Email: support@zharnamarket.kz
            </p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-100 text-center">
          <Link
            href="/auth/register"
            className="text-sky-600 hover:underline text-sm"
          >
            Вернуться к регистрации →
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}
