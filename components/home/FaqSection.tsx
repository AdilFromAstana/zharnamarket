import SectionHeading from "./SectionHeading";
import FaqAccordion from "./FaqAccordion";
import type { FaqItem } from "@/lib/seo/faq";

interface FaqSectionProps {
  items: FaqItem[];
}

export default function FaqSection({ items }: FaqSectionProps) {
  if (items.length === 0) return null;

  return (
    <section className="mb-10 md:mb-16 max-w-3xl mx-auto">
      <SectionHeading
        eyebrow="Вопросы и ответы"
        title="Частые вопросы"
        align="center"
      />
      <div className="bg-white rounded-3xl border border-gray-100 p-4 md:p-6">
        <FaqAccordion items={items} defaultOpenKeys={["0"]} />
      </div>
    </section>
  );
}
