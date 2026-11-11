import React, { useState, useMemo, useEffect } from 'react';
import {
  STORE_INFO,
  TRAVEL_FEE_REGIONS,
  DEPTH_SURCHARGE_TIERS,
  HEIGHT_SURCHARGE_TIERS,
  ACCESSORY_OPTIONS,
  TravelFeeRegion,
  MENU_CATEGORIES
} from '../data/catVillaData';
import {
  Calculator,
  MessageCircle,
  Sparkles,
  MapPin,
  Check,
  RotateCcw,
  Truck,
  Plus,
  Minus,
  Info,
  ChevronRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface EstimatorCalculatorProps {
  initialLength?: number;
  initialHeight?: number;
  onOpenImageZoom?: (title: string, imageUrl: string, subtitle?: string) => void;
}

export const EstimatorCalculator: React.FC<EstimatorCalculatorProps> = ({
  initialLength = 120,
  initialHeight = 150
}) => {
  // Step 1: Height (第一步：高度)
  const [selectedHeight, setSelectedHeight] = useState<number>(initialHeight);
  // Step 2: Length (第二步：長度)
  const [selectedLength, setSelectedLength] = useState<number>(initialLength);
  // Step 3: Depth (第三步：深度)
  const [selectedDepthTierId, setSelectedDepthTierId] = useState<string>('depth-60');

  // Height Surcharge Tier (僅180cm可選挑高天花板)
  const [selectedHeightTierId, setSelectedHeightTierId] = useState<string>('height-standard');

  // Install mode & Travel Fee
  const [needInstall, setNeedInstall] = useState<boolean>(true);
  const [selectedRegionId, setSelectedRegionId] = useState<string>('tf-taichung');

  // Accessories
  const [selectedAccessories, setSelectedAccessories] = useState<Record<string, number>>({});

  useEffect(() => {
    if (initialHeight) setSelectedHeight(initialHeight);
    if (initialLength) setSelectedLength(initialLength);
  }, [initialHeight, initialLength]);

  // When height changes: if height is less than 180cm, force standard height tier
  useEffect(() => {
    if (selectedHeight < 180) {
      setSelectedHeightTierId('height-standard');
    }
  }, [selectedHeight]);

  // Find base price from menu data
  const baseCategory = MENU_CATEGORIES.find((c) => c.length === selectedLength);
  const matchedItem = baseCategory?.items.find((it) => it.height === selectedHeight);

  const basePrice = matchedItem ? matchedItem.price : 10800;
  const baseInstallFee = matchedItem ? matchedItem.installFee : 3500;

  const selectedDepthTier = DEPTH_SURCHARGE_TIERS.find((d) => d.id === selectedDepthTierId);
  const depthExtraFee = selectedDepthTier ? selectedDepthTier.extraFee : 0;

  const selectedHeightTier = HEIGHT_SURCHARGE_TIERS.find((h) => h.id === selectedHeightTierId);
  const heightExtraFee = selectedHeight < 180 ? 0 : (selectedHeightTier ? selectedHeightTier.extraFee : 0);

  const selectedRegion = TRAVEL_FEE_REGIONS.find((r) => r.id === selectedRegionId);
  const travelFee = needInstall ? (selectedRegion ? selectedRegion.recommendedFee : 0) : 0;
  const installFee = needInstall ? baseInstallFee : 0;

  const accessoryTotal = useMemo(() => {
    return Object.entries(selectedAccessories).reduce((sum, [accId, qty]) => {
      const acc = ACCESSORY_OPTIONS.find((a) => a.id === accId);
      return sum + (acc ? acc.price * qty : 0);
    }, 0);
  }, [selectedAccessories]);

  const grandTotal = basePrice + depthExtraFee + heightExtraFee + installFee + travelFee + accessoryTotal;

  const handleAccessoryChange = (id: string, delta: number) => {
    setSelectedAccessories((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: next };
    });
  };

  const handleReset = () => {
    setSelectedHeight(150);
    setSelectedLength(120);
    setSelectedDepthTierId('depth-60');
    setSelectedHeightTierId('height-standard');
    setNeedInstall(true);
    setSelectedRegionId('tf-taichung');
    setSelectedAccessories({});
  };

  return (
    <section id="estimator" className="py-16 sm:py-24 bg-[#FAF7F2] border-b border-stone-200 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold text-amber-900 bg-amber-500/10 border border-amber-600/20 mb-3">
            <Calculator className="w-3.5 h-3.5 text-amber-800" />
            <span>Online Instant Quoting Estimator</span>
          </div>
          <h2 className="font-serif-title text-2xl sm:text-4xl font-bold text-stone-900 tracking-tight">
            全套客製化 · 線上即時估價試算機
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-2 leading-relaxed">
            選擇您理想的貓別墅尺寸與加裝配件，價格透明即時計算，一鍵導出 LINE 與店長諮詢！
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Options Selection Form (Col 7) */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-stone-200 p-5 sm:p-7 shadow-xs space-y-7">

            {/* STEP 1: Height Selection (第一步：高度) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-900 text-white inline-flex items-center justify-center text-[11px]">1</span>
                  <span>第一步：選擇高度 (Height)</span>
                </span>
                <span className="text-xs font-semibold text-amber-900 font-mono">
                  目前選擇：{selectedHeight} cm
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[90, 120, 150, 180].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setSelectedHeight(h)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      selectedHeight === h
                        ? 'bg-amber-900 text-white border-amber-900 shadow-sm'
                        : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-800'
                    }`}
                  >
                    <div className="text-xs text-stone-400 font-mono">高度</div>
                    <div className="text-base font-bold font-mono mt-0.5">{h} cm</div>
                  </button>
                ))}
              </div>

              {/* Special Height Surcharge Option (ONLY visible when Height == 180cm) */}
              {selectedHeight === 180 ? (
                <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                  <div className="text-xs font-bold text-amber-950 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-800" />
                    <span>180cm 專屬：客製超高天花板規格加價</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {HEIGHT_SURCHARGE_TIERS.map((tier) => (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => setSelectedHeightTierId(tier.id)}
                        className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                          selectedHeightTierId === tier.id
                            ? 'bg-amber-900 text-white border-amber-900 font-bold'
                            : 'bg-white text-stone-700 border-stone-200 hover:bg-amber-100/50'
                        }`}
                      >
                        <div>{tier.label}</div>
                        <div className="text-[11px] text-stone-400 mt-0.5">{tier.note}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-stone-400 italic">
                  * 預設為標準高度。高度需超過 180cm 時，請選擇 180cm 高度開啟超高天花板客製選項。
                </div>
              )}
            </div>

            {/* STEP 2: Length Selection (第二步：長度) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-900 text-white inline-flex items-center justify-center text-[11px]">2</span>
                  <span>第二步：選擇長度 (Length)</span>
                </span>
                <span className="text-xs font-semibold text-amber-900 font-mono">
                  目前選擇：{selectedLength} cm
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[60, 90, 120, 150, 180].map((len) => (
                  <button
                    key={len}
                    type="button"
                    onClick={() => setSelectedLength(len)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      selectedLength === len
                        ? 'bg-amber-900 text-white border-amber-900 shadow-sm'
                        : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-800'
                    }`}
                  >
                    <div className="text-xs text-stone-400 font-mono">面寬長度</div>
                    <div className="text-base font-bold font-mono mt-0.5">{len} cm</div>
                  </button>
                ))}
              </div>
            </div>

            {/* STEP 3: Depth Selection (第三步：深度) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-900 text-white inline-flex items-center justify-center text-[11px]">3</span>
                  <span>第三步：選擇深度 (Depth)</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DEPTH_SURCHARGE_TIERS.map((tier) => (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setSelectedDepthTierId(tier.id)}
                    className={`p-3 rounded-xl border text-left text-xs transition-all ${
                      selectedDepthTierId === tier.id
                        ? 'bg-amber-900 text-white border-amber-900 font-bold'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <div>{tier.label}</div>
                    <div className="text-[11px] opacity-80 mt-0.5">{tier.note}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Installation & Region Selection */}
            <div className="space-y-3 pt-2 border-t border-stone-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900">到府組裝與運送服務</span>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-700">
                  <input
                    type="checkbox"
                    checked={needInstall}
                    onChange={(e) => setNeedInstall(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-900 focus:ring-amber-800"
                  />
                  <span>需要專業師傅到府組裝</span>
                </label>
              </div>

              {needInstall && (
                <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                  <label className="block text-xs font-semibold text-stone-700">
                    選擇您的配送 / 到府安裝區域：
                  </label>
                  <select
                    value={selectedRegionId}
                    onChange={(e) => setSelectedRegionId(e.target.value)}
                    className="w-full p-2.5 bg-white border border-stone-300 rounded-xl text-xs font-semibold text-stone-800 focus:ring-2 focus:ring-amber-900/20"
                  >
                    {TRAVEL_FEE_REGIONS.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}（車馬費 NT$ {r.recommendedFee}）
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Accessories Selection */}
            <div className="space-y-3 pt-2 border-t border-stone-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900">加購選配配件內容</span>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-stone-400 hover:text-stone-700 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>重置所有選擇</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ACCESSORY_OPTIONS.map((acc) => {
                  const qty = selectedAccessories[acc.id] || 0;
                  return (
                    <div
                      key={acc.id}
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                        qty > 0 ? 'bg-amber-50 border-amber-300' : 'bg-stone-50 border-stone-200'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-stone-800">{acc.name}</div>
                        <div className="text-amber-900 font-mono font-semibold">+NT$ {acc.price}</div>
                      </div>

                      <div className="flex items-center gap-1.5 bg-white border border-stone-200 rounded-lg p-1">
                        <button
                          type="button"
                          onClick={() => handleAccessoryChange(acc.id, -1)}
                          className="p-1 hover:bg-stone-100 rounded text-stone-600"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center font-mono font-bold text-xs">{qty}</span>
                        <button
                          type="button"
                          onClick={() => handleAccessoryChange(acc.id, 1)}
                          className="p-1 hover:bg-stone-100 rounded text-stone-600"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Price Summary Sticky Sidebar (Col 5) */}
          <div className="lg:col-span-5 sticky top-24 space-y-4">
            <div className="bg-stone-900 text-white rounded-3xl p-6 shadow-xl border border-stone-800 space-y-5">
              <div className="border-b border-stone-800 pb-4">
                <div className="text-xs text-amber-400 font-bold uppercase tracking-wider">
                  Price Summary · 試算結果
                </div>
                <h3 className="font-serif-title text-xl font-bold text-white mt-1">
                  客製化別墅預估總價
                </h3>
              </div>

              {/* Price Breakdown List */}
              <div className="space-y-2.5 text-xs text-stone-300">
                <div className="flex justify-between items-center">
                  <span>主體別墅 ({selectedLength}x60x{selectedHeight} cm)</span>
                  <span className="font-mono font-semibold text-white">NT$ {basePrice.toLocaleString()}</span>
                </div>

                {depthExtraFee > 0 && (
                  <div className="flex justify-between items-center text-amber-300">
                    <span>深度客製加價 ({selectedDepthTier?.label})</span>
                    <span className="font-mono font-semibold">+NT$ {depthExtraFee.toLocaleString()}</span>
                  </div>
                )}

                {heightExtraFee > 0 && (
                  <div className="flex justify-between items-center text-amber-300">
                    <span>高度挑高加價 ({selectedHeightTier?.label})</span>
                    <span className="font-mono font-semibold">+NT$ {heightExtraFee.toLocaleString()}</span>
                  </div>
                )}

                {needInstall && (
                  <>
                    <div className="flex justify-between items-center">
                      <span>到府組裝工費</span>
                      <span className="font-mono font-semibold text-white">NT$ {installFee.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>車馬費 ({selectedRegion?.name})</span>
                      <span className="font-mono font-semibold text-white">NT$ {travelFee.toLocaleString()}</span>
                    </div>
                  </>
                )}

                {accessoryTotal > 0 && (
                  <div className="flex justify-between items-center text-amber-300">
                    <span>配件加購總計</span>
                    <span className="font-mono font-semibold">+NT$ {accessoryTotal.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-emerald-400 pt-1">
                  <span>運費 (新竹物流直送台灣)</span>
                  <span className="font-semibold">免運費 (偏遠除外)</span>
                </div>
              </div>

              {/* Grand Total Display */}
              <div className="pt-4 border-t border-stone-800 flex items-baseline justify-between">
                <div>
                  <span className="text-xs text-stone-400 block">預估總金額 (含工費)</span>
                  <span className="text-xs text-amber-400 font-medium">純實木1.5cm板材</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-400">
                  NT$ {grandTotal.toLocaleString()}
                </div>
              </div>

              {/* LINE Consultation Button */}
              <a
                href={`${STORE_INFO.lineUrl}?text=${encodeURIComponent(
                  `您好店長！我在官網完成了【客製化貓別墅】估價試算：\n- 尺寸：長 ${selectedLength} cm x 深度 ${selectedDepthTier?.label} x 高度 ${selectedHeight} cm (${selectedHeightTier?.label})\n- 到府安裝：${needInstall ? `需要 (${selectedRegion?.name})` : '不需要'}\n- 配件選購：${Object.keys(selectedAccessories).length > 0 ? JSON.stringify(selectedAccessories) : '無'}\n- 試算預估總價：NT$ ${grandTotal.toLocaleString()}\n想與您討論排單製作與細節！`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 px-6 bg-[#06C755] hover:bg-[#05b34c] text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
              >
                <MessageCircle className="w-5 h-5" />
                <span>將此試算發送至 LINE 諮詢店長</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
