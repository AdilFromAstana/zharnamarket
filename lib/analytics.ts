import posthog from "posthog-js";

export type BoostPlacement =
  | "ads_manage_desktop_inline"
  | "ads_manage_mobile"
  | "creators_manage_desktop_inline"
  | "creators_manage_mobile";

export type ManageEntity = "ad" | "creator";

type EventMap = {
  boost_cta_click: {
    entity: ManageEntity;
    entity_id: string;
    placement: BoostPlacement;
    has_active_boost: boolean;
  };
  boost_checkout_view: {
    entity: ManageEntity;
    entity_id: string;
  };
  boost_purchase_success: {
    entity: ManageEntity;
    entity_id: string;
    boost_type: "rise" | "vip" | "premium";
    amount: number;
    method: "wallet" | "kaspi" | "halyk" | "card";
    is_free: boolean;
  };
  manage_filter_change: {
    entity: ManageEntity;
    filter: string;
  };
  manage_action_click: {
    entity: ManageEntity;
    entity_id: string;
    action: string;
  };
  republish_cta_click: {
    ad_id: string;
    placement: BoostPlacement;
    mode: "expired" | "active";
  };
  republish_modal_view: {
    ad_id: string;
    mode: "expired" | "active";
  };
  republish_success: {
    ad_id: string;
    mode: "expired" | "active";
    amount: number;
    method: "wallet" | "kaspi" | "halyk" | "card";
  };
};

export function track<E extends keyof EventMap>(
  event: E,
  props: EventMap[E],
): void {
  if (typeof window === "undefined") return;
  try {
    posthog.capture(event, props);
  } catch {
    /* no-op: posthog не инициализирован или отключён */
  }
}

export function identify(
  userId: string,
  traits?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  try {
    posthog.identify(userId, traits);
  } catch {
    /* no-op */
  }
}

export function reset(): void {
  if (typeof window === "undefined") return;
  try {
    posthog.reset();
  } catch {
    /* no-op */
  }
}
