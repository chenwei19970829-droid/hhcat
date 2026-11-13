import React, { useState } from 'react';
import { MENU_CATEGORIES, ACCESSORY_OPTIONS } from '../data/catVillaData';
import { Eye, Info, FileText, ArrowRight, Sparkles } from 'lucide-react';

interface PriceCatalogProps {
  onOpenOriginalMenuModal: (lengthIndex?: number) => void;
  onSelectDimensionForEstimator: (length: number, height: number) => void;
}

export const PriceCatalog: React.FC<PriceCatalogProps> = ({
  onOpenOriginalMenuModal,
  onSelectDimensionForEstimator
}) => {
  const [activeTabLength, setActiveTabLength] = useState<number>(120);

  const activeCategory = MENU_CATEGORIES.find((c) => c.length === activeTabLength) || MENU_CATEGORIES[2];

  return (
    <section id="catalog" className="py-16 sm:py-20 border-b border-stone-200 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-amber-800">
              Official Price Catalog
            </div>
            <h2 className="font-serif-title text-2xl sm:text-3xl font-bold text-stone-900 mt-1">
              花花招財貓 · 門店標準報價單
            </h2>
            <p className="text-sm text-stone-600 mt-1">
              全尺寸透明公開定價，純實木板厚度足 1.5cm，手工客製排單，付款後 14-21 天內宅配到府
            </p>
          </div>

          {/* Action: View Original Paper Menus */}
          <button
            type="button"
            onClick={() => onOpenOriginalMenuModal(MENU_CATEGORIES.findIndex((c) => c.length === activeTabLength))}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-xl transition-colors self-start md:self-auto shrink-0"
          >
            <FileText className="w-4 h-4 text-amber-900" />
            <span>對照門店原廠紙本 MENU (5張)</span>
          </button>
        </div>

        {/* Custom Dimension Surcharge Note */}
        <div className="mb-8 p-4 bg-amber-50/90 rounded-2xl border border-amber-200/90 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="font-semibold text-amber-950">
            支援 1:1 依圖客製，高度與深度皆可彈性加碼：
          </div>
          <div className="text-[11px] text-stone-700 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>深度超過 60cm：每 10cm +NT$ 3,000</span>
            <span className="hidden sm:inline text-stone-300">|</span>
            <span>垂直高度超過 180cm：每 10cm +NT$ 1,000</span>
          </div>
        </div>

        {/* Length Series Tabs */}
        <div className="flex overflow-x-auto pb-2 gap-2 border-b border-stone-200 no-scrollbar">
          {MENU_CATEGORIES.map((cat) => (
            <button
              key={cat.length}
              type="button"
              onClick={() => setActiveTabLength(cat.length)}
              className={`px-5 py-3 text-xs font-semibold rounded-t-xl transition-all whitespace-nowrap border-b-2 flex items-center gap-2 ${
                activeTabLength === cat.length
                  ? 'border-amber-900 text-amber-900 bg-amber-50/70'
                  : 'border-transparent text-stone-500 hover:text-stone-800 hover:bg-stone-100/60'
              }`}
            >
              <span>長度 {cat.length} cm 系列</span>
              <span className="text-[10px] text-stone-400">({cat.items.length} 款高度)</span>
            </button>
          ))}
        </div>

        {/* Tab Content: Pricing Matrix Table */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Interactive Table */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
            <div className="p-5 bg-stone-50/80 border-b border-stone-200 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-serif-title font-bold text-stone-900 text-base">
                  {activeCategory.title}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  所有尺寸標示格式為：高 - 深度 - 長度（單位：公分）
                </p>
              </div>

              <button
                type="button"
                onClick={() => onOpenOriginalMenuModal(MENU_CATEGORIES.findIndex((c) => c.length === activeTabLength))}
                className="text-xs font-medium text-amber-900 hover:underline flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>放大看此系列實體 MENU 圖</span>
              </button>
            </div>

            {/* Mobile View: Clean, Spacious Model Cards (md:hidden) */}
            <div className="md:hidden divide-y divide-stone-100">
              {activeCategory.items.map((item) => (
                <div
                  key={item.dimensionCode}
                  className="p-4 bg-white hover:bg-amber-50/30 transition-colors space-y-3"
                >
                  {/* Row 1: Model Code & Price */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-base text-amber-950 tracking-tight whitespace-nowrap bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/80 shadow-2xs">
                          {item.dimensionCode}
                        </span>
                        {item.bundledNote && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-md border border-amber-300">
                            <Sparkles className="w-3 h-3 text-amber-700" />
                            <span>{item.bundledNote}</span>
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-stone-600 mt-1.5 font-medium">
                        高 {item.height} × 深 {item.depth} × 長 {item.length} cm
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-stone-400 block font-medium">客製售價</span>
                      <span className="font-mono font-bold text-base text-amber-900 tabular-nums">
                        NT$ {item.price.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: Specifications summary */}
                  <div className="grid grid-cols-2 gap-2 text-xs py-2 px-3 bg-stone-50 rounded-xl border border-stone-100">
                    <div>
                      <span className="text-stone-400 text-[11px] block">到府安裝工資</span>
                      <span className="font-mono font-semibold text-stone-800">
                        NT$ {item.installFee.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400 text-[11px] block">配置說明</span>
                      <span className="text-stone-700 font-medium">
                        {item.bundledNote ? '標配 + 附贈配件' : '純實木1.5cm 標配'}
                      </span>
                    </div>
                  </div>

                  {/* Row 3: Action Button */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => onSelectDimensionForEstimator(item.length, item.height)}
                      className="w-full py-2.5 px-3 text-xs font-semibold text-stone-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <span>試算此規格</span>
                      <ArrowRight className="w-3.5 h-3.5 text-amber-800" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View: Wide Table with Non-wrapping Headers (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-100/70 text-stone-600 font-semibold">
                    <th className="py-3 px-4 whitespace-nowrap">尺寸規格 (高-深-長)</th>
                    <th className="py-3 px-4 whitespace-nowrap">內附配件說明</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">客製空屋售價</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">到府安裝工資</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">快捷試算</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {activeCategory.items.map((item) => (
                    <tr
                      key={item.dimensionCode}
                      className="hover:bg-amber-50/40 transition-colors"
                    >
                      <td className="py-4 px-4 font-mono font-bold text-stone-900 text-sm whitespace-nowrap">
                        {item.dimensionCode}
                        <span className="block text-[11px] font-normal text-stone-500 whitespace-nowrap mt-0.5">
                          高 {item.height} × 深 {item.depth} × 長 {item.length} cm
                        </span>
                      </td>

                      <td className="py-4 px-4 text-stone-600">
                        {item.bundledNote ? (
                          <span className="inline-flex items-center gap-1 text-amber-900 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 whitespace-nowrap">
                            <Sparkles className="w-3 h-3 text-amber-700" />
                            {item.bundledNote}
                          </span>
                        ) : (
                          <span className="text-stone-400 whitespace-nowrap">標準配置（可自由加裝）</span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-right font-mono font-bold text-base text-amber-900 tabular-nums whitespace-nowrap">
                        NT$ {item.price.toLocaleString()}
                      </td>

                      <td className="py-4 px-4 text-right font-mono text-stone-600 tabular-nums whitespace-nowrap">
                        NT$ {item.installFee.toLocaleString()}
                      </td>

                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onSelectDimensionForEstimator(item.length, item.height)}
                          className="px-3 py-1.5 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-md transition-colors whitespace-nowrap"
                        >
                          試算此規格
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Note bar */}
            <div className="p-4 bg-stone-50 border-t border-stone-200 text-xs text-stone-600 flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-800 shrink-0" />
              <span>
                配送至一樓（免運不含偏遠與離島）· 出貨前預組裝拍照確認 · 享 1 年保固（無電梯需爬樓梯搬運請提前報備）
              </span>
            </div>
          </div>

          {/* Right Column: Accessory Upgrade Menu (加裝配件表) */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
            <div className="border-b border-stone-100 pb-3">
              <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
                Full Customization Add-ons
              </span>
              <h3 className="font-serif-title font-bold text-stone-900 text-lg">
                加裝配件價目（單件）
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                全套客製化自由選購，隨別墅排單製作無縫安裝
              </p>
            </div>

            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {ACCESSORY_OPTIONS.map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center justify-between p-2.5 bg-stone-50 hover:bg-amber-50/50 rounded-xl transition-colors border border-stone-100"
                >
                  <div className="pr-2">
                    <div className="text-xs font-bold text-stone-900">{acc.name}</div>
                    <div className="text-[11px] text-stone-500 line-clamp-1">{acc.description}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-xs text-amber-900 tabular-nums">
                      + NT$ {acc.price.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2.5 border-t border-stone-100 text-[11px] text-stone-500 space-y-1">
              <p>※ 實木抽屜 $1,500、太空艙加大款(30cm) $1,500 / 太空艙基礎款(25cm)、全透明片、金屬網門 $1,000</p>
              <p>※ 自由進出小門(四段切換)、通天柱 $800 / 實木吊床 $500 / 抓柱、安全造型柵欄、吊橋、貓窩 $300</p>
              <p className="text-amber-900 font-medium">※ 太空艙選配基礎款為直徑25cm（$1,000）、加大款為直徑30cm（$1,500）</p>
              <p className="text-stone-400">※ 全透明片：左側板、右側板或背板皆可更改，單片1,000元（長度超過60cm背板為兩片）</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
