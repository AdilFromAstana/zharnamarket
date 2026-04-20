"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Spin } from "antd";
import {
  CheckCircleFilled,
  RocketOutlined,
  ArrowRightOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import PublicLayout from "@/components/layout/PublicLayout";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import { api, ApiError } from "@/lib/api-client";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { mapCreatorFromApi } from "@/lib/mappers/creator";
import { cn, getAvatarGradient } from "@/lib/utils";
import { PLATFORM_COLORS } from "@/lib/constants";
import type { CreatorProfile, CreatorPlatform } from "@/lib/types/creator";

export default function CreatorPublishedPage() {
  const { isLoading: authLoading } = useRequireAuth();
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !id) return;
    api
      .get(`/api/creators/${id}`)
      .then((data) => setProfile(mapCreatorFromApi(data)))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          router.replace("/creators/manage");
        }
      })
      .finally(() => setLoading(false));
  }, [authLoading, id, router]);

  if (authLoading || loading) {
    return (
      <PublicLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Spin size="large" />
        </div>
      </PublicLayout>
    );
  }

  if (!profile) return null;

  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto py-6 sm:py-10">
        {/* Success header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mb-4">
            <CheckCircleFilled style={{ color: "#22c55e", fontSize: 36 }} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Профиль опубликован
          </h1>
          <p className="text-gray-500 text-sm sm:text-base">
            {profile.fullName}, ваша анкета теперь в каталоге креаторов
          </p>
        </div>

        {/* Profile preview card */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
          <div className="p-5">
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "w-16 h-16 shrink-0 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-2xl shadow-sm",
                  profile.avatarColor ?? getAvatarGradient(profile.fullName),
                )}
              >
                {profile.fullName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-gray-900 text-lg flex items-center gap-1.5 mb-1">
                  <span className="truncate">{profile.fullName}</span>
                  {profile.verified && <VerifiedBadge size={16} />}
                </div>
                <div className="text-xs text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full inline-flex items-center gap-1 mb-2">
                  {profile.title}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {profile.platforms.slice(0, 3).map((p: CreatorPlatform) => (
                    <div
                      key={p.name}
                      className="flex items-center gap-1 bg-gray-50 border border-gray-100 rounded-full px-2 py-0.5 text-xs text-gray-700"
                    >
                      <span
                        className="w-3.5 h-3.5 rounded flex items-center justify-center text-white text-[9px] font-bold"
                        style={{ background: PLATFORM_COLORS[p.name] }}
                      >
                        {p.name.charAt(0)}
                      </span>
                      <span>{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              от{" "}
              <span className="font-semibold text-gray-800">
                {profile.pricing.minimumRate.toLocaleString("ru-KZ")} ₸
              </span>
            </div>
            <Link
              href={`/creators/${profile.id}`}
              className="text-sky-600 text-sm hover:text-sky-700 inline-flex items-center gap-1"
            >
              <EyeOutlined /> Как видят другие
            </Link>
          </div>
        </div>

        {/* Boost CTA block */}
        <div className="rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-fuchsia-50 p-5 sm:p-6 mb-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 shrink-0 rounded-full bg-purple-600 flex items-center justify-center">
              <RocketOutlined className="text-white text-lg" />
            </div>
            <div>
              <div className="font-semibold text-gray-900 text-base sm:text-lg mb-0.5">
                Хотите больше просмотров?
              </div>
              <div className="text-gray-600 text-sm">
                Поднимите профиль в топ каталога — заказчики увидят вас первым
              </div>
            </div>
          </div>

          <ul className="space-y-1.5 mb-5 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <CheckCircleFilled
                className="mt-0.5 shrink-0"
                style={{ color: "#a855f7" }}
              />
              <span>Поднятие выше обычных профилей в каталоге</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircleFilled
                className="mt-0.5 shrink-0"
                style={{ color: "#a855f7" }}
              />
              <span>Цветной бейдж и выделение для привлечения внимания</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircleFilled
                className="mt-0.5 shrink-0"
                style={{ color: "#a855f7" }}
              />
              <span>Больше заявок от заказчиков за 7 дней</span>
            </li>
          </ul>

          <Link href={`/creators/${profile.id}/boost`}>
            <Button
              type="primary"
              size="large"
              icon={<RocketOutlined />}
              block
              style={{ background: "#7c3aed", borderColor: "#7c3aed" }}
            >
              Продвинуть в топ
            </Button>
          </Link>
        </div>

        {/* Secondary CTA */}
        <Link href="/creators/manage">
          <Button
            type="default"
            size="large"
            block
            icon={<ArrowRightOutlined />}
            iconPlacement="end"
          >
            В кабинет
          </Button>
        </Link>
      </div>
    </PublicLayout>
  );
}
