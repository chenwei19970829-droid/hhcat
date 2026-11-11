import React from 'react';
import { STORE_INFO, GUARANTEES } from '../data/catVillaData';
import { Hammer, ShieldCheck, Sparkles, Truck, ArrowRight, MessageCircle, Calculator, MapPin, Eye } from 'lucide-react';

interface HeroSectionProps {
  onOpenEstimator: () => void;
  onViewMenuImages: () => void;
  onOpenImageZoom?: (title: string, imageUrl: string, subtitle?: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onOpenEstimator,
  onViewMenuImages,
  onOpenImageZoom
}) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Hammer':
        return <Hammer className="w-5 h-5 text-amber-800" />;
      case 'ShieldCheck':
        return <ShieldCheck className="w-5 h-5 text-amber-800" />;
      case 'Sparkles':
        return <Sparkles className="w-5 h-5 text-amber-800" />;
      case 'Truck':
        return <Truck className="w-5 h-5 text-amber-800" />;
      default:
        return <Sparkles className="w-5 h-5 text-amber-800" />;
    }
  };

  const handleZoomStorefront = () => {
    if (onOpenImageZoom) {
      onOpenImageZoom(
        '花花招財貓 · 臺中豐原門店實景',
        STORE_INFO.storefrontImage,
        '臺中市豐原區圓環西路97號 · 客製化 精品實木貓別墅 倉儲中心'
      );
    }
  };

  const handleZoomQr = () => {
    if (onOpenImageZoom) {
      onOpenImageZoom(
        '花花招財貓 · 官方 LINE QR Code',
        STORE_INFO.lineQrCode,
        '掃描加入店長 LINE (ID: 0966129569) 諮詢尺寸與客製報價'
      );
    }
  };

  return (
    <section className="relative overflow-hidden pt-8 pb-16 lg:pt-14 lg:pb-22 border-b border-stone-200">
      {/* Subtle Warm Background Accent */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-100/40 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-10 w-80 h-80 bg-stone-200/40 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Headlines & Brand Proposition */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-900 bg-amber-500/10 border border-amber-600/20 px-3 py-1.5 rounded-full">
              <span>天然松木無甲醛</span>
              <span aria-hidden="true">·</span>
              <span>純實木板厚度足 1.5cm</span>
              <span aria-hidden="true">·</span>
              <span>高透安全亞克力</span>
              <span aria-hidden="true">·</span>
              <span>新竹物流免運直送</span>
            </div>

            <h1 className="font-serif-title text-3xl sm:text-4xl lg:text-5xl font-bold text-stone-900 tracking-tight leading-[1.25] text-balance">
              給愛貓一個溫暖、健康、
              <br />
              <span className="text-amber-900">量身定制的實木夢想城堡</span>
            </h1>

            {/* Structured Founder Mission & Quality Promise */}
            <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-4 sm:p-5 space-y-3.5 max-w-2xl shadow-xs">
              <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-amber-950">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-amber-800 text-white text-xs">★</span>
                <span>店長初心：不想貓咪住到爛木頭！</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs sm:text-[13px] text-stone-700">
                <div className="bg-white/85 p-3 rounded-xl border border-amber-200/60 flex items-start gap-2.5 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-800 mt-1.5 shrink-0" />
                  <div>
                    <strong className="text-stone-900 block font-semibold">天然松木無甲醛 · 足 1.5cm</strong>
                    <span className="text-stone-600 text-xs">堅持純實木厚度 1.5cm，表面微防水漆防潮，搭配高透耐磨安全亞克力門片。</span>
                  </div>
                </div>

                <div className="bg-white/85 p-3 rounded-xl border border-amber-200/60 flex items-start gap-2.5 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-800 mt-1.5 shrink-0" />
                  <div>
                    <strong className="text-stone-900 block font-semibold">出貨前預組裝拍照確認</strong>
                    <span className="text-stone-600 text-xs">工廠在大陸專注高品質客製生產，出貨前預組裝拍照確認無誤後妥善打包。</span>
                  </div>
                </div>

                <div className="bg-white/85 p-3 rounded-xl border border-amber-200/60 flex items-start gap-2.5 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-800 mt-1.5 shrink-0" />
                  <div>
                    <strong className="text-stone-900 block font-semibold">直送台灣享【免運費】</strong>
                    <span className="text-stone-600 text-xs">新竹物流配送至一樓（偏遠地區與離島除外），安全加固直達您府上。</span>
                  </div>
                </div>

                <div className="bg-white/85 p-3 rounded-xl border border-amber-200/60 flex items-start gap-2.5 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-800 mt-1.5 shrink-0" />
                  <div>
                    <strong className="text-stone-900 block font-semibold">享 1 年保固 · 店長教學影片</strong>
                    <span className="text-stone-600 text-xs">享 1 年品質保固，並提供店長本人親自入鏡示範拍攝的組裝教學影片。</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href={STORE_INFO.lineUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-sm font-semibold text-white bg-[#06C755] hover:bg-[#05b34c] rounded-xl shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
              >
                <MessageCircle className="w-4 h-4" />
                <span>直接加 LINE 詢價（{STORE_INFO.lineId}）</span>
              </a>

              <button
                type="button"
                onClick={onOpenEstimator}
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 text-sm font-semibold text-stone-800 bg-white hover:bg-stone-50 border border-stone-300 rounded-xl shadow-xs hover:border-amber-800 transition-all active:scale-[0.98]"
              >
                <Calculator className="w-4 h-4 text-amber-800" />
                <span>線上即時試算估價</span>
              </button>

              <button
                type="button"
                onClick={handleZoomQr}
                className="inline-flex items-center justify-center gap-2 px-4 py-3.5 text-xs font-semibold text-stone-700 bg-amber-50/80 hover:bg-amber-100/80 border border-amber-200/80 rounded-xl transition-all"
              >
                <img
                  src={STORE_INFO.lineQrCode}
                  alt="LINE QR"
                  className="w-4 h-4 rounded object-cover"
                />
                <span>手機掃描加 LINE QR</span>
              </button>

              <button
                type="button"
                onClick={onViewMenuImages}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-3.5 text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors"
              >
                <Eye className="w-3.5 h-3.5 text-stone-400" />
                <span>查看門店原裝價目單 (5張)</span>
              </button>
            </div>

            {/* Trust markers */}
            <div className="pt-4 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-stone-500 border-t border-stone-200/80">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                <span>實體門店：{STORE_INFO.address}（來店請先預約）</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                <span>新竹物流送至一樓（免運不含偏遠與離島）</span>
              </div>
            </div>
          </div>

          {/* Right Column: Authentic Storefront Photo Showcase */}
          <div className="lg:col-span-5">
            <div className="relative bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-md hover:shadow-lg transition-shadow">
              {/* Card Header info */}
              <div className="flex items-center justify-between pb-3.5 border-b border-stone-100">
                <div>
                  <div className="inline-flex items-center gap-1 text-[11px] font-bold tracking-wider text-amber-800 uppercase">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>實體門店展示倉儲中心 · 臺中豐原</span>
                  </div>
                  <div className="font-serif-title font-bold text-stone-900 text-lg sm:text-xl">
                    花花招財貓 · 門店實景
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleZoomStorefront}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
                  title="點擊放大觀看實拍"
                >
                  <Eye className="w-3 h-3 text-stone-500" />
                  <span>放大實拍</span>
                </button>
              </div>

              {/* Storefront Real Image Container */}
              <div
                onClick={handleZoomStorefront}
                className="relative mt-3.5 rounded-xl overflow-hidden aspect-4/3 sm:aspect-16/11 bg-stone-100 border border-amber-900/10 cursor-pointer group"
              >
                <img
                  src={STORE_INFO.storefrontImage}
                  alt="花花招財貓實體門店"
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                />

                {/* Gradient vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

                {/* Overlaid Badges on Image */}
                <div className="absolute top-3 left-3 bg-stone-900/80 backdrop-blur-xs text-white text-[11px] font-semibold px-2.5 py-1 rounded-md border border-white/20">
                  實體門店現場實景 · 台中豐原
                </div>

                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <div className="text-xs font-bold leading-snug drop-shadow-sm">
                    客製化 精品實木貓別墅 倉儲中心
                  </div>
                  <div className="text-[11px] text-stone-200/90 drop-shadow-xs">
                    多款尺寸樣式現場陳列展示 · 歡迎預約親臨挑選
                  </div>
                </div>
              </div>

              {/* LINE QR Code Direct Scan Sub-banner */}
              <div className="mt-4 p-3 bg-stone-50 rounded-xl border border-stone-200/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleZoomQr}
                    className="w-14 h-14 bg-white p-1 rounded-lg border border-stone-200 shrink-0 shadow-2xs hover:scale-105 transition-transform"
                    title="點擊放大 QR Code"
                  >
                    <img
                      src={STORE_INFO.lineQrCode}
                      alt="花花招財貓 LINE QR"
                      className="w-full h-full object-contain"
                    />
                  </button>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900">
                      <MessageCircle className="w-3.5 h-3.5 text-[#06C755]" />
                      <span>手機掃描加 LINE 諮詢</span>
                    </div>
                    <div className="text-[11px] text-stone-500 font-mono mt-0.5">
                      LINE ID：{STORE_INFO.lineId}
                    </div>
                    <div className="text-[10px] text-amber-900">
                      電腦瀏覽可直接用手機相機掃碼加入！
                    </div>
                  </div>
                </div>

                <a
                  href={STORE_INFO.lineUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-white bg-[#06C755] hover:bg-[#05b34c] rounded-lg shadow-2xs transition-colors shrink-0"
                >
                  <span>立即加好友</span>
                </a>
              </div>

              {/* Specs footer */}
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 text-center border-t border-stone-100 text-xs">
                <div>
                  <span className="block text-[11px] text-stone-400">門店實體展示</span>
                  <span className="font-semibold text-stone-800">圓環西路97號</span>
                </div>
                <div>
                  <span className="block text-[11px] text-stone-400">主要物流</span>
                  <span className="font-semibold text-stone-800">新竹物流送到府</span>
                </div>
                <div>
                  <span className="block text-[11px] text-stone-400">教學影片</span>
                  <span className="font-semibold text-stone-800">店長親自入鏡</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Great Guarantees Bar (4 大保證) */}
        <div className="mt-14 pt-10 border-t border-stone-200">
          <div className="text-center max-w-xl mx-auto mb-8">
            <h2 className="font-serif-title text-xl sm:text-2xl font-bold text-stone-900">
              花花招財貓 · 4 大堅持保證
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              為愛貓打造安全舒適的永久住所，每個細節都經得起考驗
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {GUARANTEES.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl p-5 border border-stone-200/80 hover:border-amber-800/40 hover:shadow-xs transition-all space-y-2.5"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                  {getIcon(item.icon)}
                </div>
                <h3 className="font-serif-title font-bold text-stone-900 text-base">
                  {item.title}
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
