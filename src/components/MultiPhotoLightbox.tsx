import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, MessageCircle, Sparkles } from 'lucide-react';
import { STORE_INFO } from '../data/catVillaData';

interface MultiPhotoLightboxProps {
  isOpen: boolean;
  title: string;
  images: string[];
  subtitle?: string;
  initialIndex?: number;
  onClose: () => void;
}

export const MultiPhotoLightbox: React.FC<MultiPhotoLightboxProps> = ({
  isOpen,
  title,
  images,
  subtitle,
  initialIndex = 0,
  onClose
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, isOpen]);

  const validImages = (images || []).filter(Boolean);

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (validImages.length <= 1) return;
    setCurrentIndex((prev) => (prev === 0 ? validImages.length - 1 : prev - 1));
  };

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (validImages.length <= 1) return;
    setCurrentIndex((prev) => (prev === validImages.length - 1 ? 0 : prev + 1));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, currentIndex, validImages.length]);

  if (!isOpen || validImages.length === 0) return null;

  const currentImg = validImages[currentIndex] || validImages[0];

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches && e.touches.length > 0) {
      setTouchStartX(e.touches[0].clientX);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || validImages.length <= 1) return;
    const endX = e.changedTouches?.[0]?.clientX;
    if (typeof endX === 'number') {
      const diff = touchStartX - endX;
      if (diff > 40) {
        handleNext();
      } else if (diff < -40) {
        handlePrev();
      }
    }
    setTouchStartX(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-950/90 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-stone-800 flex flex-col max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-stone-200 bg-[#FAF8F5]">
          <div className="min-w-0 pr-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded shrink-0">
                照片 {currentIndex + 1} / {validImages.length}
              </span>
              <h3 className="font-serif-title font-bold text-stone-900 text-base sm:text-lg truncate">
                {title}
              </h3>
            </div>
            {subtitle && <p className="text-xs text-stone-500 mt-0.5 truncate">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`${STORE_INFO.lineUrl}?text=${encodeURIComponent(
                `您好！我在官網看到【${title}】的實拍照片，想詢問這款貓別墅的詳細規格與客製排單！`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#06C755] hover:bg-[#05b34c] rounded-xl shadow-xs transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>LINE 詢問此款</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-2.5 text-stone-500 hover:text-stone-800 rounded-xl hover:bg-stone-200/60 transition-colors"
              aria-label="關閉"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Image View Area with Left/Right Arrows & Touch Swipe */}
        <div
          className="relative flex-1 bg-stone-900 p-4 sm:p-8 flex items-center justify-center min-h-[320px] sm:min-h-[480px] touch-pan-y"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <img
            src={currentImg}
            alt={`${title} - 第 ${currentIndex + 1} 張`}
            className="max-h-[62vh] w-auto max-w-full object-contain rounded-xl shadow-2xl select-none transition-all duration-300"
            draggable={false}
          />

          {/* Left / Right Navigation Arrows */}
          {validImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-white/85 hover:bg-white text-stone-900 shadow-xl backdrop-blur-md transition-all hover:scale-110 active:scale-95"
                aria-label="上一張"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-white/85 hover:bg-white text-stone-900 shadow-xl backdrop-blur-md transition-all hover:scale-110 active:scale-95"
                aria-label="下一張"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnail Selector Bar at Bottom */}
        {validImages.length > 1 && (
          <div className="px-4 py-3 bg-[#FAF8F5] border-t border-stone-200 flex items-center justify-center gap-2 overflow-x-auto no-scrollbar">
            {validImages.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                  currentIndex === idx
                    ? 'border-amber-900 scale-105 shadow-md ring-2 ring-amber-900/30'
                    : 'border-stone-300 opacity-70 hover:opacity-100'
                }`}
              >
                <img src={img} alt={`縮圖 ${idx + 1}`} className="w-full h-full object-cover" />
                {idx === 0 && (
                  <span className="absolute bottom-0 inset-x-0 bg-amber-900/80 text-white text-[9px] font-bold text-center py-0.5">
                    主圖
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Footer info */}
        <div className="px-6 py-3 bg-white border-t border-stone-200 text-xs text-stone-500 flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-1 font-medium text-stone-700">
            <Sparkles className="w-3.5 h-3.5 text-amber-800" />
            <span>手機可左右滑動或點擊箭頭切換多角度實拍</span>
          </span>
          <span className="font-mono text-stone-400">花花招財貓 · {STORE_INFO.phoneDisplay}</span>
        </div>
      </div>
    </div>
  );
};
