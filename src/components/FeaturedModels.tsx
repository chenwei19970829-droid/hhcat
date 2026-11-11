import React, { useState } from 'react';
import { FEATURED_MODELS, VillaModel, STORE_INFO } from '../data/catVillaData';
import { Maximize2, Calculator, MessageCircle, Check, Sparkles } from 'lucide-react';

interface FeaturedModelsProps {
  onSelectForQuote: (model: VillaModel) => void;
  onOpenImageZoom: (imageTitle: string, imageUrl: string, subtitle?: string) => void;
}

export const FeaturedModels: React.FC<FeaturedModelsProps> = ({
  onSelectForQuote,
  onOpenImageZoom
}) => {
  const [filter, setFilter] = useState<'all' | '90' | '120' | '150' | '180'>('all');

  const filteredModels = FEATURED_MODELS.filter((model) => {
    if (filter === 'all') return true;
    return model.heightGroup === filter;
  });

  return (
    <section id="models" className="py-16 sm:py-20 border-b border-stone-200 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-amber-800">
              Handcrafted Cat Villas · A-Z 款式目錄
            </div>
            <h2 className="font-serif-title text-2xl sm:text-3xl font-bold text-stone-900 mt-1">
              精選貓別墅款式
            </h2>
            <p className="text-sm text-stone-600 mt-1">
              純實木板厚度足 1.5cm · 天然松木無甲醛 · 高透耐磨安全亞克力門 · 支援 1:1 照照片量身訂做
            </p>
          </div>

          {/* Category Filter Controls: 全部尺寸、高90、高120、高150、高180 */}
          <div className="inline-flex flex-wrap items-center p-1 bg-stone-200/70 rounded-xl self-start md:self-auto gap-1">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-all ${
                filter === 'all'
                  ? 'bg-white text-stone-900 shadow-xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              全部尺寸 ({FEATURED_MODELS.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('90')}
              className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-all ${
                filter === '90'
                  ? 'bg-white text-stone-900 shadow-xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              高90 系列
            </button>
            <button
              type="button"
              onClick={() => setFilter('120')}
              className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-all ${
                filter === '120'
                  ? 'bg-white text-stone-900 shadow-xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              高120 系列
            </button>
            <button
              type="button"
              onClick={() => setFilter('150')}
              className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-all ${
                filter === '150'
                  ? 'bg-white text-stone-900 shadow-xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              高150 系列
            </button>
            <button
              type="button"
              onClick={() => setFilter('180')}
              className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-all ${
                filter === '180'
                  ? 'bg-white text-stone-900 shadow-xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              高180 系列
            </button>
          </div>
        </div>

        {/* Models Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredModels.map((model) => (
            <div
              key={model.id}
              className="bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-lg hover:border-amber-800/40 transition-all flex flex-col group"
            >
              {/* Product Studio Refined Photo with Click Zoom */}
              <div
                className="relative aspect-4/3 bg-[#F6F2EC] p-2 cursor-pointer overflow-hidden border-b border-stone-100 flex items-center justify-center"
                onClick={() =>
                  onOpenImageZoom(
                    model.name,
                    model.image,
                    `規格：${model.dimensions.dimensionCode}（高${model.dimensions.height} x 深${model.dimensions.depth} x 長${model.dimensions.length} cm）`
                  )
                }
                title="點擊放大查看高清精修細節圖"
              >
                <img
                  src={model.image}
                  alt={model.name}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />

                {/* Zoom indicator overlay */}
                <div className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-xs rounded-lg text-stone-700 shadow-xs group-hover:bg-amber-900 group-hover:text-white transition-colors">
                  <Maximize2 className="w-4 h-4" />
                </div>

                {/* Badge */}
                {model.badge && (
                  <div className="absolute top-3 left-3 bg-amber-900 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md shadow-xs">
                    {model.badge}
                  </div>
                )}

                {/* Dimension tag at bottom */}
                <div className="absolute bottom-3 left-3 bg-stone-900/80 backdrop-blur-xs text-white text-xs px-2.5 py-1 rounded font-mono">
                  {model.dimensions.dimensionCode} cm
                </div>

                {/* Free shipping pill */}
                <div className="absolute bottom-3 right-3 bg-emerald-700/90 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded font-medium">
                  免運 (偏遠離島除外)
                </div>
              </div>

              {/* Content Body */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-serif-title font-bold text-stone-900 text-lg group-hover:text-amber-900 transition-colors">
                      {model.name}
                    </h3>
                    <span className="text-xs text-stone-500 font-medium whitespace-nowrap">
                      {model.heightGroupLabel}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {model.subtitle}
                  </p>

                  {/* Specs Table */}
                  <div className="mt-4 pt-3 border-t border-stone-100 space-y-1.5 text-xs">
                    <div className="flex justify-between text-stone-600">
                      <span className="text-stone-400">尺寸 (高/深/長)</span>
                      <span className="font-semibold text-stone-800 font-mono">
                        {model.dimensions.height} × {model.dimensions.depth} × {model.dimensions.length} cm
                      </span>
                    </div>
                    <div className="flex justify-between text-stone-600">
                      <span className="text-stone-400">建議貓口</span>
                      <span className="font-medium text-stone-800">{model.recommendedCats}</span>
                    </div>
                    <div className="flex justify-between text-stone-600">
                      <span className="text-stone-400">板材厚度</span>
                      <span className="text-stone-800 font-bold font-mono">純實木足 1.5cm</span>
                    </div>
                    <div className="flex justify-between text-stone-600">
                      <span className="text-stone-400">門片材質</span>
                      <span className="text-stone-700 font-medium">高透耐磨安全亞克力</span>
                    </div>
                  </div>

                  {/* Highlights / Included accessories */}
                  <div className="mt-3 bg-stone-50 rounded-lg p-2.5 text-xs text-stone-600 space-y-1">
                    <div className="font-medium text-amber-900 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-amber-700" />
                      <span>配置亮點</span>
                    </div>
                    <ul className="space-y-0.5 pl-4 list-disc text-stone-600">
                      {model.includedAccessories.map((acc, i) => (
                        <li key={i}>{acc}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Price & Action row */}
                <div className="pt-4 border-t border-stone-100">
                  <div className="flex items-baseline justify-between mb-3">
                    <div>
                      <span className="text-[11px] text-stone-400">客製空屋價（免運不含偏遠離島）</span>
                      <div className="text-2xl font-bold text-amber-900 font-mono tabular-nums">
                        NT$ {model.price.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-stone-500">
                      <span>到府安裝工資</span>
                      <div className="font-mono text-stone-700 font-semibold">
                        + NT$ {model.installFee.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectForQuote(model)}
                      className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
                    >
                      <Calculator className="w-3.5 h-3.5 text-amber-800" />
                      <span>帶入試算</span>
                    </button>

                    <a
                      href={`${STORE_INFO.lineUrl}?text=${encodeURIComponent(
                        `您好！我在花花招財貓網站看到【${model.name} (${model.dimensions.dimensionCode})】，想諮詢客製排單與發貨時程！`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1 py-2.5 px-3 text-xs font-semibold text-white bg-[#06C755] hover:bg-[#05b34c] rounded-lg shadow-xs transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>LINE 諮詢此款</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
