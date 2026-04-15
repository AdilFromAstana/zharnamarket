"use client";

import { Modal, Button } from "antd";
import {
  WhatsAppOutlined,
  PhoneOutlined,
  MailOutlined,
  CopyOutlined,
  PhoneFilled,
  MailFilled,
} from "@ant-design/icons";
import { toast } from "sonner";
import type { AdContacts } from "@/lib/types/ad";
import { getTelegramUrl, getWhatsappUrl } from "@/lib/utils";

interface ContactModalProps {
  open: boolean;
  onClose: () => void;
  contacts: AdContacts;
  businessName?: string;
}

// SVG иконка Telegram (официальный стиль)
function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

export default function ContactModal({
  open,
  onClose,
  contacts,
  businessName,
}: ContactModalProps) {
  const hasTelegram = !!contacts.telegram;
  const hasWhatsapp = !!contacts.whatsapp;
  const hasPhone = !!contacts.phone;
  const hasEmail = !!contacts.email;
  const hasSecondary = hasPhone || hasEmail;
  const hasAnyContact = hasTelegram || hasWhatsapp || hasPhone || hasEmail;

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} скопировано`);
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <div>
          <div className="text-base font-semibold">Связаться</div>
          {businessName && (
            <div className="text-sm font-normal text-gray-400 mt-0.5">
              {businessName}
            </div>
          )}
        </div>
      }
      footer={null}
      width={400}
    >
      <div className="space-y-2 mt-4">
        {!hasAnyContact && (
          <div className="py-8 text-center text-gray-400">
            <PhoneOutlined className="text-3xl mb-3 block" />
            <p className="text-sm">Контакты не указаны</p>
          </div>
        )}

        {/* Primary каналы: Telegram + WhatsApp — крупные и заметные */}
        {hasTelegram && (
          <div className="flex items-center justify-between p-4 rounded-xl border-2 border-blue-100 bg-blue-50 hover:border-blue-300 hover:bg-blue-100 transition-colors">
            <a
              href={getTelegramUrl(contacts.telegram!)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 flex-1 min-w-0"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
                <TelegramIcon className="text-white w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-blue-800 text-sm">
                  Telegram
                </div>
                <div className="text-xs text-blue-600 truncate">
                  {contacts.telegram}
                </div>
              </div>
            </a>
            <Button
              type="text"
              icon={<CopyOutlined />}
              size="small"
              onClick={() => copy(contacts.telegram!, "Telegram")}
              className="text-blue-400 shrink-0 ml-2"
              title="Скопировать"
            />
          </div>
        )}

        {hasWhatsapp && (
          <div className="flex items-center justify-between p-4 rounded-xl border-2 border-green-100 bg-green-50 hover:border-green-300 hover:bg-green-100 transition-colors">
            <a
              href={getWhatsappUrl(contacts.whatsapp!)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 flex-1 min-w-0"
            >
              <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center shrink-0">
                <WhatsAppOutlined className="text-white text-base" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-green-800 text-sm">
                  WhatsApp
                </div>
                <div className="text-xs text-green-600 truncate">
                  {contacts.whatsapp}
                </div>
              </div>
            </a>
            <Button
              type="text"
              icon={<CopyOutlined />}
              size="small"
              onClick={() => copy(contacts.whatsapp!, "WhatsApp")}
              className="text-green-400 shrink-0 ml-2"
              title="Скопировать"
            />
          </div>
        )}

        {/* Secondary каналы: телефон + email */}
        {hasSecondary && (
          <div className="pt-2">
            <p className="text-xs text-gray-400 mb-2">Другие способы</p>
            <div className="space-y-1.5">
              {hasPhone && (
                <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center shrink-0">
                      <PhoneOutlined className="text-gray-500 text-sm" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-700">
                        Телефон
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {contacts.phone}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <a
                      href={`tel:${contacts.phone}`}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-500 transition-colors"
                      title="Позвонить"
                    >
                      <PhoneFilled className="text-sm" />
                    </a>
                    <Button
                      type="text"
                      icon={<CopyOutlined />}
                      size="small"
                      onClick={() => copy(contacts.phone!, "Телефон")}
                      className="text-gray-400"
                      title="Скопировать"
                    />
                  </div>
                </div>
              )}
              {hasEmail && (
                <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center shrink-0">
                      <MailOutlined className="text-gray-500 text-sm" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-700">
                        Email
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {contacts.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <a
                      href={`mailto:${contacts.email}`}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-500 transition-colors"
                      title="Написать письмо"
                    >
                      <MailFilled className="text-sm" />
                    </a>
                    <Button
                      type="text"
                      icon={<CopyOutlined />}
                      size="small"
                      onClick={() => copy(contacts.email!, "Email")}
                      className="text-gray-400"
                      title="Скопировать"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {hasAnyContact && (
          <p className="text-xs text-gray-400 text-center pt-2">
            Все договорённости напрямую с продавцом
          </p>
        )}
      </div>
    </Modal>
  );
}
