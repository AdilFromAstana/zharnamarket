"use client";

import { Button } from "antd";
import PublicLayout from "@/components/layout/PublicLayout";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PublicLayout>
      <div className="text-center py-24">
        <div className="text-8xl font-bold text-gray-100 mb-4">500</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Что-то пошло не так
        </h1>
        <p className="text-gray-500 mb-8 max-w-sm mx-auto">
          Произошла ошибка при загрузке страницы. Попробуйте ещё раз
        </p>
        <div className="flex items-center justify-center gap-4">
          <Button
            type="primary"
            size="large"
            onClick={reset}
            style={{ background: "#0EA5E9", borderColor: "#0EA5E9" }}
          >
            Попробовать снова
          </Button>
        </div>
      </div>
    </PublicLayout>
  );
}
