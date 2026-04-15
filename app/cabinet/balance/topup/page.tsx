"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import TopupForm from "@/components/balance/TopupForm";

export default function TopupPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto py-8 px-4" />}>
      <TopupContent />
    </Suspense>
  );
}

function TopupContent() {
  useRequireAuth();
  const searchParams = useSearchParams();
  const prefilledAmount = Number(searchParams.get("amount")) || null;

  return (
    <div className="max-w-md mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/cabinet/balance">
          <button
            type="button"
            className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
          >
            <ArrowLeftOutlined />
          </button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Пополнить кошелёк</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Средства зачислятся сразу после оплаты
          </p>
        </div>
      </div>

      <TopupForm initialAmount={prefilledAmount} />
    </div>
  );
}
