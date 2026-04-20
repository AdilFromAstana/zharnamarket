"use client";

import { CREATOR_BOOST_OPTIONS } from "@/lib/constants";
import { api } from "@/lib/api-client";
import { mapCreatorFromApi } from "@/lib/mappers/creator";
import BoostCheckoutPage, {
  type BoostCheckoutConfig,
} from "@/components/boost/BoostCheckoutPage";

const config: BoostCheckoutConfig = {
  entity: "creator",
  boostOptions: CREATOR_BOOST_OPTIONS,
  fetchEntity: async (id) => {
    const data = await api.get(`/api/creators/${id}`);
    const profile = mapCreatorFromApi(data);
    return { activeBoostDetails: profile.activeBoostDetails };
  },
  paymentEndpoint: (id) => `/api/payments/creators/${id}/boost`,
  promoType: "creator_boost",
  returnUrl: "/creators/manage",
  labels: {
    pageTitle: "Продвижение профиля",
    pageSubtitle:
      "Выберите опцию для увеличения видимости. Продвижение начнёт действовать сразу после оплаты.",
    breadcrumbParent: { label: "Мои профили", href: "/creators/manage" },
    breadcrumbCurrent: "Продвижение профиля",
    safetyDescription:
      "Продвижение начнёт действовать сразу после подтверждения оплаты. Профиль поднимется в каталоге в течение нескольких минут.",
  },
};

export default function CreatorBoostPage() {
  return <BoostCheckoutPage config={config} />;
}
