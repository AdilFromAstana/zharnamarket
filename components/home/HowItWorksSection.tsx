import { createElement } from "react";
import SectionHeading from "./SectionHeading";
import HowItWorksTabs from "./HowItWorksTabs";
import {
  HOW_IT_WORKS_BUSINESS,
  HOW_IT_WORKS_CREATOR,
} from "@/lib/home/home-content";
import type { HowItWorksStep } from "@/lib/home/types";

function StepList({ steps }: { steps: HowItWorksStep[] }) {
  return (
    <ol className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
      {steps.map((step, idx) => (
        <li
          key={step.title}
          className="flex gap-4 bg-white rounded-2xl border border-gray-100 p-4"
        >
          <div className="shrink-0 flex items-start gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-50 text-sky-600 font-bold text-sm">
              {idx + 1}
            </div>
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-50 text-gray-700">
              {createElement(step.icon, {
                className: "w-5 h-5",
                "aria-hidden": true,
              })}
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900 mb-1">
              {step.title}
            </div>
            <div className="text-xs text-gray-600 leading-relaxed">
              {step.description}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function HowItWorksSection() {
  return (
    <section className="mb-10 md:mb-16">
      <SectionHeading
        eyebrow="Как это работает"
        title="Два пути — один маркетплейс"
        subtitle="Выберите свою сторону и пройдите 4 шага."
        align="center"
      />
      <div className="bg-white rounded-3xl border border-gray-100 p-4 md:p-6">
        <HowItWorksTabs
          businessContent={<StepList steps={HOW_IT_WORKS_BUSINESS} />}
          creatorContent={<StepList steps={HOW_IT_WORKS_CREATOR} />}
        />
      </div>
    </section>
  );
}
