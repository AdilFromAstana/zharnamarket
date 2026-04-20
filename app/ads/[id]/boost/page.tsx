"use client";

import { BOOST_OPTIONS } from "@/lib/constants";
import { api } from "@/lib/api-client";
import { mapPrismaAdToAd } from "@/lib/mappers/ad";
import BoostCheckoutPage, {
  type BoostCheckoutConfig,
} from "@/components/boost/BoostCheckoutPage";

const config: BoostCheckoutConfig = {
  entity: "ad",
  boostOptions: BOOST_OPTIONS,
  fetchEntity: async (id) => {
    const data = await api.get(`/api/tasks/${id}`);
    const ad = mapPrismaAdToAd(data);
    return { activeBoostDetails: ad.activeBoostDetails };
  },
  paymentEndpoint: (id) => `/api/payments/ads/${id}/boost`,
  promoType: "ad_boost",
  returnUrl: "/ads/manage",
  labels: {
    pageTitle: "Продвижение объявления",
    pageSubtitle:
      "Выберите опцию для увеличения видимости. Продвижение начнёт действовать сразу после оплаты.",
    breadcrumbParent: { label: "Мои объявления", href: "/ads/manage" },
    breadcrumbCurrent: "Продвижение объявления",
    safetyDescription:
      "Продвижение начнёт действовать сразу после подтверждения оплаты. Объявление поднимется в ленте в течение нескольких минут.",
  },
};

export default function BoostPage() {
  return <BoostCheckoutPage config={config} />;
}
