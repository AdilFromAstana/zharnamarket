"use client";

import { useEffect, useState } from "react";
import { Drawer } from "antd";
import { WalletOutlined } from "@ant-design/icons";
import TopupForm from "./TopupForm";

interface TopupDrawerProps {
  open: boolean;
  onClose: () => void;
  initialAmount?: number | null;
}

export default function TopupDrawer({
  open,
  onClose,
  initialAmount,
}: TopupDrawerProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement={isMobile ? "bottom" : "right"}
      size={isMobile ? "large" : "default"}
      styles={isMobile ? { wrapper: { height: "92vh" } } : undefined}
      title={
        <div className="flex items-center gap-2">
          <WalletOutlined style={{ color: "#10b981" }} />
          <span className="font-semibold">Пополнить кошелёк</span>
        </div>
      }
      className={isMobile ? "topup-drawer-mobile" : undefined}
      destroyOnClose
    >
      <TopupForm initialAmount={initialAmount} onSuccess={onClose} />
    </Drawer>
  );
}
