"use client";

// Обратная совместимость — ContactButton использует GlassButton
import GlassButton from "./GlassButton";
import { MessageOutlined } from "@ant-design/icons";

interface ContactButtonProps {
  onClick: () => void;
  block?: boolean;
  label?: string;
}

export default function ContactButton({
  onClick,
  block = false,
  label = "Связаться",
}: ContactButtonProps) {
  return (
    <GlassButton
      onClick={onClick}
      block={block}
      label={label}
      icon={<MessageOutlined />}
    />
  );
}
