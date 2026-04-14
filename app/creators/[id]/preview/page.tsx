"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Alert, Spin, Button } from "antd";
import { ArrowLeftOutlined, EditOutlined } from "@ant-design/icons";
import Link from "next/link";
import PublicLayout from "@/components/layout/PublicLayout";
import CreatorDetailClient from "../CreatorDetailClient";
import { mapCreatorFromApi } from "@/lib/mappers/creator";
import { api } from "@/lib/api-client";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import type { CreatorProfile } from "@/lib/types/creator";

export default function CreatorPreviewPage() {
  useRequireAuth();

  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    api
      .get(`/api/creators/${id}/preview`)
      .then((data) => {
        setCreator(mapCreatorFromApi(data));
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Профиль не найден или нет доступа");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <PublicLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Spin size="large" />
        </div>
      </PublicLayout>
    );
  }

  if (error || !creator) {
    return (
      <PublicLayout>
        <div className="max-w-md mx-auto py-20 text-center">
          <p className="text-gray-500 mb-4">{error ?? "Профиль не найден"}</p>
          <Button onClick={() => router.push("/creators/manage")}>
            <ArrowLeftOutlined /> К моим профилям
          </Button>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-5xl mx-auto">
        {/* Preview banner */}
        <Alert
          type="warning"
          showIcon
          className="mb-4 rounded-xl"
          message="Предварительный просмотр"
          description={
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span>Этот профиль ещё не опубликован. Так он будет выглядеть для других пользователей.</span>
              <Link href={`/creators/edit?id=${id}`}>
                <Button size="small" icon={<EditOutlined />}>
                  Редактировать
                </Button>
              </Link>
            </div>
          }
        />
      </div>

      <CreatorDetailClient creator={creator} isPreview />
    </PublicLayout>
  );
}
