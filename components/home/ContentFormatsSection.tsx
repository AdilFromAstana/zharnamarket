import SectionHeading from "./SectionHeading";
import FormatChip from "./FormatChip";
import type { VideoFormatCard } from "@/lib/home/types";

interface ContentFormatsSectionProps {
  formats: VideoFormatCard[];
}

export default function ContentFormatsSection({
  formats,
}: ContentFormatsSectionProps) {
  if (formats.length === 0) return null;

  return (
    <section className="mb-10 md:mb-16">
      <SectionHeading
        eyebrow="Что снимают авторы"
        title="Форматы видеоконтента"
        subtitle="UGC, обзоры, хуки, скетчи, туториалы и другие форматы — под любую задачу бизнеса."
        align="center"
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {formats.map((format) => (
          <FormatChip key={format.key} format={format} />
        ))}
      </div>
    </section>
  );
}
