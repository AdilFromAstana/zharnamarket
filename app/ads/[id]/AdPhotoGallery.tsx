"use client";

import { useState, useEffect, useRef } from "react";
import { Modal } from "antd";
import { AppstoreOutlined, CloseOutlined } from "@ant-design/icons";

interface AdPhotoGalleryProps {
  images: string[];
  title: string;
}

export default function AdPhotoGallery({ images, title }: AdPhotoGalleryProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  // Направление анимации: "left" — вперёд, "right" — назад, null — без анимации
  const [slideDir, setSlideDir] = useState<"left" | "right" | null>(null);
  const [animating, setAnimating] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Блокируем скролл страницы пока открыт мобильный fullscreen overlay
  useEffect(() => {
    if (isMobile && modalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobile, modalOpen]);

  if (!images || images.length === 0) return null;

  const mainImage = images[0];
  const thumbs = images.slice(1, 5); // максимум 4 миниатюры

  const openModal = (index: number) => {
    setActiveIndex(index);
    setSlideDir(null);
    setModalOpen(true);
  };

  /** Переключить фото с анимацией скольжения */
  const goTo = (nextIndex: number, dir: "left" | "right") => {
    if (animating) return;
    setSlideDir(dir);
    setAnimating(true);
    setTimeout(() => {
      setActiveIndex(nextIndex);
      setSlideDir(null);
      setAnimating(false);
    }, 220);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 50) {
      if (delta > 0) {
        // свайп влево → следующее фото
        goTo((activeIndex + 1) % images.length, "left");
      } else {
        // свайп вправо → предыдущее фото
        goTo((activeIndex - 1 + images.length) % images.length, "right");
      }
    }
    touchStartX.current = null;
  };

  // CSS-класс анимации
  const slideClass =
    slideDir === "left"
      ? "translate-x-[-8%] opacity-0"
      : slideDir === "right"
        ? "translate-x-[8%] opacity-0"
        : "translate-x-0 opacity-100";

  return (
    <>
      {/* Галерея: большое фото + 2×2 сетка */}
      <div className="rounded-xl overflow-hidden mb-5">
        <div className="grid grid-cols-2 gap-1.5" style={{ height: 320 }}>
          {/* Большое фото слева */}
          <div
            className="relative cursor-pointer overflow-hidden rounded-l-xl group"
            style={{ gridRow: "span 2" }}
            onClick={() => openModal(0)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mainImage}
              alt={`${title} — фото 1`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>

          {/* 4 миниатюры справа (2×2) */}
          <div className="grid grid-cols-2 gap-1.5 col-span-1 row-span-2">
            {thumbs.map((src, i) => {
              const isLast = i === thumbs.length - 1 && images.length > 5;
              return (
                <div
                  key={i}
                  className="relative cursor-pointer overflow-hidden group"
                  style={{
                    borderTopRightRadius: i === 1 ? 12 : 0,
                    borderBottomRightRadius: i === 3 ? 12 : 0,
                  }}
                  onClick={() => openModal(i + 1)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`${title} — фото ${i + 2}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* Overlay "Показать все фото" на последней миниатюре */}
                  {isLast && (
                    <div className="absolute inset-0 bg-black/40 flex items-end justify-end p-2">
                      <div className="bg-white rounded-lg px-2 py-1 flex items-center gap-1.5 text-xs font-medium text-gray-800 shadow">
                        <AppstoreOutlined className="text-gray-600" />
                        Показать все фото
                      </div>
                    </div>
                  )}
                  {/* Тёмный hover overlay */}
                  {!isLast && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
                  )}
                </div>
              );
            })}

            {/* Если миниатюр меньше 4, показываем кнопку "все фото" в правом нижнем углу отдельным элементом */}
            {thumbs.length < 4 && (
              <div
                className="flex items-end justify-end col-span-2 pr-2 pb-2"
                style={{ gridColumn: "span 2" }}
              >
                {/* пустое место */}
              </div>
            )}
          </div>
        </div>

        {/* Кнопка "Показать все фото" — всегда видима под галереей */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={() => openModal(0)}
            className="mt-2 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <AppstoreOutlined />
            Показать все фото ({images.length})
          </button>
        )}
      </div>

      {/* ── Мобильный fullscreen overlay ── */}
      {isMobile && modalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
          {/* Шапка: кнопка закрытия */}
          <div className="flex justify-end px-4 py-3 shrink-0">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Закрыть"
            >
              <CloseOutlined className="text-white text-base" />
            </button>
          </div>

          {/* Большое фото со свайп-навигацией и анимацией */}
          <div
            className="flex-1 flex items-center justify-center overflow-hidden px-2"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[activeIndex]}
              alt={`${title} — фото ${activeIndex + 1}`}
              className={`max-w-full max-h-full object-contain select-none transition-all duration-[220ms] ease-in-out ${slideClass}`}
              draggable={false}
            />
          </div>

          {/* Подвал: счётчик */}
          <div className="py-4 text-center shrink-0">
            <span className="text-white/60 text-sm">
              {activeIndex + 1} / {images.length}
            </span>
          </div>
        </div>
      )}

      {/* ── Десктопное модальное окно со всеми фото ── */}
      {!isMobile && (
        <Modal
          open={modalOpen}
          onCancel={() => setModalOpen(false)}
          footer={null}
          width="90vw"
          style={{ maxWidth: 1100 }}
          closeIcon={
            <div className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors">
              <CloseOutlined className="text-gray-600 text-sm" />
            </div>
          }
          styles={{ body: { padding: "16px 0 0" } }}
        >
          {/* Большой активный снимок */}
          <div
            className="relative w-full mb-4 overflow-hidden rounded-xl"
            style={{ height: 480 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[activeIndex]}
              alt={`${title} — фото ${activeIndex + 1}`}
              className="w-full h-full object-contain bg-gray-50"
            />
          </div>

          {/* Миниатюры в ряд */}
          <div className="flex gap-2 overflow-x-auto pb-2 px-1">
            {images.map((src, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveIndex(i)}
                className={`
                  relative shrink-0 rounded-lg overflow-hidden transition-all duration-150
                  ${activeIndex === i ? "ring-2 ring-sky-500 ring-offset-1" : "opacity-70 hover:opacity-100"}
                `}
                style={{ width: 88, height: 64 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`${title} — фото ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>

          {/* Счётчик */}
          <p className="text-center text-sm text-gray-400 mt-3">
            {activeIndex + 1} / {images.length}
          </p>
        </Modal>
      )}
    </>
  );
}
