"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, InputNumber, Button, Upload, Alert, Spin } from "antd";
import { UploadOutlined, SendOutlined } from "@ant-design/icons";
import { toast } from "sonner";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { api, ApiError } from "@/lib/api-client";
import { PLATFORM_COMMISSION_RATE } from "@/lib/constants";

export default function SubmitVideoPage() {
  useRequireAuth();
  const params = useParams();
  const router = useRouter();
  const adId = params.id as string;

  const [videoUrl, setVideoUrl] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [claimedViews, setClaimedViews] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);

  // Preview calculation (frontend-only, approximate)
  const rpm = 150; // will be fetched from task data in full impl
  const grossAmount = claimedViews ? (claimedViews / 1000) * rpm : 0;
  const commission = grossAmount * PLATFORM_COMMISSION_RATE;
  const payout = grossAmount - commission;

  const handleScreenshotUpload = async (file: File) => {
    setUploadingScreenshot(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "screenshot");
      const res = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error("Upload failed");
      const result = await res.json() as { url: string };
      setScreenshotUrl(result.url);
      toast.success("Скриншот загружен");
    } catch {
      toast.error("Ошибка загрузки скриншота");
    } finally {
      setUploadingScreenshot(false);
    }
    return false; // prevent antd auto upload
  };

  const handleSubmit = async () => {
    if (!videoUrl.trim()) return toast.error("Укажите ссылку на видео");
    if (!screenshotUrl) return toast.error("Загрузите скриншот статистики");
    if (!claimedViews || claimedViews < 1) return toast.error("Укажите количество просмотров");

    setLoading(true);
    try {
      await api.post(`/api/tasks/${adId}/submissions`, {
        videoUrl: videoUrl.trim(),
        screenshotUrl,
        claimedViews,
      });
      toast.success("Видео отправлено на проверку!", {
        description: "Модератор рассмотрит заявку в течение 24 часов.",
      });
      router.push("/ads/manage");
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error("Ошибка подачи видео");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto py-8 px-4">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Подача видео на проверку</h1>

      <div className="space-y-4">
        {/* Video URL */}
        <Card size="small">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ссылка на видео
          </label>
          <input
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://www.tiktok.com/@user/video/..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-400"
          />
          <p className="text-xs text-gray-400 mt-1">
            Прямая ссылка на TikTok, YouTube Shorts или Instagram Reels
          </p>
        </Card>

        {/* Screenshot */}
        <Card size="small">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Скриншот статистики
          </label>
          {screenshotUrl ? (
            <div className="space-y-2">
              <img
                src={screenshotUrl}
                alt="Скриншот"
                className="w-full rounded-lg border border-gray-200"
              />
              <button
                type="button"
                onClick={() => setScreenshotUrl("")}
                className="text-xs text-red-500 hover:underline"
              >
                Удалить и загрузить другой
              </button>
            </div>
          ) : (
            <Upload
              accept="image/jpeg,image/png"
              showUploadList={false}
              beforeUpload={handleScreenshotUpload}
              disabled={uploadingScreenshot}
            >
              <Button icon={uploadingScreenshot ? <Spin size="small" /> : <UploadOutlined />} disabled={uploadingScreenshot}>
                {uploadingScreenshot ? "Загрузка..." : "Загрузить скриншот"}
              </Button>
            </Upload>
          )}
          <p className="text-xs text-gray-400 mt-1">
            Скриншот экрана аналитики с видимыми просмотрами, датой и названием
          </p>
        </Card>

        {/* Views count */}
        <Card size="small">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Количество просмотров (из скриншота)
          </label>
          <InputNumber
            value={claimedViews}
            onChange={(v) => setClaimedViews(v)}
            min={1}
            placeholder="100 000"
            style={{ width: "100%" }}
            formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
            parser={(v) => (v ? parseFloat(v.replace(/,/g, "")) : 0) as unknown as 0}
          />
        </Card>

        {/* Payout preview */}
        {claimedViews && claimedViews > 0 && (
          <Card size="small" className="bg-green-50 border-green-200">
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">{claimedViews.toLocaleString("ru")} просмотров</span>
                <span className="font-medium">{grossAmount.toLocaleString("ru")} ₸</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Комиссия платформы ({PLATFORM_COMMISSION_RATE * 100}%)</span>
                <span>−{commission.toLocaleString("ru")} ₸</span>
              </div>
              <div className="flex justify-between font-bold text-green-700 border-t border-green-200 pt-1 mt-1">
                <span>Вы получите</span>
                <span>{payout.toLocaleString("ru")} ₸</span>
              </div>
            </div>
          </Card>
        )}

        <Alert
          type="info"
          showIcon
          message="Не удаляйте видео после подачи. Модератор проверит ссылку и скриншот в течение 24 часов."
        />

        <Button
          type="primary"
          size="large"
          block
          icon={<SendOutlined />}
          loading={loading}
          onClick={handleSubmit}
          disabled={!videoUrl || !screenshotUrl || !claimedViews}
        >
          Отправить на проверку
        </Button>
      </div>
    </div>
  );
}
