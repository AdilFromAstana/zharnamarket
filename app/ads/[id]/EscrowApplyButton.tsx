import Link from "next/link";
import { Button, Spin } from "antd";
import { ThunderboltOutlined, TeamOutlined } from "@ant-design/icons";
import type { TaskApplication } from "@/lib/types/submission";

interface EscrowApplyButtonProps {
  adId: string;
  application: TaskApplication | null;
  loading: boolean;
  applying: boolean;
  isLoggedIn: boolean;
  isOwner: boolean;
  onApply: () => void;
}

export default function EscrowApplyButton({
  adId,
  application,
  loading,
  applying,
  isLoggedIn,
  isOwner,
  onApply,
}: EscrowApplyButtonProps) {
  if (isOwner) {
    return (
      <Link href={`/ads/${adId}/applications`}>
        <Button icon={<TeamOutlined />}>Просмотреть заявки</Button>
      </Link>
    );
  }

  if (!isLoggedIn) {
    return (
      <Link href="/auth/login">
        <Button type="primary" size="large" icon={<ThunderboltOutlined />}>
          Войти для отклика
        </Button>
      </Link>
    );
  }

  if (loading) return <Spin size="small" />;

  if (!application) {
    return (
      <Button
        type="primary"
        size="large"
        icon={<ThunderboltOutlined />}
        onClick={onApply}
        loading={applying}
        className="bg-emerald-500 hover:bg-emerald-600 border-emerald-500"
      >
        Откликнуться
      </Button>
    );
  }

  const statusLabels: Record<string, string> = {
    pending_video: "Прикрепите ссылку на видео",
    pending_review: "Ожидает проверки заказчиком",
    content_approved: "Видео одобрено — подайте статистику",
    content_rejected: "Видео отклонено",
    video_timed_out: "Время истекло",
  };

  return (
    <span className="text-sm text-gray-500 font-medium">
      {statusLabels[application.contentStatus] ?? application.contentStatus}
    </span>
  );
}
