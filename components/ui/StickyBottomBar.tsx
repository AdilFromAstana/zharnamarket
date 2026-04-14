"use client";

import { useRouter } from "next/navigation";
import { Button } from "antd";
import { ArrowLeftOutlined, CloseOutlined } from "@ant-design/icons";

interface StickyBottomBarProps {
  /** Текст основной кнопки */
  primaryLabel: React.ReactNode;
  /** Обработчик клика по основной кнопке */
  onPrimary: () => void;
  /** Иконка справа от текста основной кнопки */
  primaryIcon?: React.ReactNode;
  /** Состояние загрузки основной кнопки */
  primaryLoading?: boolean;
  /** Заблокировать основную кнопку */
  primaryDisabled?: boolean;
  /**
   * Если передан — отображается квадратная кнопка 52×52.
   * Если не передан — кнопки нет.
   */
  onBack?: () => void;
  /**
   * Если true — кнопка onBack отображается как крестик (✕),
   * и при клике выполняет переход по cancelHref вместо onBack().
   * Используется на первом шаге многошаговых форм.
   */
  isFirstStep?: boolean;
  /**
   * URL для перехода при нажатии кнопки-крестика (когда isFirstStep=true).
   * Ранее также отображался как ссылка снизу — теперь логика перенесена в крестик.
   */
  cancelHref?: string;
  /** @deprecated Больше не используется в рендере. Зарезервировано для совместимости. */
  cancelLabel?: string;
  /** Дополнительные CSS-классы для корневого элемента (например, lg:hidden) */
  className?: string;
}

/**
 * Переиспользуемый фиксированный бар с кнопками навигации внизу страницы.
 * Используется на страницах с многошаговыми формами и оплатой.
 *
 * Поведение кнопки «Назад/Закрыть»:
 * - isFirstStep=true + cancelHref → показывает CloseOutlined (✕), клик → router.push(cancelHref)
 * - isFirstStep=false (или не задан) → показывает ArrowLeftOutlined (←), клик → onBack()
 */
export default function StickyBottomBar({
  primaryLabel,
  onPrimary,
  primaryIcon,
  primaryLoading = false,
  primaryDisabled = false,
  onBack,
  isFirstStep = false,
  cancelHref,
  className,
}: StickyBottomBarProps) {
  const router = useRouter();

  const handleBackClick = () => {
    if (isFirstStep && cancelHref) {
      router.push(cancelHref);
    } else if (onBack) {
      onBack();
    }
  };

  const showCloseIcon = isFirstStep && !!cancelHref;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-4 py-3${className ? ` ${className}` : ""}`}
    >
      <div className="max-w-lg mx-auto">
        <div className="flex gap-3">
          {onBack && (
            <Button
              size="large"
              icon={showCloseIcon ? <CloseOutlined /> : <ArrowLeftOutlined />}
              onClick={handleBackClick}
              style={{ height: 52, width: 52, flexShrink: 0, padding: 0 }}
              aria-label={showCloseIcon ? "Отменить" : "Назад"}
            />
          )}
          <Button
            type="primary"
            size="large"
            block
            icon={primaryIcon}
            iconPlacement="end"
            onClick={onPrimary}
            loading={primaryLoading}
            disabled={primaryDisabled}
            style={{
              height: 52,
              fontSize: 16,
              fontWeight: 600,
              background: "#3B82F6",
              borderColor: "#3B82F6",
              flex: 1,
            }}
          >
            {primaryLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
