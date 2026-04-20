import { NextResponse } from "next/server";
import { listMethods } from "@/lib/payment-providers";

/**
 * GET /api/payments/methods — список доступных способов оплаты.
 *
 * Возвращает массив PaymentMethodInfo. Если ни один провайдер не зарегистрирован,
 * массив пустой — фронт показывает «Способы оплаты временно недоступны».
 */
export async function GET() {
  return NextResponse.json({ methods: listMethods() });
}
