import React from 'react';
import { STORE_INFO } from '../data/catVillaData';
import { Phone, MessageCircle, MapPin, ArrowUp, Heart } from 'lucide-react';

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
              <div className="w-10 h-10 rounded-xl bg-amber-700/20 text-amber-400 border border-amber-600/30 flex items-center justify-center font-serif-title font-bold text-lg">
                花
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
              堅持採用天然松木無甲醛板材，純實木板厚度足足 1.5cm，表面塗刷些許環保防水漆保護木質防潮，搭配高透耐磨安全亞克力門片。工廠在大陸專注客製生產，出貨前預組裝拍照確認無誤，直寄台灣享免運費（免運不包含偏遠地區還有離島），由新竹物流配送至一樓。
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

            {/* QR code box in Footer */}
            <div className="pt-2 flex items-center gap-3 bg-stone-900/60 p-3 rounded-xl border border-stone-800/80 max-w-xs">
              <img
                src={STORE_INFO.lineQrCode}
                alt="LINE QR Code"
                className="w-14 h-14 rounded-lg bg-white p-1 border border-stone-700 object-contain shrink-0"
              />
              <div className="text-xs">
                <div className="font-bold text-stone-200">加店長 LINE 諮詢</div>
                <div className="text-[11px] text-stone-400 font-mono">ID：{STORE_INFO.lineId}</div>
                <div className="text-[10px] text-amber-400/90 mt-0.5">手機對準螢幕掃描</div>
              </div>
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
                  純實木1.5cm與亞克力特色
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
                <strong>物流配送：</strong>工廠在大陸，製作完成後直送台灣免運費（免運不包含偏遠地區還有離島），由新竹物流配送至一樓。
              </p>
              <p>
                <strong>出貨驗貨：</strong>出貨前預組裝拍照確認無誤後妥善打包。提供店長本人親自入鏡示範的教學影片，建議自備電動螺絲起子。
              </p>
              <p>
                <strong>品質保固：</strong>享 1 年保固（收貨拆箱請務必全程錄影，非人為損壞憑影片免費補發更換）。純實木板厚度足 1.5cm，堅固耐用。
              </p>
              <p>
                <strong>門店營業：</strong>週一至週日 10:00 - 21:00（臺中市豐原區圓環西路97號）。<strong className="text-amber-400">門店來訪須提前預約！</strong>店長有時外出到府組裝不在店內，提前預約避免跑空。
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
