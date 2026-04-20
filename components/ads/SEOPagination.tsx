"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface SEOPaginationProps {
  currentPage: number;
  totalPages: number;
  /** Base path override. If omitted, current pathname is used — this keeps pagination
   *  on pretty URLs (e.g. `/ads/almaty?page=2`) instead of resetting to the base route. */
  baseUrl?: string;
  /** Current URL search params — preserved in pagination hrefs (e.g. filters) */
  searchParams?: Record<string, string>;
  /** If provided, called on click in addition to <Link> navigation (client-fetch mode) */
  onPageChange?: (page: number) => void;
}

/**
 * SEO-friendly pagination component.
 * Always renders `<Link>` so crawlers can discover paginated pages.
 * When `onPageChange` is provided, it fires on click for fast client-side UX.
 *
 * Desktop: full numbered pagination with ellipsis.
 * Mobile: compact prev/next buttons with "Page X of Y" indicator.
 */
export default function SEOPagination({
  currentPage,
  totalPages,
  baseUrl,
  searchParams,
  onPageChange,
}: SEOPaginationProps) {
  const pathname = usePathname();
  const effectiveBase = baseUrl ?? pathname ?? "/ads";

  if (totalPages <= 1) return null;

  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;

  /** Build the href for a given page number, preserving current search params */
  const hrefFor = (page: number) => {
    const params = new URLSearchParams(searchParams);
    if (page > 1) params.set("page", String(page));
    else params.delete("page");
    const qs = params.toString();
    return qs ? `${effectiveBase}?${qs}` : effectiveBase;
  };

  /** Generate visible page numbers with ellipsis gaps */
  const getPageNumbers = (): (number | "ellipsis")[] => {
    const pages: (number | "ellipsis")[] = [];
    const delta = 1; // pages around current

    // Always show first page
    pages.push(1);

    const rangeStart = Math.max(2, currentPage - delta);
    const rangeEnd = Math.min(totalPages - 1, currentPage + delta);

    if (rangeStart > 2) pages.push("ellipsis");

    for (let i = rangeStart; i <= rangeEnd; i++) {
      pages.push(i);
    }

    if (rangeEnd < totalPages - 1) pages.push("ellipsis");

    // Always show last page
    if (totalPages > 1) pages.push(totalPages);

    return pages;
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /** Render a page item — either <Link> (SEO) or <button> (client mode) */
  const renderPageItem = (
    key: string,
    page: number,
    children: React.ReactNode,
    className: string,
    disabled?: boolean,
    ariaLabel?: string,
  ) => {
    if (disabled) {
      return (
        <span
          key={key}
          className={`${className} opacity-40 pointer-events-none cursor-default`}
          aria-disabled="true"
          aria-label={ariaLabel}
        >
          {children}
        </span>
      );
    }

    return (
      <Link
        key={key}
        href={hrefFor(page)}
        className={className}
        prefetch={false}
        aria-label={ariaLabel}
        aria-current={page === currentPage ? "page" : undefined}
        onClick={(e) => {
          if (onPageChange) {
            e.preventDefault();
            onPageChange(page);
          }
          scrollToTop();
        }}
      >
        {children}
      </Link>
    );
  };

  // --- Style tokens ---
  const baseBtn =
    "inline-flex items-center justify-center transition-colors duration-150 select-none";
  const desktopBtn = `${baseBtn} w-10 h-10 rounded-xl text-sm font-medium`;
  const activeStyle = "bg-sky-500 text-white shadow-sm";
  const inactiveStyle =
    "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50";
  const mobileBtnStyle = `${baseBtn} py-2.5 px-4 rounded-xl text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 min-h-[44px]`;

  const pageNumbers = getPageNumbers();

  return (
    <nav aria-label="Навигация по страницам" className="mt-8 mb-4">
      {/* ========== Mobile: compact prev/next ========== */}
      <div className="flex md:hidden items-center justify-between gap-3">
        {renderPageItem(
          "m-prev",
          currentPage - 1,
          <>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Назад
          </>,
          mobileBtnStyle,
          isFirstPage,
          "Предыдущая страница",
        )}

        <span className="text-sm text-gray-500 whitespace-nowrap">
          <span className="font-medium text-gray-700">{currentPage}</span>
          {" "}из{" "}
          <span className="font-medium text-gray-700">{totalPages}</span>
        </span>

        {renderPageItem(
          "m-next",
          currentPage + 1,
          <>
            Вперёд
            <ChevronRight className="w-4 h-4 ml-1" />
          </>,
          mobileBtnStyle,
          isLastPage,
          "Следующая страница",
        )}
      </div>

      {/* ========== Desktop: full numbered pagination ========== */}
      <div className="hidden md:flex items-center justify-center gap-1.5">
        {/* Prev arrow */}
        {renderPageItem(
          "d-prev",
          currentPage - 1,
          <ChevronLeft className="w-4 h-4" />,
          `${desktopBtn} ${inactiveStyle}`,
          isFirstPage,
          "Предыдущая страница",
        )}

        {/* Page numbers */}
        {pageNumbers.map((item, idx) => {
          if (item === "ellipsis") {
            return (
              <span
                key={`ellipsis-${idx}`}
                className="w-10 h-10 inline-flex items-center justify-center text-gray-400 text-sm select-none"
              >
                ...
              </span>
            );
          }

          const isActive = item === currentPage;
          return renderPageItem(
            `page-${item}`,
            item,
            item,
            `${desktopBtn} ${isActive ? activeStyle : inactiveStyle}`,
            false,
            `Страница ${item}`,
          );
        })}

        {/* Next arrow */}
        {renderPageItem(
          "d-next",
          currentPage + 1,
          <ChevronRight className="w-4 h-4" />,
          `${desktopBtn} ${inactiveStyle}`,
          isLastPage,
          "Следующая страница",
        )}
      </div>
    </nav>
  );
}
