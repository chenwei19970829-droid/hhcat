import React, { useState, useEffect } from 'react';
import { MENU_CATEGORIES, STORE_INFO } from '../data/catVillaData';
import { X, ChevronLeft, ChevronRight, MessageCircle, FileText } from 'lucide-react';

interface OriginalMenuModalProps {
  isOpen: boolean;
  initialIndex?: number;
  onClose: () => void;
}

export const OriginalMenuModal: React.FC<OriginalMenuModalProps> = ({
  isOpen,
  initialIndex = 0,
  onClose
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    if (initialIndex >= 0 && initialIndex < MENU_CATEGORIES.length) {
      setCurrentIndex(initialIndex);
    }
  }, [initialIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') nextMenu();
      if (e.key === 'ArrowLeft') prevMenu();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, currentIndex, onClose]);

  if (!isOpen) return null;

  const currentCategory = MENU_CATEGORIES[currentIndex];

  const prevMenu = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : MENU_CATEGORIES.length - 1));
  };

  const nextMenu = () => {
    setCurrentIndex((prev) => (prev < MENU_CATEGORIES.length - 1 ? prev + 1 : 0));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-950/85 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full bg-[#FAF8F5] rounded-2xl overflow-hidden shadow-2xl border border-stone-300 flex flex-col max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif-title font-bold text-stone-900 text-base">
                花花招財貓 · 實體門店原裝價目單
              </h3>
              <p className="text-xs text-stone-500">
                目前檢視：{currentCategory.title}（第 {currentIndex + 1} / 5 張）
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selector for the 5 menus */}
        <div className="flex overflow-x-auto p-2 bg-stone-100 border-b border-stone-200 gap-1.5 no-scrollbar">
          {MENU_CATEGORIES.map((cat, idx) => (
            <button
              key={cat.length}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                currentIndex === idx
                  ? 'bg-amber-900 text-white shadow-xs'
                  : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200'
              }`}
            >
              長度 {cat.length}cm 系列
            </button>
          ))}
        </div>

        {/* Main Image viewer */}
        <div className="relative flex-1 bg-stone-900 p-4 flex items-center justify-center overflow-auto min-h-[350px]">
          <button
            type="button"
            onClick={prevMenu}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-stone-950/70 hover:bg-stone-950 text-white transition-all shadow-md z-10"
            title="上一張 (方向鍵左)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <img
            src={currentCategory.originalImage}
            alt={currentCategory.title}
            className="max-h-[68vh] w-auto max-w-full object-contain rounded shadow-lg"
          />

          <button
            type="button"
            onClick={nextMenu}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-stone-950/70 hover:bg-stone-950 text-white transition-all shadow-md z-10"
            title="下一張 (方向鍵右)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Footer info & CTA */}
        <div className="px-6 py-3.5 bg-white border-t border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-stone-600">
            <span>手工客製排單 · 付款後 14-21 天內宅配到府 · 車馬費 500 起依實際情況報價</span>
          </div>

          <a
            href={`${STORE_INFO.lineUrl}?text=${encodeURIComponent(
              `您好！我在原廠價目單看到【${currentCategory.title}】，想諮詢客製排單細節！`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#06C755] hover:bg-[#05b34c] rounded-lg shadow-xs"
          >
            <MessageCircle className="w-4 h-4" />
            <span>加 LINE 諮詢此系列</span>
          </a>
        </div>
      </div>
    </div>
  );
};
