import {
  BulbOutlined,
  DollarOutlined,
  CheckOutlined,
  EditOutlined,
  EnvironmentOutlined,
  AppstoreOutlined,
  TagsOutlined,
  SendOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";

interface ProfileTipsSidebarProps {
  title?: string;
  city?: string;
  platforms?: string[];
  categories?: string[];
  telegram?: string;
  priceItemsCount: number;
}

export default function ProfileTipsSidebar({
  title,
  city,
  platforms,
  categories,
  telegram,
  priceItemsCount,
}: ProfileTipsSidebarProps) {
  const checklist: { label: string; ok: boolean; icon: React.ReactNode }[] = [
    {
      label: "Название профиля",
      ok: !!title && title.trim().length >= 5,
      icon: <EditOutlined />,
    },
    { label: "Город", ok: !!city, icon: <EnvironmentOutlined /> },
    {
      label: "Платформы",
      ok: !!platforms && platforms.length > 0,
      icon: <AppstoreOutlined />,
    },
    {
      label: "Категории контента",
      ok: !!categories && categories.length > 0,
      icon: <TagsOutlined />,
    },
    {
      label: "Telegram",
      ok: !!telegram && telegram.trim().length > 0,
      icon: <SendOutlined />,
    },
    {
      label: "Прайс-лист (хотя бы 1 формат)",
      ok: priceItemsCount > 0,
      icon: <UnorderedListOutlined />,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-sky-50 border border-sky-200 rounded-2xl p-5">
        <h3 className="font-semibold text-sky-900 mb-3 flex items-center gap-2">
          <BulbOutlined className="text-sky-500" /> Как назвать профиль
        </h3>
        <p className="text-sm text-sky-800 mb-3">
          Дайте конкретное название специализации — заказчик быстрее поймёт, что
          вы умеете.
        </p>
        <ul className="space-y-1.5 text-sm text-sky-800">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-sky-400">•</span>
            «Мастер нарезок для TikTok»
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-sky-400">•</span>
            «Обзорщик еды и кафе»
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-sky-400">•</span>
            «АСМР-контент и залипалки»
          </li>
        </ul>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
          <DollarOutlined className="text-amber-500" /> Прайс-лист
        </h3>
        <p className="text-sm text-amber-800 mb-3">
          Укажите цены по каждому типу рекламы — заказчик сразу поймёт, сколько
          стоит интеграция, баннер или хук.
        </p>
        <ul className="space-y-1.5 text-sm text-amber-800">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-amber-500">•</span>
            Разделяйте цены по платформам, если они отличаются
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-amber-500">•</span>
            Минимальная цена из списка попадёт в карточку каталога
          </li>
        </ul>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <CheckOutlined className="text-green-500" /> Чеклист заполнения
        </h3>
        <ul className="space-y-2 text-sm">
          {checklist.map(({ label, ok, icon }) => (
            <li key={label} className="flex items-center gap-2">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${ok ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}
              >
                {ok ? (
                  <CheckOutlined style={{ fontSize: 10 }} />
                ) : (
                  <span className="text-[10px]">{icon}</span>
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
