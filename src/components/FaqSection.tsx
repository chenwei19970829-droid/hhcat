import React, { useState } from 'react';
import { FAQS } from '../data/catVillaData';
import { ChevronDown, HelpCircle, MessageCircle } from 'lucide-react';
import { STORE_INFO } from '../data/catVillaData';

export const FaqSection: React.FC = () => {
  const [openIndexes, setOpenIndexes] = useState<number[]>([0, 1]); // Open first 2 by default

  const toggleAccordion = (index: number) => {
    setOpenIndexes((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  return (
    <section id="faq" className="py-16 sm:py-20 border-b border-stone-200 scroll-mt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-800">
            Frequently Asked Questions
          </div>
          <h2 className="font-serif-title text-2xl sm:text-3xl font-bold text-stone-900 mt-1">
            常見問題與訂購說明
          </h2>
          <p className="text-sm text-stone-600 mt-2">
            關於訂製時程、材料安全、到府安裝與門店參觀的詳細解答
          </p>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndexes.includes(idx);
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden transition-all shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => toggleAccordion(idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-stone-50/70 transition-colors"
                >
                  <span className="font-serif-title font-bold text-stone-900 text-sm sm:text-base">
                    {faq.q}
                  </span>
                  <div
                    className={`w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 shrink-0 transition-transform ${
                      isOpen ? 'rotate-180 bg-amber-100 text-amber-900' : ''
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-stone-600 leading-relaxed border-t border-stone-100 animate-fadeIn">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Still have questions banner */}
        <div className="mt-10 p-6 bg-amber-50/60 rounded-2xl border border-amber-200/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-stone-900">
                還有其他客製化疑問或特殊格局想諮詢？
              </div>
              <div className="text-xs text-stone-500 mt-0.5">
                直接加店長 LINE，傳送居家照片即可為您安排專屬一對一線上諮詢
              </div>
            </div>
          </div>

          <a
            href={STORE_INFO.lineUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-[#06C755] hover:bg-[#05b34c] rounded-xl shadow-xs transition-colors shrink-0"
          >
            <MessageCircle className="w-4 h-4" />
            <span>加 LINE 專人解說</span>
          </a>
        </div>
      </div>
    </section>
  );
};
