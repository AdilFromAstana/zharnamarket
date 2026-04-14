import Link from "next/link";
import {
  HourglassOutlined,
  CloseCircleOutlined,
  CheckOutlined,
  FileImageOutlined,
} from "@ant-design/icons";
import type { TaskApplication } from "@/lib/types/submission";

interface EscrowMobileCTAStatusProps {
  application: TaskApplication;
  adId: string;
}

export default function EscrowMobileCTAStatus({
  application,
  adId,
}: EscrowMobileCTAStatusProps) {
  const statusConfig: Record<
    string,
    { icon: React.ReactNode; label: string; color: string }
  > = {
    pending_video: {
      icon: <HourglassOutlined />,
      label: "Прикрепите ссылку на видео",
      color: "bg-amber-50 text-amber-700 border-amber-200",
    },
    video_timed_out: {
      icon: <CloseCircleOutlined />,
      label: "Время истекло — подайте снова",
      color: "bg-red-50 text-red-600 border-red-200",
    },
    pending_review: {
      icon: <HourglassOutlined />,
      label: "Видео на проверке у заказчика",
      color: "bg-blue-50 text-blue-700 border-blue-200",
    },
    content_rejected: {
      icon: <CloseCircleOutlined />,
      label: "Видео отклонено — подайте снова",
      color: "bg-red-50 text-red-600 border-red-200",
    },
    content_approved: {
      icon: <CheckOutlined />,
      label: "Видео одобрено — подайте статистику",
      color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
  };

  const config = statusConfig[application.contentStatus];
  if (!config) return null;

  if (
    application.contentStatus === "content_approved" &&
    !application.submission
  ) {
    return (
      <Link href={`/tasks/${adId}/submit`} className="block">
        <div className="flex items-center gap-2 bg-emerald-500 text-white font-semibold py-4 px-4 rounded-2xl justify-center">
          <FileImageOutlined className="text-lg" />
          Подать статистику
        </div>
      </Link>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 py-3 px-4 rounded-2xl border font-medium text-sm ${config.color}`}
    >
      {config.icon}
      <span>{config.label}</span>
    </div>
  );
}
