import React from 'react';
import { STORE_INFO } from '../data/catVillaData';
import { Phone, MessageCircle, Calculator } from 'lucide-react';

interface MobileStickyBarProps {
  onOpenEstimator: () => void;
}

export const MobileStickyBar: React.FC<MobileStickyBarProps> = ({ onOpenEstimator }) => {
  return (
    <aside aria-label="行動版快速聯絡列" className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-md border-t border-stone-300/80 px-3 py-2 shadow-xl">
      <div className="max-w-md mx-auto grid grid-cols-3 gap-2">
        <a
          href={`tel:${STORE_INFO.phone}`}
          className="flex flex-col items-center justify-center py-1.5 px-1 bg-white hover:bg-stone-50 border border-stone-200 rounded-xl text-stone-700 active:scale-95 transition-all text-center"
        >
          <Phone className="w-4 h-4 text-amber-800 mb-0.5" />
          <span className="text-[11px] font-semibold leading-tight">撥打電話</span>
        </a>

        <a
          href={STORE_INFO.lineUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center py-1.5 px-1 bg-[#06C755] hover:bg-[#05b34c] rounded-xl text-white active:scale-95 transition-all text-center shadow-xs"
        >
          <MessageCircle className="w-4 h-4 mb-0.5" />
          <span className="text-[11px] font-semibold leading-tight">加 LINE 諮詢</span>
        </a>

        <button
          type="button"
          onClick={onOpenEstimator}
          className="flex flex-col items-center justify-center py-1.5 px-1 bg-amber-900 hover:bg-amber-800 rounded-xl text-white active:scale-95 transition-all text-center shadow-xs"
        >
          <Calculator className="w-4 h-4 mb-0.5" />
          <span className="text-[11px] font-semibold leading-tight">即時估價</span>
        </button>
      </div>
    </aside>
  );
};
