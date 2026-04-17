"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function TopupRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const amount = searchParams.get("amount");

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("topup", "true");
    if (amount) params.set("amount", amount);
    router.replace(`/cabinet/balance?${params.toString()}`);
  }, [router, amount]);

  return null;
}

export default function TopupPage() {
  return (
    <Suspense fallback={null}>
      <TopupRedirect />
    </Suspense>
  );
}
