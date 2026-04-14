import { Tag } from "antd";
import {
  FileSearchOutlined,
  EnvironmentOutlined,
  TagOutlined,
  WalletOutlined,
  SendOutlined,
  PhoneOutlined,
} from "@ant-design/icons";
import type { FormInstance } from "antd";
import { PUBLICATION_DAYS } from "@/lib/constants";
import { ENUM_TO_CITY, ENUM_TO_CATEGORY } from "@/lib/enum-maps";
import RichTextContent from "@/components/ui/RichTextContent";
import type { BudgetType } from "@/lib/types/ad";
import type { CategoryOption } from "../_types";
import { PLATFORM_ICONS } from "../_constants";

type Step3PreviewProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: FormInstance<any>;
  budgetType: BudgetType | null;
  budgetPreview: string;
  isEscrowMode: boolean;
  videoFormats: CategoryOption[];
  adFormats: CategoryOption[];
  adSubjects: CategoryOption[];
};

export default function Step3Preview({
  form,
  budgetType,
  budgetPreview,
  isEscrowMode,
  videoFormats,
  adFormats,
  adSubjects,
}: Step3PreviewProps) {
  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
        <FileSearchOutlined className="text-amber-600 shrink-0" />
        <span>Так ваше объявление увидят авторы. Проверьте перед оплатой.</span>
      </div>

      {/* Карточка превью */}
      <div className="md:bg-white md:rounded-xl md:border md:border-gray-200 md:shadow-sm md:p-6">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h2 className="text-base font-bold text-gray-900 leading-tight flex-1">
            {form.getFieldValue("title") || "—"}
          </h2>
          {form.getFieldValue("platform") && (
            <Tag
              color="blue"
              icon={PLATFORM_ICONS[form.getFieldValue("platform")]}
              className="shrink-0"
            >
              {form.getFieldValue("platform")}
            </Tag>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {form.getFieldValue("city") && (
            <Tag icon={<EnvironmentOutlined />}>
              {ENUM_TO_CITY[form.getFieldValue("city")] ??
                form.getFieldValue("city")}
            </Tag>
          )}
          {form.getFieldValue("category") && (
            <Tag icon={<TagOutlined />}>
              {ENUM_TO_CATEGORY[form.getFieldValue("category")] ??
                form.getFieldValue("category")}
            </Tag>
          )}
          {form.getFieldValue("videoFormatId") && (
            <Tag color="blue">
              {videoFormats.find(
                (v) => v.id === form.getFieldValue("videoFormatId"),
              )?.icon ?? ""}{" "}
              {videoFormats.find(
                (v) => v.id === form.getFieldValue("videoFormatId"),
              )?.label ?? ""}
            </Tag>
          )}
          {form.getFieldValue("adFormatId") && (
            <Tag color="cyan">
              {adFormats.find(
                (v) => v.id === form.getFieldValue("adFormatId"),
              )?.icon ?? ""}{" "}
              {adFormats.find(
                (v) => v.id === form.getFieldValue("adFormatId"),
              )?.label ?? ""}
            </Tag>
          )}
          {form.getFieldValue("adSubjectId") && (
            <Tag color="orange">
              {adSubjects.find(
                (v) => v.id === form.getFieldValue("adSubjectId"),
              )?.icon ?? ""}{" "}
              {adSubjects.find(
                (v) => v.id === form.getFieldValue("adSubjectId"),
              )?.label ?? ""}
            </Tag>
          )}
          {budgetType && (
            <Tag color="green" icon={<WalletOutlined />}>
              {budgetPreview}
            </Tag>
          )}
        </div>

        {form.getFieldValue("description") &&
          (() => {
            const desc = form.getFieldValue("description") as string;
            return desc.includes("<") ? (
              <div className="mb-3 line-clamp-4 text-sm [&_*]:leading-relaxed overflow-hidden">
                <RichTextContent html={desc} />
              </div>
            ) : (
              <div className="text-sm text-gray-700 leading-relaxed mb-3 whitespace-pre-line line-clamp-4">
                {desc}
              </div>
            );
          })()}

        <div className="border-t border-gray-100 mt-4 pt-3 text-xs text-gray-500 space-y-1.5">
          {form.getFieldValue("telegram") && (
            <p className="flex items-center gap-1.5">
              <SendOutlined className="text-blue-400 shrink-0" />
              <span>Telegram: @{form.getFieldValue("telegram")}</span>
            </p>
          )}
          {form.getFieldValue("whatsapp") && (
            <p className="flex items-center gap-1.5">
              <PhoneOutlined className="text-green-400 shrink-0" />
              <span>WhatsApp: {form.getFieldValue("whatsapp")}</span>
            </p>
          )}
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-600">
        {isEscrowMode ? (
          <>
            После публикации задание будет активно <b>бессрочно</b> — пока
            бюджет не исчерпан или вы не закроете его вручную.
          </>
        ) : (
          <>
            После оплаты объявление пройдёт модерацию и появится в ленте на{" "}
            <b>{PUBLICATION_DAYS} дней</b>.
          </>
        )}
      </div>
    </div>
  );
}
