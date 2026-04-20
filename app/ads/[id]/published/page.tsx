"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Spin, Tag } from "antd";
import {
  CheckCircleFilled,
  RocketOutlined,
  ArrowRightOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import PublicLayout from "@/components/layout/PublicLayout";
import { api, ApiError } from "@/lib/api-client";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { mapPrismaAdToAd } from "@/lib/mappers/ad";
import { formatBudgetPreview } from "@/lib/utils";
import { BUDGET_TYPE_COLORS, BUDGET_TYPE_LABELS } from "@/lib/constants";
import BudgetTypeIcon from "@/components/ui/BudgetTypeIcon";
import type { Ad } from "@/lib/types/ad";

export default function AdPublishedPage() {
  const { isLoading: authLoading } = useRequireAuth();
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [ad, setAd] = useState<Ad | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !id) return;
    api
      .get(`/api/tasks/${id}`)
      .then((data) => setAd(mapPrismaAdToAd(data)))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          router.replace("/ads/manage");
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

  if (!ad) return null;

  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto py-6 sm:py-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mb-4">
            <CheckCircleFilled style={{ color: "#22c55e", fontSize: 36 }} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Объявление опубликовано
          </h1>
          <p className="text-gray-500 text-sm sm:text-base">
            Креаторы уже могут его увидеть в каталоге
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
          <div className="p-5">
            <div className="font-semibold text-gray-900 text-base sm:text-lg mb-2 leading-snug">
              {ad.title}
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              <Tag className="m-0">{ad.platform}</Tag>
              <Tag className="m-0">{ad.city}</Tag>
              <Tag color={BUDGET_TYPE_COLORS[ad.budgetType]} className="m-0">
                <BudgetTypeIcon
                  type={ad.budgetType}
                  size={11}
                  className="shrink-0 inline mr-1"
                />
                {BUDGET_TYPE_LABELS[ad.budgetType]}
              </Tag>
            </div>
            <div className="text-sm font-semibold text-green-700">
              {formatBudgetPreview(
                ad.budgetType,
                ad.budgetFrom,
                ad.budgetTo,
                ad.budgetDetails,
              )}
            </div>
          </div>
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end">
            <Link
              href={`/ads/${ad.id}`}
              className="text-sky-600 text-sm hover:text-sky-700 inline-flex items-center gap-1"
            >
              <EyeOutlined /> Как видят креаторы
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-fuchsia-50 p-5 sm:p-6 mb-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 shrink-0 rounded-full bg-purple-600 flex items-center justify-center">
              <RocketOutlined className="text-white text-lg" />
            </div>
            <div>
              <div className="font-semibold text-gray-900 text-base sm:text-lg mb-0.5">
                Хотите больше откликов?
              </div>
              <div className="text-gray-600 text-sm">
                Поднимите объявление в топ ленты — креаторы увидят его первым
              </div>
            </div>
          </div>

          <ul className="space-y-1.5 mb-5 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <CheckCircleFilled
                className="mt-0.5 shrink-0"
                style={{ color: "#a855f7" }}
              />
              <span>Поднятие выше обычных объявлений</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircleFilled
                className="mt-0.5 shrink-0"
                style={{ color: "#a855f7" }}
              />
              <span>Цветной бейдж и выделение для внимания</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircleFilled
                className="mt-0.5 shrink-0"
                style={{ color: "#a855f7" }}
              />
              <span>Больше заявок от креаторов за 7 дней</span>
            </li>
          </ul>

          <Link href={`/ads/${ad.id}/boost`}>
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

        <Link href="/ads/manage">
          <Button
            type="default"
            size="large"
            block
            icon={<ArrowRightOutlined />}
            iconPlacement="end"
          >
            К моим объявлениям
          </Button>
        </Link>
      </div>
    </PublicLayout>
  );
}
