"use client";

import Link from "next/link";
import { Button, Dropdown } from "antd";
import {
  CheckCircleFilled,
  DeleteOutlined,
  EditOutlined,
  EllipsisOutlined,
  EyeOutlined,
  RocketOutlined,
} from "@ant-design/icons";
import type { CreatorProfile } from "@/lib/types/creator";
import { track } from "@/lib/analytics";

type Props = {
  profile: CreatorProfile;
  onPublish: (id: string) => void;
  onUnpublish: (id: string) => void;
  onDelete: (id: string) => void;
};

export default function ProfileRowActions({
  profile,
  onPublish,
  onUnpublish,
  onDelete,
}: Props) {
  const hasActiveBoost = (profile.activeBoostDetails ?? []).length > 0;

  const menuItems = [
    {
      key: "view",
      icon: <EyeOutlined />,
      label: profile.isPublished ? (
        <Link href={`/creators/${profile.id}`}>Просмотр</Link>
      ) : (
        <Link href={`/creators/${profile.id}/preview`}>Предпросмотр</Link>
      ),
    },
    {
      key: "edit",
      icon: <EditOutlined />,
      label: (
        <Link href={`/creators/edit?id=${profile.id}`}>Редактировать</Link>
      ),
    },
    { type: "divider" as const },
    ...(profile.isPublished
      ? [
          {
            key: "unpublish",
            icon: <EyeOutlined />,
            label: "Снять с публикации",
            onClick: () => onUnpublish(profile.id),
          },
        ]
      : [
          {
            key: "publish",
            icon: <CheckCircleFilled />,
            label: "Опубликовать",
            onClick: () => onPublish(profile.id),
          },
        ]),
    { type: "divider" as const },
    {
      key: "delete",
      icon: <DeleteOutlined />,
      label: "Удалить",
      danger: true,
      onClick: () => onDelete(profile.id),
    },
  ];

  return (
    <div className="flex items-center gap-2 justify-end">
      {profile.isPublished ? (
        <Link
          href={`/creators/${profile.id}/boost`}
          onClick={() =>
            track("boost_cta_click", {
              entity: "creator",
              entity_id: profile.id,
              placement: "creators_manage_desktop_inline",
              has_active_boost: hasActiveBoost,
            })
          }
        >
          <Button
            type="primary"
            size="small"
            icon={<RocketOutlined />}
            style={{
              background: hasActiveBoost ? "#fff" : "#7c3aed",
              borderColor: "#7c3aed",
              color: hasActiveBoost ? "#7c3aed" : "#fff",
            }}
          >
            {hasActiveBoost ? "Продлить" : "Продвинуть"}
          </Button>
        </Link>
      ) : (
        <Button
          type="primary"
          size="small"
          icon={<CheckCircleFilled />}
          onClick={() => onPublish(profile.id)}
          style={{ background: "#0EA5E9", borderColor: "#0EA5E9" }}
        >
          Опубликовать
        </Button>
      )}
      <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
        <Button type="text" icon={<EllipsisOutlined />} />
      </Dropdown>
    </div>
  );
}
