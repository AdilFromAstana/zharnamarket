"use client";

import { Collapse } from "antd";
import type { FaqItem } from "@/lib/seo/faq";

interface FaqAccordionProps {
  items: FaqItem[];
  defaultOpenKeys?: string[];
}

export default function FaqAccordion({
  items,
  defaultOpenKeys,
}: FaqAccordionProps) {
  return (
    <Collapse
      ghost
      bordered={false}
      defaultActiveKey={defaultOpenKeys}
      items={items.map((item, idx) => ({
        key: String(idx),
        label: (
          <span className="text-base font-semibold text-gray-900">
            {item.question}
          </span>
        ),
        children: (
          <p className="text-sm text-gray-600 leading-relaxed">{item.answer}</p>
        ),
      }))}
    />
  );
}
