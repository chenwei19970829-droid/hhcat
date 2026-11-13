import React from 'react';
import { STORE_INFO } from '../data/catVillaData';
import { Phone, MessageCircle, MapPin, ArrowUp } from 'lucide-react';

export const Footer: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#241E1A] text-stone-300 pt-16 pb-24 lg:pb-16 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-stone-800">
          {/* Brand info */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white p-0.5 border border-amber-600/30 overflow-hidden flex items-center justify-center shrink-0">
                <img
                  src={STORE_INFO.logoImage || '/assets/aistudio/logo_6994c231.jpg'}
                  alt={STORE_INFO.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <span className="font-serif-title text-xl font-bold text-white tracking-tight">
                  {STORE_INFO.name}
                </span>
                <span className="block text-[11px] text-stone-400 tracking-wider">
                  手工天然松木客製貓別墅 · 台中豐原門店展示中心
                </span>
              </div>
            </div>

            <p className="text-xs text-stone-400 leading-relaxed max-w-sm">
              花花招財貓 · 台中豐原手工實木貓別墅展示中心，用心為毛孩量身打造安穩舒適的家。
            </p>

            <div className="pt-2 text-xs text-stone-400 space-y-1.5">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>門店地址：{STORE_INFO.address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>預約專線：{STORE_INFO.phoneDisplay}</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageCircle className="w-3.5 h-3.5 text-[#06C755] shrink-0" />
                <span>官方 LINE：{STORE_INFO.lineId}</span>
              </div>
            </div>

            {/* Social links row */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <a
                href={STORE_INFO.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-800 transition-colors"
              >
                FB 粉絲團：花花招財貓
              </a>
              <a
                href={STORE_INFO.threadsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-800 transition-colors"
              >
                Threads / IG：hhcat.1226
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-semibold text-stone-200 uppercase tracking-wider">
              導覽連結
            </h4>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>
                <a href="#models" className="hover:text-amber-400 transition-colors">
                  精選貓別墅款式 (A-Z款)
                </a>
              </li>
              <li>
                <a href="#story" className="hover:text-amber-400 transition-colors">
                  品牌故事與花花寫真
                </a>
              </li>
              <li>
                <a href="#showcase" className="hover:text-amber-400 transition-colors">
                  客製實品相冊 (依尺寸檢索)
                </a>
              </li>
              <li>
                <a href="#catalog" className="hover:text-amber-400 transition-colors">
                  門店標準報價單
                </a>
              </li>
              <li>
                <a href="#estimator" className="hover:text-amber-400 transition-colors">
                  線上即時估價試算機
                </a>
              </li>
              <li>
                <a href="#materials" className="hover:text-amber-400 transition-colors">
                  純實木1.5cm與壓克力特色
                </a>
              </li>
              <li>
                <a href="#sizeguide" className="hover:text-amber-400 transition-colors">
                  多貓家庭尺寸選購指南
                </a>
              </li>
              <li>
                <a href="#disclaimer" className="hover:text-amber-400 transition-colors">
                  訂購須知與 1 年保固
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-amber-400 transition-colors">
                  常見問題與到府安裝
                </a>
              </li>
            </ul>
          </div>

          {/* Ordering Policy & Service hours */}
          <div className="lg:col-span-4 space-y-3">
            <h4 className="text-xs font-semibold text-stone-200 uppercase tracking-wider">
              訂製規範與服務時間
            </h4>
            <div className="bg-stone-900/80 rounded-xl p-4 border border-stone-800 text-xs text-stone-400 space-y-2">
              <p>
                <strong>門店營業：</strong>週一至週日 10:00 - 21:00（臺中市豐原區圓環西路97號）。
              </p>
              <p>
                <strong className="text-amber-400">來訪預約提醒：</strong>店長常外出到府組裝不在店內，來店前請務必先電話或 LINE 預約，避免撲空。
              </p>
              <p>
                <strong>保固與配送：</strong>全台免運宅配到一樓（偏遠及離島另計），憑收貨拆箱全程錄影享 1 年非人為保固補件。
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <div className="flex items-center gap-1">
            <span>© {new Date().getFullYear()} 花花招財貓 (Hua Hua Lucky Cat). 保留所有權利.</span>
          </div>

          <button
            type="button"
            onClick={scrollToTop}
            className="inline-flex items-center gap-1.5 text-stone-400 hover:text-white transition-colors"
          >
            <span>回到頁面頂部</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
};
