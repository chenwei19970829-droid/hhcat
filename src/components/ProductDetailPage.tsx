import React, { useState, useEffect } from 'react';
import {
  VillaModel,
  FEATURED_MODELS,
  ACCESSORY_OPTIONS,
  STORE_INFO
} from '../data/catVillaData';
import { MultiPhotoLightbox } from './MultiPhotoLightbox';
import { ImageProtectionLayer, protectedMediaContainerProps } from './ImageProtectionLayer';
import { trackEvent } from '../utils/analytics';
import {
  ArrowLeft,
  Calculator,
  Check,
  ChevronRight,
  Images,
  MapPin,
  Maximize2,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Truck
} from 'lucide-react';

interface ProductDetailPageProps {
  model: VillaModel;
  allModels: VillaModel[];
  onNavigateHome: (hash?: string) => void;
  onNavigateToPath: (path: string) => void;
  onSelectForQuote: (model: VillaModel) => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  model,
  allModels,
  onNavigateHome,
  onNavigateToPath,
  onSelectForQuote
}) => {
  const images = model.images && model.images.length > 0 ? model.images : [model.image];
  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState(0);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [includeInstall, setIncludeInstall] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Quick popular add-ons shown directly on PDP for immediate estimation
  const quickAddons = ACCESSORY_OPTIONS.slice(0, 6);

  useEffect(() => {
    setSelectedPhotoIdx(0);
    setSelectedAddonIds([]);
    setIncludeInstall(false);
    window.scrollTo({ top: 0, behavior: 'auto' });

    const pageTitle = `${model.name} 實木貓別墅｜花花招財貓 1.5cm天然松木客製（NT$${model.price.toLocaleString()}起）`;
    document.title = pageTitle;

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        `${model.name}，尺寸高${model.dimensions.height}×深${model.dimensions.depth}×長${model.dimensions.length}cm，嚴選1.5cm天然無甲醛松木與高透耐磨安全壓克力門。空屋NT$${model.price.toLocaleString()}，出貨前預組裝拍照確認、全台免運含1年保固。`
      );
    }

    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute('href', `https://hhcat.cc/villa/${encodeURIComponent(model.id)}`);
    }

    trackEvent('view_product_page', {
      model_id: model.id,
      model_name: model.name,
      price: model.price
    });
  }, [model]);

  const toggleAddon = (id: string) => {
    setSelectedAddonIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const addonTotal = quickAddons
    .filter((a) => selectedAddonIds.includes(a.id))
    .reduce((sum, a) => sum + a.price, 0);

  const installTotal = includeInstall ? model.installFee : 0;
  const grandTotal = model.price + addonTotal + installTotal;

  const selectedAddonNames = quickAddons
    .filter((a) => selectedAddonIds.includes(a.id))
    .map((a) => `${a.name}(+$${a.price.toLocaleString()})`);

  const lineMessage = [
    `您好！我想諮詢官網這款貓別墅：`,
    `• 款式：${model.name}`,
    `• 規格：高${model.dimensions.height} × 深${model.dimensions.depth} × 長${model.dimensions.length} cm`,
    `• 空屋定價：NT$ ${model.price.toLocaleString()}`,
    selectedAddonNames.length > 0 ? `• 預計加選：${selectedAddonNames.join('、')}` : null,
    includeInstall ? `• 含到府安裝參考工資：NT$ ${model.installFee.toLocaleString()}（不含車馬費）` : null,
    `• 試算小計：NT$ ${grandTotal.toLocaleString()}`,
    `請問這組目前的製作排單與客製細節？`
  ]
    .filter(Boolean)
    .join('\n');

  const lineWithTextUrl = `https://line.me/R/oaMessage/@hhcat.cc/?${encodeURIComponent(lineMessage)}`;

  const relatedModels = (allModels.length > 0 ? allModels : FEATURED_MODELS)
    .filter((m) => m.id !== model.id)
    .sort((a, b) => {
      const aSame = a.heightGroup === model.heightGroup ? 0 : 1;
      const bSame = b.heightGroup === model.heightGroup ? 0 : 1;
      return aSame - bSame;
    })
    .slice(0, 3);

  const featuresList =
    model.includedAccessories && model.includedAccessories.length > 0
      ? model.includedAccessories
      : model.highlights;

  return (
    <div className="bg-[#FAF8F5] min-h-screen pb-20">
      {/* Top Breadcrumb Bar */}
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <nav aria-label="麵包屑導覽" className="flex items-center gap-1.5 text-stone-500 flex-wrap">
            <button
              type="button"
              onClick={() => onNavigateHome()}
              className="hover:text-amber-900 font-medium transition-colors"
            >
              花花招財貓首頁
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
            <button
              type="button"
              onClick={() => onNavigateHome('#models')}
              className="hover:text-amber-900 font-medium transition-colors"
            >
              {model.heightGroupLabel}
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-stone-900 font-semibold">{model.name}</span>
          </nav>

          <button
            type="button"
            onClick={() => onNavigateHome('#models')}
            className="inline-flex items-center gap-1.5 text-stone-700 hover:text-amber-900 font-semibold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>返回全部款式</span>
          </button>
        </div>
      </div>

      {/* Main Contiguous Product Detail Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Sticky Gallery */}
          <div className="lg:col-span-6 lg:sticky lg:top-24 space-y-4">
            <div
              onClick={() => setLightboxOpen(true)}
              {...protectedMediaContainerProps}
              className="relative aspect-4/3 bg-[#F6F2EC] rounded-2xl border border-stone-200 overflow-hidden cursor-pointer group flex items-center justify-center p-3 shadow-xs protected-media"
            >
              <img
                src={images[selectedPhotoIdx] || model.image}
                alt={`花花招財貓-台中豐原客製化1.5cm松木貓別墅-${model.dimensions.dimensionCode}cm（${model.name}）`}
                draggable={false}
                className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-300"
              />
              <ImageProtectionLayer
                showVisualLogo={!model.watermarked}
                badgePosition="bottom-right"
                size="lg"
              />
              <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                {images.length > 1 && (
                  <span className="px-2.5 py-1 bg-stone-900/75 text-white text-xs font-semibold rounded-lg flex items-center gap-1">
                    <Images className="w-3.5 h-3.5 text-amber-300" />
                    <span>
                      {selectedPhotoIdx + 1} / {images.length}
                    </span>
                  </span>
                )}
                <span className="p-2 bg-white/90 text-stone-800 rounded-lg shadow-xs group-hover:bg-amber-900 group-hover:text-white transition-colors">
                  <Maximize2 className="w-4 h-4" />
                </span>
              </div>
              <div className="absolute bottom-3 left-3 bg-stone-900/80 text-white text-xs font-mono px-2.5 py-1 rounded z-10">
                {model.dimensions.dimensionCode} cm
              </div>
            </div>

            {images.length > 1 && (
              <div className="grid grid-cols-5 gap-2.5">
                {images.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedPhotoIdx(idx)}
                    {...protectedMediaContainerProps}
                    className={`aspect-4/3 rounded-xl overflow-hidden border bg-[#F6F2EC] p-1 transition-all protected-media ${
                      selectedPhotoIdx === idx
                        ? 'border-amber-900 ring-2 ring-amber-900/20'
                        : 'border-stone-200 hover:border-stone-400 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={imgUrl}
                      alt={`${model.name} 實拍角度 ${idx + 1}`}
                      draggable={false}
                      className="w-full h-full object-contain"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Storefront Physical Trust Link */}
            <div className="bg-white rounded-2xl border border-stone-200 p-4 flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-900 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="text-xs">
                  <div className="font-bold text-stone-900">台中豐原實體門店 · 親手摸實木看做工</div>
                  <div className="text-stone-500 mt-0.5 leading-relaxed">
                    擔心網購木頭太薄或有甲醛刺鼻味？歡迎預約到「圓環西路97號」現場體驗 1.5cm 松木樣板。
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigateToPath('/taichung-showroom')}
                className="px-3 py-2 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-lg whitespace-nowrap shrink-0 transition-colors"
              >
                預約看店
              </button>
            </div>
          </div>

          {/* Right Column: Contiguous Specs, Add-ons & Conversion Module */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="space-y-2 border-b border-stone-100 pb-5">
              <div className="flex items-center gap-2 text-xs text-stone-500 font-medium">
                <span className="text-amber-900 font-semibold">{model.heightGroupLabel}</span>
                <span aria-hidden="true">·</span>
                <span>純實木足 1.5cm 天然無甲醛松木</span>
                {model.badge && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-stone-800 font-semibold">{model.badge}</span>
                  </>
                )}
              </div>

              <h1 className="font-serif-title text-xl sm:text-3xl font-bold text-stone-900 leading-tight">
                <span className="inline-block">{model.name}</span>{' '}
                <span className="inline-block whitespace-nowrap text-amber-900">實木客製貓別墅</span>
              </h1>
              <p className="text-sm text-stone-600 leading-relaxed">{model.description}</p>
            </div>

            {/* Key Specs Table */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-stone-50 rounded-xl p-3 border border-stone-100">
                <span className="text-stone-400 block">標準外徑尺寸 (高×深×長)</span>
                <span className="font-mono tabular-nums font-bold text-stone-900 text-sm mt-0.5 block">
                  {model.dimensions.height} × {model.dimensions.depth} × {model.dimensions.length} cm
                </span>
              </div>
              <div className="bg-stone-50 rounded-xl p-3 border border-stone-100">
                <span className="text-stone-400 block">建議貓口與空間</span>
                <span className="font-semibold text-stone-900 text-sm mt-0.5 block">
                  {model.recommendedCats}
                </span>
              </div>
              <div className="bg-stone-50 rounded-xl p-3 border border-stone-100">
                <span className="text-stone-400 block">板材實木厚度</span>
                <span className="font-bold text-amber-900 text-sm mt-0.5 block">
                  全純實木足 1.5cm（拒絕貼皮）
                </span>
              </div>
              <div className="bg-stone-50 rounded-xl p-3 border border-stone-100">
                <span className="text-stone-400 block">門片與漆面工藝</span>
                <span className="font-semibold text-stone-900 text-sm mt-0.5 block">
                  高透耐磨壓克力＋微防水漆
                </span>
              </div>
            </div>

            {/* Included Highlights */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-stone-800">本款標配亮點（可依圖 1:1 微調）</div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-700">
                {featuresList.map((feat, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick Optional Add-ons Calculator */}
            <div className="border-t border-stone-100 pt-5 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-stone-900">快速勾選熱門客製配件（即時計算）</span>
                <span className="text-stone-500">可於試算機調整長寬高</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {quickAddons.map((addon) => {
                  const checked = selectedAddonIds.includes(addon.id);
                  return (
                    <button
                      key={addon.id}
                      type="button"
                      onClick={() => toggleAddon(addon.id)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition-all ${
                        checked
                          ? 'bg-amber-50 border-amber-800 text-stone-900 font-semibold'
                          : 'bg-white border-stone-200 text-stone-700 hover:border-stone-300'
                      }`}
                    >
                      <span className="truncate pr-2">{addon.name}</span>
                      <span className="font-mono tabular-nums text-amber-900 shrink-0">
                        +NT$ {addon.price.toLocaleString()}
                      </span>
                    </button>
                  );
                })}
              </div>

              <label className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs cursor-pointer hover:border-amber-700 transition-colors">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={includeInstall}
                    onChange={(e) => setIncludeInstall(e.target.checked)}
                    className="rounded border-stone-300 text-amber-900 focus:ring-amber-800"
                  />
                  <span className="font-medium text-stone-800">
                    加選專人到府組裝參考工資（車馬費依地區另計）
                  </span>
                </div>
                <span className="font-mono tabular-nums font-bold text-stone-900">
                  +NT$ {model.installFee.toLocaleString()}
                </span>
              </label>
            </div>

            {/* Pricing Display + Conversion CTAs */}
            <div className="border-t border-stone-200 pt-5 space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-xs text-stone-500 block">
                    {addonTotal > 0 || includeInstall ? '客製試算參考總額' : '客製空屋基準價（全台免運）'}
                  </span>
                  <div className="text-3xl font-bold text-amber-900 font-mono tabular-nums mt-0.5">
                    NT$ {grandTotal.toLocaleString()}
                  </div>
                </div>
                <div className="text-right text-xs text-stone-500">
                  <div>預組裝實拍確認後出貨</div>
                  <div className="font-semibold text-stone-700 mt-0.5">享 1 年非人為保固</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a
                  href={lineWithTextUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    trackEvent('pdp_line_quote', {
                      model_id: model.id,
                      total_estimate: grandTotal
                    })
                  }
                  className="inline-flex items-center justify-center gap-2 py-3.5 px-5 text-sm font-semibold text-white bg-[#06C755] hover:bg-[#05b34c] rounded-xl shadow-xs transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>一鍵傳 LINE 確認此款報價</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    onSelectForQuote(model);
                    onNavigateHome('#estimator');
                  }}
                  className="inline-flex items-center justify-center gap-2 py-3.5 px-5 text-sm font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-xl transition-all"
                >
                  <Calculator className="w-4 h-4 text-amber-800" />
                  <span>進試算機改深/改高</span>
                </button>
              </div>

              {/* Trust Strip */}
              <div className="grid grid-cols-3 gap-2 pt-2 text-[11px] text-stone-600 text-center">
                <div className="bg-stone-50 rounded-lg p-2 border border-stone-100 flex flex-col items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-amber-800" />
                  <span>1.5cm 無甲醛松木</span>
                </div>
                <div className="bg-stone-50 rounded-lg p-2 border border-stone-100 flex flex-col items-center gap-1">
                  <Sparkles className="w-4 h-4 text-amber-800" />
                  <span>出貨預組裝實拍</span>
                </div>
                <div className="bg-stone-50 rounded-lg p-2 border border-stone-100 flex flex-col items-center gap-1">
                  <Truck className="w-4 h-4 text-amber-800" />
                  <span>全台免運 1 年保固</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Competitive Moat Comparison Section */}
        <div className="mt-14 bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <div className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
                Why Choose Hua Hua Lucky Cat
              </div>
              <h2 className="font-serif-title text-xl sm:text-2xl font-bold text-stone-900 mt-1">
                花花招財貓 1.5cm 純實木 vs 市售網購貓櫃差異對比
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToPath('/guides/solid-wood-craft')}
              className="text-xs font-semibold text-amber-900 hover:underline self-start sm:self-auto"
            >
              閱讀完整 1.5cm 松木工藝避雷指南 →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500">
                  <th className="py-3 pr-4 font-semibold">比較項目</th>
                  <th className="py-3 px-4 font-bold text-amber-950 bg-amber-50/70 rounded-tl-xl">
                    花花招財貓（純實木客製）
                  </th>
                  <th className="py-3 pl-4 font-medium text-stone-500">市售低價網購／貼皮薄板貓籠</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                <tr>
                  <td className="py-3.5 pr-4 font-semibold text-stone-800">板材厚度與結構</td>
                  <td className="py-3.5 px-4 bg-amber-50/40 font-semibold text-stone-900">
                    全純實木板實測足 1.5cm，多隻大貓蹦跳不搖晃變形
                  </td>
                  <td className="py-3.5 pl-4 text-stone-500">
                    常見 0.8~1.2cm 貼皮密度板或碎木膠合板，久了易塌陷
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 pr-4 font-semibold text-stone-800">氣味與防水安全</td>
                  <td className="py-3.5 px-4 bg-amber-50/40 font-semibold text-stone-900">
                    天然無甲醛松木＋微防水漆塗層，擦拭不滲水發霉
                  </td>
                  <td className="py-3.5 pl-4 text-stone-500">
                    刺鼻黏著劑甲醛味重，貓尿或打翻水碗容易泡爛膨脹
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 pr-4 font-semibold text-stone-800">門片安全性</td>
                  <td className="py-3.5 px-4 bg-amber-50/40 font-semibold text-stone-900">
                    高透耐磨安全壓克力門，輕巧防爆撞不碎裂
                  </td>
                  <td className="py-3.5 pl-4 text-stone-500">
                    易碎玻璃危險性高，或傳統鐵籠卡爪生鏽不美觀
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 pr-4 font-semibold text-stone-800">門店保障與驗貨</td>
                  <td className="py-3.5 px-4 bg-amber-50/40 font-semibold text-stone-900 rounded-bl-xl">
                    台中豐原實體店可看實品 + 出貨預組裝實拍確認 + 1 年保固
                  </td>
                  <td className="py-3.5 pl-4 text-stone-500">
                    純網拍無實體店面，出貨開箱盲盒，售後找不到人補件
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Related Models Internal Linking Grid */}
        <div className="mt-14">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif-title text-xl sm:text-2xl font-bold text-stone-900">
              其他熱門推薦實木貓別墅款式
            </h2>
            <button
              type="button"
              onClick={() => onNavigateHome('#models')}
              className="text-xs font-semibold text-amber-900 hover:underline"
            >
              看全部 {allModels.length || FEATURED_MODELS.length} 款 →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedModels.map((rel) => (
              <div
                key={rel.id}
                onClick={() => onNavigateToPath(`/villa/${encodeURIComponent(rel.id)}`)}
                className="bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-md hover:border-amber-800/40 transition-all cursor-pointer flex flex-col"
              >
                <div
                  {...protectedMediaContainerProps}
                  className="relative aspect-4/3 bg-[#F6F2EC] p-2 border-b border-stone-100 overflow-hidden protected-media"
                >
                  <img
                    src={rel.image}
                    alt={`花花招財貓-台中豐原客製化1.5cm松木貓別墅-${rel.dimensions.dimensionCode}cm（${rel.name}）`}
                    draggable={false}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                  <ImageProtectionLayer
                    showVisualLogo={!rel.watermarked}
                    badgePosition="bottom-right"
                    size="sm"
                  />
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-serif-title font-bold text-stone-900 text-base">
                      {rel.name}
                    </h3>
                    <p className="text-xs text-stone-500 mt-1 line-clamp-2">{rel.subtitle}</p>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                    <span className="font-mono tabular-nums font-bold text-amber-900 text-lg">
                      NT$ {rel.price.toLocaleString()}
                    </span>
                    <span className="text-xs font-semibold text-stone-700">查看規格詳情 →</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <MultiPhotoLightbox
        isOpen={lightboxOpen}
        title={model.name}
        images={images}
        initialIndex={selectedPhotoIdx}
        subtitle={`規格：${model.dimensions.dimensionCode}（高${model.dimensions.height} x 深${model.dimensions.depth} x 長${model.dimensions.length} cm）`}
        watermarkedBaked={Boolean(model.watermarked)}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
};
