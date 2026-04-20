import SectionHeading from "./SectionHeading";
import PricingRow from "./PricingRow";
import {
  BOOST_OPTIONS,
  PUBLICATION_DAYS,
  PUBLICATION_PRICE,
} from "@/lib/constants";

export default function PricingSection() {
  return (
    <section className="mb-10 md:mb-16">
      <SectionHeading
        eyebrow="Честные цены"
        title="Сколько это стоит"
        subtitle="Платите только за публикацию и опциональные бусты. Комиссии со сделки — нет."
        align="center"
      />

      <div className="bg-white rounded-3xl border border-gray-100 p-4 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 max-w-3xl mx-auto">
          <PricingRow
            title="Объявление для бизнеса"
            price={`${PUBLICATION_PRICE.toLocaleString("ru-RU")} ₸`}
            subtitle={`Публикация активна ${PUBLICATION_DAYS} дней`}
            features={[
              "Прямые отклики от авторов",
              "Фильтры по городу и платформе",
              "Без комиссии со сделки",
            ]}
            size="lg"
          />
          <PricingRow
            title="Профиль креатора"
            price="Бесплатно"
            subtitle="Публикация без срока истечения"
            features={[
              "Портфолио и прайс-лист",
              "Прямые заявки от бизнеса",
              "Без комиссии с заказов",
            ]}
            size="lg"
          />
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="text-sm font-semibold text-gray-700 mb-3 text-center">
            Опциональные бусты — повышают видимость в ленте
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {BOOST_OPTIONS.map((option) => (
              <PricingRow
                key={option.id}
                title={option.name}
                price={`${option.price.toLocaleString("ru-RU")} ₸`}
                subtitle={`${option.days} дней · ${option.description}`}
                features={option.features}
                badge={option.highlight ? "Хит" : undefined}
                featured={option.highlight}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
