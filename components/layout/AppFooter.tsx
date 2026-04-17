import Link from "next/link";

export default function AppFooter() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs">
                Z
              </div>
              <span className="font-semibold text-gray-900">Zharnamarket</span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              Маркетплейс для бизнеса и креаторов в&nbsp;Казахстане
            </p>
          </div>

          {/* Platform */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Платформа
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/ads"
                  className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Задания
                </Link>
              </li>
              <li>
                <Link
                  href="/creators"
                  className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Креаторы
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  О сервисе
                </Link>
              </li>
            </ul>
          </div>

          {/* Help */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Помощь
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/faq"
                  className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Частые вопросы
                </Link>
              </li>
              <li>
                <Link
                  href="/contacts"
                  className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Контакты
                </Link>
              </li>
              <li>
                <a
                  href="mailto:support@zharnamarket.kz"
                  className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  support@zharnamarket.kz
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Юридическая информация
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Условия использования
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Политика конфиденциальности
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} Zharnamarket. Все права защищены.
          </p>
          {/* Social links — uncomment when ready */}
          {/* <div className="flex items-center gap-4">
            <a href="https://instagram.com/zharnamarket" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600 transition-colors">
              Instagram
            </a>
            <a href="https://t.me/zharnamarket" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600 transition-colors">
              Telegram
            </a>
          </div> */}
        </div>
      </div>
    </footer>
  );
}
