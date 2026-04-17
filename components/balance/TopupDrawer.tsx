"use client";

import { useEffect, useState } from "react";
import { Drawer, Modal } from "antd";
import { WalletOutlined, CloseOutlined } from "@ant-design/icons";
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

  const title = (
    <div className="flex items-center gap-2">
      <WalletOutlined style={{ color: "#10b981" }} />
      <span className="font-semibold">Пополнить кошелёк</span>
    </div>
  );

  // Mobile — bottom drawer
  if (isMobile) {
    return (
      <Drawer
        open={open}
        onClose={onClose}
        placement="bottom"
        styles={{ wrapper: { height: "85vh", borderRadius: "16px 16px 0 0" } }}
        title={title}
        className="topup-drawer-mobile"
        destroyOnHidden
      >
        <TopupForm initialAmount={initialAmount} onSuccess={onClose} />
      </Drawer>
    );
  }

  // Desktop — centered modal
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={480}
      centered
      title={title}
      closeIcon={<CloseOutlined className="text-gray-400" />}
      destroyOnHidden
    >
      <TopupForm initialAmount={initialAmount} onSuccess={onClose} />
    </Modal>
  );
}
