import type { ListingSeoContent } from "@/lib/seo/listing-intro";

interface Props {
  content: ListingSeoContent;
}

export default function ListingSeoText({ content }: Props) {
  return (
    <section
      className="mt-12 border-t border-gray-200 pt-10"
      aria-label="О каталоге"
    >
      <div className="max-w-3xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          {content.title}
        </h2>
        <div className="space-y-8">
          {content.sections.map((section, i) => (
            <div key={i}>
              {section.heading && (
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {section.heading}
                </h3>
              )}
              {section.paragraphs?.map((p, pi) => (
                <p
                  key={pi}
                  className="text-gray-700 leading-relaxed mb-3 last:mb-0"
                >
                  {p}
                </p>
              ))}
              {section.list && (
                <ul className="list-disc pl-5 space-y-1.5 text-gray-700">
                  {section.list.map((item, li) => (
                    <li key={li} className="leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
