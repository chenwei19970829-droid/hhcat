import React, { useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Download, MessageCircle } from 'lucide-react';
import { STORE_INFO } from '../data/catVillaData';

interface LightboxModalProps {
  isOpen: boolean;
  title: string;
  imageUrl: string;
  subtitle?: string;
  onClose: () => void;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({
  isOpen,
  title,
  imageUrl,
  subtitle,
  onClose
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl border border-stone-800 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-[#FAF8F5]">
          <div>
            <h3 className="font-serif-title font-bold text-stone-900 text-lg">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`${STORE_INFO.lineUrl}?text=${encodeURIComponent(
                `您好！我在相冊看到這張照片【${title}】，想詢問客製細節！`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#06C755] hover:bg-[#05b34c] rounded-lg shadow-xs"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>LINE 詢問此款</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-200/60 transition-colors"
              aria-label="關閉"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* High Resolution Image Container */}
        <div className="flex-1 bg-stone-900/95 p-4 flex items-center justify-center overflow-auto min-h-[300px]">
          <img
            src={imageUrl}
            alt={title}
            className="max-h-[72vh] w-auto max-w-full object-contain rounded shadow-lg select-none"
          />
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-[#FAF8F5] border-t border-stone-200 text-xs text-stone-500 flex flex-wrap items-center justify-between gap-2">
          <span>花花招財貓 · 實體門店展示 · 支援全套尺寸客製化</span>
          <span className="font-mono">電話: {STORE_INFO.phone} · LINE ID: {STORE_INFO.lineId}</span>
        </div>
      </div>
    </div>
  );
};
