import React, { useEffect } from 'react';
import {
  STORE_INFO,
  INITIAL_SHOWCASE_PHOTOS
} from '../data/catVillaData';
import { trackEvent } from '../utils/analytics';
import {
  ArrowLeft,
  Calculator,
  Check,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  ShieldCheck,
  Sparkles,
  Truck
} from 'lucide-react';

interface TopicGuidePageProps {
  mode: 'craft' | 'showroom';
  onNavigateHome: (hash?: string) => void;
  onNavigateToPath: (path: string) => void;
}

export const TopicGuidePage: React.FC<TopicGuidePageProps> = ({
  mode,
  onNavigateHome,
  onNavigateToPath
}) => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });

    const metaDesc = document.querySelector('meta[name="description"]');
    const canonical = document.querySelector('link[rel="canonical"]');

    if (mode === 'craft') {
      document.title = '1.5cm純實木貓別墅工藝比較｜天然松木無甲醛 vs 市售貼皮薄板・花花招財貓';
      if (metaDesc) {
        metaDesc.setAttribute(
          'content',
          '買實木貓別墅必看避雷指南！花花招財貓全面採用1.5cm天然無甲醛松木、表面微防水漆與高透安全壓克力門，徹底打敗市售薄木板與刺鼻貼皮貓籠。全台免運享1年保固。'
        );
      }
      if (canonical) {
        canonical.setAttribute('href', 'https://hhcat.cc/guides/solid-wood-craft');
      }
    } else {
      document.title = '台中貓別墅實體門店｜豐原區圓環西路97號看1.5cm實木樣板與現貨・花花招財貓';
      if (metaDesc) {
        metaDesc.setAttribute(
          'content',
          '台中豐原實體門店歡迎預約親看 1.5cm 純松木貓別墅與門店現貨！地址：臺中市豐原區圓環西路97號，預約專線 0966-129-569，LINE：hhcat.cc，享一對一客製空間規劃。'
        );
      }
      if (canonical) {
        canonical.setAttribute('href', 'https://hhcat.cc/taichung-showroom');
      }
    }
  }, [mode]);

  if (mode === 'showroom') {
    return (
      <div className="bg-[#FAF8F5] min-h-screen pb-20">
        <div className="bg-white border-b border-stone-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => onNavigateHome()}
              className="inline-flex items-center gap-1.5 text-stone-700 hover:text-amber-900 font-semibold transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>返回花花招財貓首頁</span>
            </button>
            <span className="text-stone-500">台中豐原實體展示倉儲中心 · 預約看實木</span>
          </div>
        </div>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 space-y-12">
          {/* Hero Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 space-y-5">
              <div className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
                Taichung Fengyuan Showroom · 4.9★ Google 好評
              </div>
              <h1 className="font-serif-title text-2xl sm:text-4xl font-bold text-stone-900 leading-tight">
                網購怕買到臭木頭或薄木板？
                <span className="block text-amber-900 mt-1">
                  歡迎親臨台中豐原實體門店摸過再訂製
                </span>
              </h1>
              <p className="text-sm text-stone-600 leading-relaxed">
                許多純網拍貓櫃沒有實體據點，收到貨才知道木板薄又搖晃。花花招財貓在臺中市豐原區設有實體展示倉儲中心，現場陳列各尺寸實品貓別墅與 1.5cm 天然松木樣板，讓您親眼檢驗細節、聞一聞無甲醛木頭清香再決定！
              </p>

              <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-2.5 text-xs text-stone-700">
                <div className="font-bold text-stone-900 text-sm">門店資訊與來訪須知</div>
                <p>
                  <strong>地址：</strong>
                  {STORE_INFO.address}（國道 1 號豐原交流道下約 5–8 分鐘）
                </p>
                <p>
                  <strong>營業時間：</strong>
                  {STORE_INFO.hours}
                </p>
                <p className="text-amber-900 font-medium">
                  ※ 店長常外出親自到府安裝，來店前務必先致電或加 LINE 預約避免跑空。
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <a
                  href={STORE_INFO.lineUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent('showroom_line_booking', { source: 'taichung_showroom' })}
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#06C755] hover:bg-[#05b34c] rounded-xl shadow-xs"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>加 LINE 預約看實體（{STORE_INFO.lineId}）</span>
                </a>
                <a
                  href={`tel:${STORE_INFO.phone}`}
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-stone-800 bg-white border border-stone-300 hover:border-amber-800 rounded-xl"
                >
                  <Phone className="w-4 h-4 text-amber-800" />
                  <span>撥打 {STORE_INFO.phoneDisplay}</span>
                </a>
                <a
                  href={STORE_INFO.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-3 text-xs font-semibold text-stone-700 hover:text-amber-900"
                >
                  <Navigation className="w-4 h-4" />
                  <span>開啟 Google 地圖導航</span>
                </a>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-2xl overflow-hidden border border-stone-200 bg-white p-3 shadow-sm">
                <img
                  src={STORE_INFO.storefrontImage}
                  alt="花花招財貓-台中豐原客製化1.5cm松木貓別墅-實體門店圓環西路97號實景"
                  className="w-full aspect-4/3 object-cover rounded-xl"
                />
                <div className="pt-3 px-1 flex items-center justify-between text-xs text-stone-600">
                  <span className="font-semibold text-stone-900">臺中市豐原區圓環西路97號</span>
                  <span>支持現貨現場挑選 / 一對一客製規劃</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3-Step OMO Experience */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 space-y-6">
            <div>
              <div className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
                Online-Merge-Offline Experience
              </div>
              <h2 className="font-serif-title text-xl sm:text-2xl font-bold text-stone-900 mt-1">
                線上預約 × 實體看實木：純電商對手學不來的 3 步驟安心購
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs sm:text-sm">
              <div className="bg-stone-50 rounded-xl p-5 border border-stone-100 space-y-2">
                <div className="font-mono font-bold text-amber-900">01 / 線上先試算與挑款</div>
                <div className="font-bold text-stone-900 text-base">帶著家裡尺寸截圖來店</div>
                <p className="text-stone-600 text-xs leading-relaxed">
                  先用官網即時試算機估算高、深、長與想加裝的太空艙／通天柱，線上透明先看價格不踩雷。
                </p>
              </div>
              <div className="bg-stone-50 rounded-xl p-5 border border-stone-100 space-y-2">
                <div className="font-mono font-bold text-amber-900">02 / 豐原門店親手驗品質</div>
                <div className="font-bold text-stone-900 text-base">現場觸摸 1.5cm 松木厚度</div>
                <p className="text-stone-600 text-xs leading-relaxed">
                  親眼看實木承重、安全壓克力門靜音開關與微防水塗裝，若有喜歡的門市現貨也能直接現場挑走。
                </p>
              </div>
              <div className="bg-stone-50 rounded-xl p-5 border border-stone-100 space-y-2">
                <div className="font-mono font-bold text-amber-900">03 / 預組裝拍照驗收免運</div>
                <div className="font-bold text-stone-900 text-base">外縣市也能遠端同等級安心</div>
                <p className="text-stone-600 text-xs leading-relaxed">
                  客製下單完成後，特別訂製款出貨前會預組裝並拍照給您核對細節，新竹物流全台免運配送並享 1 年保固。
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onNavigateHome('#instock')}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-amber-900 hover:bg-amber-800 rounded-xl"
              >
                查看門市現貨清單
              </button>
              <button
                type="button"
                onClick={() => onNavigateHome('#estimator')}
                className="px-5 py-2.5 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-xl"
              >
                前往 30 秒試算客製價格
              </button>
              <button
                type="button"
                onClick={() => onNavigateToPath('/guides/solid-wood-craft')}
                className="px-4 py-2.5 text-xs font-semibold text-amber-900 hover:underline"
              >
                看 1.5cm 實木工藝比較 →
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // Mode: 'craft' (/guides/solid-wood-craft)
  return (
    <div className="bg-[#FAF8F5] min-h-screen pb-20">
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => onNavigateHome()}
            className="inline-flex items-center gap-1.5 text-stone-700 hover:text-amber-900 font-semibold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>返回花花招財貓首頁</span>
          </button>
          <span className="text-stone-500">選購實木貓別墅必看 · 材質與工藝避雷指南</span>
        </div>
      </div>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 space-y-12">
        <div className="max-w-3xl space-y-4">
          <div className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
            1.5cm Solid Pine Guide
          </div>
          <h1 className="font-serif-title text-2xl sm:text-4xl font-bold text-stone-900 leading-tight">
            實木貓別墅為什麼不能只看價格？
            <span className="block text-amber-900 mt-1">
              破解市售「貼皮薄板」與 1.5cm 純天然松木的關鍵差距
            </span>
          </h1>
          <p className="text-sm text-stone-600 leading-relaxed">
            網路上兩三千元的貓櫃外觀看似相似，拆箱後卻常遇到「刺鼻甲醛膠水味薰眼睛」、「板材只有 0.9 公分、多貓一跳就晃動」，或是「一沾水就膨脹發霉」。這份工藝指南整理了挑選貓別墅最該確認的 4 個標準，讓您一次買對用好幾年。
          </p>
        </div>

        {/* 3 Moat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-900 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="font-serif-title font-bold text-stone-900 text-lg">
              1. 足厚 1.5cm 純實木松木板
            </h2>
            <p className="text-xs text-stone-600 leading-relaxed">
              不使用碎木壓合板或木心貼皮板，全櫃體實打實做到 1.5 公分厚天然松木，承重力足夠應付成貓、布偶與緬因貓每日飛撲跳躍。
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-900 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h2 className="font-serif-title font-bold text-stone-900 text-lg">
              2. 無甲醛原木＋微防水漆＋安全壓克力
            </h2>
            <p className="text-xs text-stone-600 leading-relaxed">
              表面細心塗刷微防水漆防潮防潑水，日常濕布擦拭輕鬆好清理；門片採用高透耐磨壓克力取代易碎玻璃，不怕衝撞碎裂傷到毛孩。
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-900 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <h2 className="font-serif-title font-bold text-stone-900 text-lg">
              3. 豐原實體門店＋預組裝實拍驗貨
            </h2>
            <p className="text-xs text-stone-600 leading-relaxed">
              歡迎先到台中豐原圓環西路97號看實體，不方便到店也可享有特別訂製款出貨前預組裝拍照確認、店長示範組裝影片與 1 年保固。
            </p>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-xs">
          <h2 className="font-serif-title text-xl font-bold text-stone-900 mb-5">
            工藝規格實測對比表
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500">
                  <th className="py-3 pr-4">檢視重點</th>
                  <th className="py-3 px-4 font-bold text-amber-950 bg-amber-50/70">花花招財貓（1.5cm 純松木）</th>
                  <th className="py-3 pl-4">一般低價貼皮 / 鐵絲網籠</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                <tr>
                  <td className="py-3.5 pr-4 font-semibold text-stone-800">木板厚度</td>
                  <td className="py-3.5 px-4 bg-amber-50/40 font-semibold text-stone-900">1.5cm 足厚純松木</td>
                  <td className="py-3.5 pl-4 text-stone-500">0.8~1.2cm 偏薄易晃</td>
                </tr>
                <tr>
                  <td className="py-3.5 pr-4 font-semibold text-stone-800">甲醛氣味</td>
                  <td className="py-3.5 px-4 bg-amber-50/40 font-semibold text-stone-900">天然無甲醛、淡淡松木香</td>
                  <td className="py-3.5 pl-4 text-stone-500">合板貼皮膠水味重</td>
                </tr>
                <tr>
                  <td className="py-3.5 pr-4 font-semibold text-stone-800">尺寸自由度</td>
                  <td className="py-3.5 px-4 bg-amber-50/40 font-semibold text-stone-900">支援長寬高隨意修改＋1:1 照照片客製</td>
                  <td className="py-3.5 pl-4 text-stone-500">公版規格固定無法貼合牆面</td>
                </tr>
                <tr>
                  <td className="py-3.5 pr-4 font-semibold text-stone-800">售後安心度</td>
                  <td className="py-3.5 px-4 bg-amber-50/40 font-semibold text-stone-900">台中豐原實體門店＋拆箱錄影 1 年保固補件</td>
                  <td className="py-3.5 pl-4 text-stone-500">僅文字客服、補板件困難</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Real Showcase Proof */}
        <div className="space-y-4">
          <h2 className="font-serif-title text-xl font-bold text-stone-900">
            1.5cm 純實木客製完工實品範例
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {INITIAL_SHOWCASE_PHOTOS.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs"
              >
                <div className="aspect-4/3 bg-[#F6F2EC] p-2">
                  <img
                    src={item.imageUrl}
                    alt={`花花招財貓-台中豐原客製化1.5cm松木貓別墅-${item.dimensionsText}（${item.title}）`}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                </div>
                <div className="p-4 space-y-1.5 text-xs">
                  <div className="font-bold text-stone-900 text-sm">{item.title}</div>
                  <div className="font-mono text-amber-900">{item.dimensionsText}</div>
                  <p className="text-stone-600 leading-relaxed">{item.customerNote}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Action Strip */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="font-serif-title font-bold text-stone-900 text-lg">
              想依家裡尺寸打造專屬 1.5cm 實木貓別墅？
            </div>
            <div className="text-xs text-stone-600 flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-amber-800" />
              <span>線上 30 秒估價，或直接預約到台中豐原門店看實品樣板</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => onNavigateHome('#estimator')}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-amber-900 hover:bg-amber-800 rounded-xl"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>立即線上試算</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateToPath('/taichung-showroom')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-xl"
            >
              <MapPin className="w-3.5 h-3.5 text-amber-800" />
              <span>預約豐原門店</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
