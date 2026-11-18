import React from 'react';
import { STORE_INFO } from '../data/catVillaData';
import { Phone, MessageCircle, MapPin, ArrowUp, Lock, BarChart3 } from 'lucide-react';
import { useStoreOwner } from '../utils/adminAuth';
import { signOutStoreOwner } from '../firebase';

interface FooterProps {
  onOpenOwnerAuth?: () => void;
  onOpenAnalytics?: () => void;
  onNavigateHome?: (hash?: string) => void;
  onNavigateToPath?: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenOwnerAuth,
  onOpenAnalytics,
  onNavigateHome,
  onNavigateToPath
}) => {
  const { isOwner, logout } = useStoreOwner();
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleHashLink = (e: React.MouseEvent<HTMLAnchorElement>, hash: string) => {
    if (onNavigateHome) {
      e.preventDefault();
      onNavigateHome(hash);
    }
  };

  const handleRouteLink = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    if (onNavigateToPath) {
      e.preventDefault();
      onNavigateToPath(path);
    }
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
                <a href="/#models" onClick={(e) => handleHashLink(e, '#models')} className="hover:text-amber-400 transition-colors">
                  精選貓別墅款式 (A-Z款)
                </a>
              </li>
              <li>
                <a href="/guides/solid-wood-craft" onClick={(e) => handleRouteLink(e, '/guides/solid-wood-craft')} className="hover:text-amber-400 transition-colors">
                  1.5cm 純實木 vs 市售薄板工藝指南
                </a>
              </li>
              <li>
                <a href="/taichung-showroom" onClick={(e) => handleRouteLink(e, '/taichung-showroom')} className="hover:text-amber-400 transition-colors">
                  台中豐原實體門店預約體驗
                </a>
              </li>
              <li>
                <a href="/#story" onClick={(e) => handleHashLink(e, '#story')} className="hover:text-amber-400 transition-colors">
                  品牌故事與花花寫真
                </a>
              </li>
              <li>
                <a href="/#showcase" onClick={(e) => handleHashLink(e, '#showcase')} className="hover:text-amber-400 transition-colors">
                  客製實品相冊 (依尺寸檢索)
                </a>
              </li>
              <li>
                <a href="/#catalog" onClick={(e) => handleHashLink(e, '#catalog')} className="hover:text-amber-400 transition-colors">
                  門店標準報價單
                </a>
              </li>
              <li>
                <a href="/#estimator" onClick={(e) => handleHashLink(e, '#estimator')} className="hover:text-amber-400 transition-colors">
                  線上即時估價試算機
                </a>
              </li>
              <li>
                <a href="/#disclaimer" onClick={(e) => handleHashLink(e, '#disclaimer')} className="hover:text-amber-400 transition-colors">
                  訂購須知 · 售後保障
                </a>
              </li>
              <li>
                <a href="/#faq" onClick={(e) => handleHashLink(e, '#faq')} className="hover:text-amber-400 transition-colors">
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
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1">
            <span>© {new Date().getFullYear()} 花花招財貓 (Hua Hua Lucky Cat). 保留所有權利.</span>
            {isOwner ? (
              <div className="inline-flex flex-wrap items-center gap-3">
                {onOpenAnalytics && (
                  <button
                    type="button"
                    onClick={onOpenAnalytics}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 hover:text-amber-200 transition-colors"
                    title="開啟網站每日 / 每週 / 每月觀看紀錄與計算機統計"
                  >
                    <BarChart3 className="w-3 h-3" />
                    <span>網站觀看紀錄</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    void signOutStoreOwner();
                  }}
                  className="inline-flex items-center gap-1 text-[11px] text-amber-400/90 hover:text-amber-300 transition-colors"
                  title="鎖定並退出店主編輯模式"
                >
                  <Lock className="w-3 h-3" />
                  <span>店主模式已開啟（點擊鎖定）</span>
                </button>
              </div>
            ) : (
              onOpenOwnerAuth && (
                <div className="inline-flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onOpenOwnerAuth}
                    className="inline-flex items-center gap-1 text-[11px] text-stone-600 hover:text-stone-400 transition-colors"
                    title="店主管理登入"
                  >
                    <Lock className="w-2.5 h-2.5" />
                    <span>店主入口</span>
                  </button>
                  {onOpenAnalytics && (
                    <button
                      type="button"
                      onClick={onOpenAnalytics}
                      className="inline-flex items-center gap-1 text-[11px] text-stone-600 hover:text-stone-400 transition-colors"
                      title="店主專屬網站觀看與計算機紀錄"
                    >
                      <BarChart3 className="w-2.5 h-2.5" />
                      <span>觀看紀錄</span>
                    </button>
                  )}
                </div>
              )
            )}
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
