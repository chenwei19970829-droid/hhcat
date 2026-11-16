import React, { useState } from 'react';
import { STORE_INFO } from '../data/catVillaData';
import { MessageCircle, Phone, MapPin, Copy, Check, ExternalLink, Clock, ShieldCheck, Navigation } from 'lucide-react';

export const ContactSection: React.FC = () => {
  const [copiedType, setCopiedType] = useState<'line' | 'phone' | 'address' | null>(null);

  const copyToClipboard = (text: string, type: 'line' | 'phone' | 'address') => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    });
  };

  return (
    <section id="contact" className="py-16 sm:py-24 bg-[#FAF7F2] border-b border-stone-200 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-800">
            Contact & Order
          </div>
          <h2 className="font-serif-title text-2xl sm:text-3xl font-bold text-stone-900 mt-1">
            聯絡下單與門店資訊
          </h2>
          <p className="text-sm text-stone-600 mt-2">
            需要客製化規劃或預約下單？點擊以下卡片直接透過 LINE、電話或開啟地圖導航與店長聯絡！
          </p>
        </div>

        {/* 3 Main Direct Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: LINE Order */}
          <div className="bg-white rounded-2xl border border-stone-200/90 p-6 sm:p-7 shadow-xs hover:shadow-md hover:border-[#06C755] transition-all flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-[#06C755]/10 text-[#06C755] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-semibold text-[#06C755] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                  最快回覆管道
                </span>
              </div>

              <div>
                <h3 className="font-serif-title font-bold text-stone-900 text-lg">
                  LINE 官方即時諮詢
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  LINE ID：
                  <strong className="text-stone-900 font-mono text-sm ml-1">
                    {STORE_INFO.lineId}
                  </strong>
                </p>
              </div>

              {/* Scannable QR Code Box */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center gap-3">
                <img
                  src={STORE_INFO.lineQrCode}
                  alt="花花招財貓 LINE QR Code"
                  className="w-16 h-16 rounded-lg bg-white p-1 border border-stone-200 object-contain shrink-0 shadow-2xs"
                />
                <div className="text-xs">
                  <div className="font-bold text-stone-900">手機相機直接掃碼</div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    電腦螢幕直接用手機掃描即加入店長 LINE！
                  </div>
                </div>
              </div>

              <p className="text-xs text-stone-600 leading-relaxed">
                傳送居家尺寸照片、溝通內部跳台動線、確認排單製作進度與車馬費報價。
              </p>
            </div>

            <div className="pt-6 space-y-2 mt-4 border-t border-stone-100">
              <a
                href={STORE_INFO.lineUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 text-xs font-semibold text-white bg-[#06C755] hover:bg-[#05b34c] rounded-xl shadow-xs transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>點擊自動尋找並加 LINE（ID: {STORE_INFO.lineId}）</span>
              </a>

              <button
                type="button"
                onClick={() => copyToClipboard(STORE_INFO.lineId, 'line')}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200/80 rounded-lg transition-colors"
              >
                {copiedType === 'line' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">已複製 LINE ID ({STORE_INFO.lineId})！</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-stone-500" />
                    <span>複製 LINE ID：{STORE_INFO.lineId}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => copyToClipboard(STORE_INFO.phone, 'phone')}
                className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 text-[11px] text-stone-500 hover:text-stone-800 transition-colors"
              >
                {copiedType === 'phone' ? (
                  <span className="text-emerald-600 font-semibold">✓ 已複製電話 {STORE_INFO.phoneDisplay}（可於 LINE 搜尋電話）</span>
                ) : (
                  <span>或複製電話 {STORE_INFO.phoneDisplay} 於 LINE 搜尋加好友</span>
                )}
              </button>
            </div>
          </div>

          {/* Card 2: Phone Hotline */}
          <div className="bg-white rounded-2xl border border-stone-200/90 p-6 sm:p-7 shadow-xs hover:shadow-md hover:border-amber-800 transition-all flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-900 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Phone className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/60">
                  專人通話服務
                </span>
              </div>

              <div>
                <h3 className="font-serif-title font-bold text-stone-900 text-lg">
                  門店電話諮詢專線
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  通話號碼：
                  <strong className="text-amber-900 font-mono text-base ml-1">
                    {STORE_INFO.phoneDisplay}
                  </strong>
                </p>
              </div>

              <p className="text-xs text-stone-600 leading-relaxed">
                專人電話接聽，提供急件排單詢問、材料規格解說或預約門店實體參觀時間。
              </p>
            </div>

            <div className="pt-6 space-y-2 mt-4 border-t border-stone-100">
              <a
                href={`tel:${STORE_INFO.phone}`}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 text-xs font-semibold text-white bg-amber-900 hover:bg-amber-800 rounded-xl shadow-xs transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span>點擊直接撥打專線</span>
              </a>

              <button
                type="button"
                onClick={() => copyToClipboard(STORE_INFO.phone, 'phone')}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-stone-600 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 rounded-lg transition-colors"
              >
                {copiedType === 'phone' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">已複製電話號碼！</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-stone-400" />
                    <span>複製電話號碼</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Card 3: Store Address & Map Navigation */}
          <div className="bg-white rounded-2xl border border-stone-200/90 p-6 sm:p-7 shadow-xs hover:shadow-md hover:border-blue-600 transition-all flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <MapPin className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-semibold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/60">
                  實體門店展示
                </span>
              </div>

              <div>
                <h3 className="font-serif-title font-bold text-stone-900 text-lg">
                  實體門店親臨參觀
                </h3>
                <p className="text-xs text-stone-800 font-medium mt-1">
                  {STORE_INFO.address}
                </p>
              </div>

              <p className="text-xs text-stone-600 leading-relaxed">
                現場陳列不同尺寸實體貓別墅與木材樣板，親自感受溫潤實木質感與無毒母嬰等級。
              </p>
            </div>

            <div className="pt-6 space-y-2 mt-4 border-t border-stone-100">
              <a
                href={STORE_INFO.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-xl shadow-xs transition-colors"
              >
                <Navigation className="w-4 h-4 text-amber-400" />
                <span>在 Google 地圖中開啟導航</span>
              </a>

              <button
                type="button"
                onClick={() => copyToClipboard(STORE_INFO.address, 'address')}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-stone-600 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 rounded-lg transition-colors"
              >
                {copiedType === 'address' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">已複製門店地址！</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-stone-400" />
                    <span>複製完整地址</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Store Detail & Map Preview Box */}
        <div className="mt-8 bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 space-y-4">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-md">
                <Clock className="w-3.5 h-3.5 text-amber-800" />
                <span>營業時間：{STORE_INFO.hours}</span>
              </div>

              <h4 className="font-serif-title font-bold text-stone-900 text-xl">
                花花招財貓 · 實體門店到訪導引
              </h4>

              <div className="space-y-2 text-xs text-stone-600 leading-relaxed">
                <p>
                  <strong>門店地址：</strong>{STORE_INFO.address}（位於圓環西路主要幹道，門口路段臨停與周邊停車便利）
                </p>
                <p>
                  <strong>開車前往：</strong>國道1號豐原交流道下，車程約 5-8 分鐘即可抵達。
                </p>
                <p>
                  <strong>大眾運輸：</strong>可搭乘台鐵至「豐原車站」後轉搭公車或計程車約 5 分鐘抵達。
                </p>
                <p className="text-amber-900 font-medium pt-1">
                  ※ 門店為確保每位貓家長獲得最詳盡的一對一介紹，建議來訪前可先致電或 LINE 告知！
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <a
                  href={`tel:${STORE_INFO.phone}`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-amber-900" />
                  <span>撥打電話預約時間</span>
                </a>
                <a
                  href={STORE_INFO.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:underline"
                >
                  <span>Google 地圖路線規劃</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Embedded Visual Map Preview Frame */}
            <div className="lg:col-span-6">
              <div className="relative rounded-xl overflow-hidden border border-stone-200 aspect-16/10 bg-stone-100 flex flex-col justify-between p-6">
                {/* Simulated stylized street map card */}
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                    Location Pin
                  </div>
                  <div className="font-serif-title font-bold text-stone-900 text-lg">
                    花花招財貓 · 實體門店
                  </div>
                  <div className="text-xs text-stone-600">
                    臺中市豐原區圓環西路97號
                  </div>
                </div>

                <div className="bg-white/95 backdrop-blur-xs p-4 rounded-xl border border-stone-200 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-stone-900">
                        GPS 座標定位
                      </div>
                      <div className="text-[11px] text-stone-500 font-mono">
                        24.2505° N, 120.7180° E
                      </div>
                    </div>
                  </div>

                  <a
                    href={STORE_INFO.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 text-white text-xs font-semibold rounded-lg hover:bg-stone-800 transition-colors"
                  >
                    <span>開啟導航</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
