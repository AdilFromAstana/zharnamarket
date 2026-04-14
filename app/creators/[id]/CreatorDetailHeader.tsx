"use client";

import Link from "next/link";
import { Button, Breadcrumb, Dropdown } from "antd";
import {
  ArrowLeftOutlined,
  MoreOutlined,
  ShareAltOutlined,
  FlagOutlined,
} from "@ant-design/icons";
import { toast } from "sonner";

interface CreatorDetailHeaderProps {
  creatorName: string;
  onReportOpen: () => void;
}

export default function CreatorDetailHeader({
  creatorName,
  onReportOpen,
}: CreatorDetailHeaderProps) {
  const menuItems = [
    {
      key: "share",
      icon: <ShareAltOutlined />,
      label: "Скопировать ссылку",
      onClick: () => {
        navigator.clipboard.writeText(window.location.href);
        toast.success("Ссылка скопирована");
      },
    },
    {
      key: "report",
      label: "Пожаловаться",
      icon: <FlagOutlined />,
      danger: true,
      onClick: onReportOpen,
    },
  ];

  const dropdownButton = (
    <button
      type="button"
      className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400"
    >
      <MoreOutlined className="text-base" />
    </button>
  );

  return (
    <>
      {/* Mobile: back + menu */}
      <div className="flex items-center justify-between md:hidden">
        <Link href="/creators">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            size="small"
            className="-ml-1"
          >
            Назад к каталогу
          </Button>
        </Link>
        <Dropdown
          menu={{ items: menuItems }}
          trigger={["click"]}
          placement="bottomRight"
        >
          {dropdownButton}
        </Dropdown>
      </div>

      {/* Desktop: breadcrumb + menu */}
      <div className="hidden md:flex items-center justify-between">
        <Breadcrumb
          items={[
            { title: <Link href="/">Главная</Link> },
            { title: <Link href="/creators">Каталог</Link> },
            { title: creatorName },
          ]}
        />
        <Dropdown
          menu={{ items: menuItems }}
          trigger={["click"]}
          placement="bottomRight"
        >
          {dropdownButton}
        </Dropdown>
      </div>
    </>
  );
}
