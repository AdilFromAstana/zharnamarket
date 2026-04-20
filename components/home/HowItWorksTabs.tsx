"use client";

import { Tabs } from "antd";
import type { ReactNode } from "react";

interface HowItWorksTabsProps {
  businessContent: ReactNode;
  creatorContent: ReactNode;
}

export default function HowItWorksTabs({
  businessContent,
  creatorContent,
}: HowItWorksTabsProps) {
  return (
    <Tabs
      size="large"
      defaultActiveKey="business"
      items={[
        {
          key: "business",
          label: "Я бизнес",
          children: businessContent,
        },
        {
          key: "creator",
          label: "Я создаю контент",
          children: creatorContent,
        },
      ]}
    />
  );
}
