import React, { useState, useMemo } from 'react';
import {
  MENU_CATEGORIES,
  ACCESSORY_OPTIONS,
  STORE_INFO,
  TRAVEL_FEE_REGIONS,
  TravelFeeRegion
} from '../data/catVillaData';
import {
  Calculator,
  Plus,
  Minus,
  Check,
  MessageCircle,
  Copy,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  MapPin,
  Truck,
  Wrench,
  Video,
  FileSpreadsheet,
  QrCode
} from 'lucide-react';

interface EstimatorCalculatorProps {
  initialLength?: number;
  initialHeight?: number;
  onOpenImageZoom?: (title: string, imageUrl: string, subtitle?: string) => void;
}

export const EstimatorCalculator: React.FC<EstimatorCalculatorProps> = ({
  initialLength = 120,
  initialHeight = 150,
  onOpenImageZoom
}) => {
  const [selectedLength, setSelectedLength] = useState<number>(initialLength);
  const [selectedHeight, setSelectedHeight] = useState<number>(initialHeight);
  const [selectedDepthTierId, setSelectedDepthTierId] = useState<string>('depth-60');
  const [selectedExtraHeightTierId, setSelectedExtraHeightTierId] = useState<string>('height-standard');
  const [needInstallation, setNeedInstallation] = useState<boolean>(true);
  const [hasStairs, setHasStairs] = useState<boolean>(false);
  const [selectedRegionId, setSelectedRegionId] = useState<string>('tf-taichung');
  const [accessoryQuantities, setAccessoryQuantities] = useState<Record<string, number>>({});
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const [showQrScanModal, setShowQrScanModal] = useState<boolean>(false);

  // Available options
  const lengthOptions = [60, 90, 120, 150, 180];
  const heightOptions = [90, 120, 150, 180];

  const depthTiers = [
    { id: 'depth-60', label: '標準 60cm 深度', extraFee: 0, desc: '標準黃金深度，擺放穩固' },
    { id: 'depth-70', label: '61 - 70cm 深度', extraFee: 3000, desc: '+NT$ 3,000 (每 10cm 一區間)' },
    { id: 'depth-80', label: '71 - 80cm 深度', extraFee: 6000, desc: '+NT$ 6,000 (每 10cm 一區間)' },
    { id: 'depth-90', label: '81 - 90cm 深度', extraFee: 9000, desc: '+NT$ 9,000 (每 10cm 一區間)' },
    { id: 'depth-100', label: '91 - 100cm 深度', extraFee: 12000, desc: '+NT$ 12,000 (每 10cm 一區間)' }
  ];

  const extraHeightTiers = [
    { id: 'height-standard', label: '標準高度 (至 180cm)', extraFee: 0, desc: '標準高度區間' },
    { id: 'height-190', label: '超高 181 - 190cm', extraFee: 1000, desc: '+NT$ 1,000 (每 10cm 一區間)' },
    { id: 'height-200', label: '超高 191 - 200cm', extraFee: 2000, desc: '+NT$ 2,000 (每 10cm 一區間)' },
    { id: 'height-210', label: '超高 201 - 210cm', extraFee: 3000, desc: '+NT$ 3,000 (每 10cm 一區間)' }
  ];

  const selectedDepthTier = depthTiers.find((d) => d.id === selectedDepthTierId) || depthTiers[0];
  const selectedExtraHeightTier = extraHeightTiers.find((h) => h.id === selectedExtraHeightTierId) || extraHeightTiers[0];

  // Find category & price item
  const currentCategory = useMemo(() => {
    return MENU_CATEGORIES.find((c) => c.length === selectedLength) || MENU_CATEGORIES[2];
  }, [selectedLength]);

  const currentPriceItem = useMemo(() => {
    return (
      currentCategory.items.find((item) => item.height === selectedHeight) ||
      currentCategory.items[0]
    );
  }, [currentCategory, selectedHeight]);

  // Selected Travel Region
  const selectedRegion: TravelFeeRegion = useMemo(() => {
    return (
      TRAVEL_FEE_REGIONS.find((r) => r.id === selectedRegionId) || TRAVEL_FEE_REGIONS[0]
    );
  }, [selectedRegionId]);

  // Calculate accessory total
  const accessoryTotal = useMemo(() => {
    return ACCESSORY_OPTIONS.reduce((sum, acc) => {
      const qty = accessoryQuantities[acc.id] || 0;
      return sum + qty * acc.price;
    }, 0);
  }, [accessoryQuantities]);

  const basePrice = currentPriceItem.price;
  const depthExtraFee = selectedDepthTier.extraFee;
  const heightExtraFee = selectedExtraHeightTier.extraFee;
  const installFee = needInstallation ? currentPriceItem.installFee : 0;
  const travelFee = needInstallation ? selectedRegion.recommendedFee : 0;
  const grandTotal = basePrice + depthExtraFee + heightExtraFee + installFee + travelFee + accessoryTotal;

  const handleQtyChange = (id: string, delta: number) => {
    setAccessoryQuantities((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [id]: next };
    });
  };

  const handleReset = () => {
    setSelectedLength(120);
    setSelectedHeight(150);
    setSelectedDepthTierId('depth-60');
    setSelectedExtraHeightTierId('height-standard');
    setNeedInstallation(true);
    setHasStairs(false);
    setSelectedRegionId('tf-taichung');
    setAccessoryQuantities({});
  };

  // Build inquiry summary message
  const inquirySummary = useMemo(() => {
    const selectedAccessoriesList = ACCESSORY_OPTIONS.filter(
      (acc) => (accessoryQuantities[acc.id] || 0) > 0
    )
      .map(
        (acc) =>
          `  · ${acc.name} x ${accessoryQuantities[acc.id]} (NT$ ${(
            acc.price * accessoryQuantities[acc.id]
          ).toLocaleString()})`
      )
      .join('\n');

    const installText = needInstallation
      ? `是 (組裝工資 NT$ ${installFee.toLocaleString()} + 車馬費【${selectedRegion.name}】${
          selectedRegion.recommendedFee > 0
            ? `NT$ ${selectedRegion.recommendedFee.toLocaleString()}`
            : '專案實報'
        }${hasStairs ? '，現場無電梯需爬樓梯搬運，需另報樓層費' : ''})`
      : '否 (自行DIY組裝，提供店長親自入鏡示範教學影片)';

    return `【花花招財貓 · 客製化估價清單】
-------------------------
規格尺寸：${currentPriceItem.dimensionCode} (長${selectedLength} × 深${selectedDepthTier.id === 'depth-60' ? '60' : selectedDepthTier.label} × 高${selectedHeight}${selectedExtraHeightTier.extraFee > 0 ? ` + ${selectedExtraHeightTier.label}` : ''} cm)
純實木板材：全純實木板厚度 1.5cm（天然松木無甲醛＋微防水漆＋高透安全亞克力門）
基礎空屋：NT$ ${basePrice.toLocaleString()} ${
      currentPriceItem.bundledNote ? `(${currentPriceItem.bundledNote})` : ''
    }
${depthExtraFee > 0 ? `客製深度加價：NT$ ${depthExtraFee.toLocaleString()} (${selectedDepthTier.label})\n` : ''}${heightExtraFee > 0 ? `客製超高加價：NT$ ${heightExtraFee.toLocaleString()} (${selectedExtraHeightTier.label})\n` : ''}專業到府組裝：${installText}
${
  selectedAccessoriesList
    ? `加裝配件：\n${selectedAccessoriesList}\n配件小計：NT$ ${accessoryTotal.toLocaleString()}`
    : '加裝配件：無 (標準配置)'
}
-------------------------
預估總額：NT$ ${grandTotal.toLocaleString()} 元 ${
      selectedRegion.id === 'tf-remote' && needInstallation ? '(東部/偏遠車馬費依實際里程報價)' : ''
    }
客製備註：支援 1:1 照照片訂製，高度、深度、長度皆可客製！
配送備註：新竹物流配送至一樓（免運不包含偏遠地區還有離島）。出貨前預組裝拍照確認無誤，享 1 年保固！
組裝說明：若自行組裝，強烈建議自備「電動螺絲起子」，提供店長本人親自拍攝入鏡示範的教學影片。

想向店長預約客製排單與安排出貨！`;
  }, [
    currentPriceItem,
    selectedHeight,
    selectedLength,
    selectedDepthTier,
    selectedExtraHeightTier,
    basePrice,
    depthExtraFee,
    heightExtraFee,
    needInstallation,
    hasStairs,
    installFee,
    selectedRegion,
    accessoryTotal,
    accessoryQuantities,
    grandTotal
  ]);

  const handleCopy = () => {
    navigator.clipboard.writeText(inquirySummary).then(() => {
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2500);
    });
  };

  const lineChatUrl = `${STORE_INFO.lineUrl}?text=${encodeURIComponent(inquirySummary)}`;

  const handleViewTravelSheet = () => {
    if (onOpenImageZoom) {
      onOpenImageZoom(
        '花花招財貓 · 各地車馬費計算參考表',
        STORE_INFO.travelFeeSheetImage,
        '出發地：臺中市豐原區門店（計算來回里程5元/km + 來回國道1.2元/km，店長主動吸收零頭讓利客群）'
      );
    }
  };

  return (
    <section id="estimator" className="py-14 sm:py-20 bg-[#FAF7F2] border-b border-stone-200 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-amber-900 bg-amber-500/10 border border-amber-600/20 mb-2">
            <Calculator className="w-3.5 h-3.5 text-amber-800" />
            <span>透明試算 · 一鍵帶入規格</span>
          </div>
          <h2 className="font-serif-title text-2xl sm:text-3xl font-bold text-stone-900 mt-1">
            全套客製化 · 線上即時估價試算機
          </h2>
          <p className="text-sm text-stone-600 mt-2">
            支援深度客製、超高客製、配件加裝與全台車馬費，即時計算合理透明總價，支援手機直掃 QR 或一鍵帶入 LINE！
          </p>
          <div className="mt-3 inline-flex flex-wrap items-center justify-center gap-2 text-xs text-amber-900 bg-amber-50 px-3.5 py-1.5 rounded-xl border border-amber-200/80">
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            <span>支援 1:1 照照片製作！可以把網路上看到的喜歡款式發給店長按圖客製</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Controls Left Column */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-stone-200 p-5 sm:p-7 shadow-xs space-y-6">
            {/* Step 1: Length Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-900 text-white flex items-center justify-center text-[10px]">
                    1
                  </span>
                  <span>第一步：選擇別墅長度 (面寬)</span>
                </label>
                <span className="text-xs text-amber-900 font-semibold font-mono">
                  目前長度：{selectedLength} cm
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {lengthOptions.map((len) => (
                  <button
                    key={len}
                    type="button"
                    onClick={() => setSelectedLength(len)}
                    className={`py-2.5 text-xs font-medium rounded-xl border transition-all ${
                      selectedLength === len
                        ? 'bg-amber-900 text-white border-amber-900 font-bold shadow-xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {len} cm
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Height Selection & Extra Height Surcharge */}
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-900 text-white flex items-center justify-center text-[10px]">
                    2
                  </span>
                  <span>第二步：選擇垂直高度 (支援超高客製)</span>
                </label>
                <span className="text-xs text-amber-900 font-semibold font-mono">
                  目前高度：{selectedHeight} cm {selectedExtraHeightTier.extraFee > 0 ? `(${selectedExtraHeightTier.label})` : ''}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {heightOptions.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setSelectedHeight(h)}
                    className={`py-2.5 text-xs font-medium rounded-xl border transition-all ${
                      selectedHeight === h
                        ? 'bg-amber-900 text-white border-amber-900 font-bold shadow-xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {h} cm 高
                  </button>
                ))}
              </div>

              {/* Extra Height Options (超過180每10cm一個區間) */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1.5">
                <div className="text-[11px] font-bold text-stone-800 flex items-center justify-between">
                  <span>客製超高天花板規格（超過180cm，每10cm +NT$ 1,000）：</span>
                  <span className="text-amber-900 font-mono font-semibold">
                    {selectedExtraHeightTier.extraFee > 0 ? `+ NT$ ${selectedExtraHeightTier.extraFee.toLocaleString()}` : '標準規格'}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {extraHeightTiers.map((tier) => (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setSelectedExtraHeightTierId(tier.id)}
                      className={`py-1.5 px-2 text-[11px] font-medium rounded-lg border text-center transition-all ${
                        selectedExtraHeightTierId === tier.id
                          ? 'bg-amber-900 text-white border-amber-900 font-bold'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {tier.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Step 3: Depth Customization Surcharge (每10cm一個區間) */}
            <div className="pt-2 border-t border-stone-100 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-900 text-white flex items-center justify-center text-[10px]">
                    3
                  </span>
                  <span>第三步：選擇別墅深度 (標準 60cm / 超過每 10cm +$3,000)</span>
                </label>
                <span className="text-xs text-amber-900 font-semibold font-mono">
                  {selectedDepthTier.extraFee > 0 ? `+ NT$ ${selectedDepthTier.extraFee.toLocaleString()}` : '標準黃金深度'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {depthTiers.map((tier) => (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setSelectedDepthTierId(tier.id)}
                    className={`py-2 px-3 text-xs font-medium rounded-xl border text-left transition-all ${
                      selectedDepthTierId === tier.id
                        ? 'bg-amber-900 text-white border-amber-900 font-bold shadow-xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <div className="font-semibold">{tier.label}</div>
                    <div className={`text-[10px] ${selectedDepthTierId === tier.id ? 'text-amber-200' : 'text-stone-400'}`}>
                      {tier.desc}
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-stone-400">
                ※ 標準深度固定為 60cm；若空間允許想要更大迴旋空間，深度可自由增加，每 10cm 一個區間加收 NT$ 3,000。
              </p>
            </div>

            {/* Bundled Feature Callout if any */}
            {currentPriceItem.bundledNote && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/70 flex items-center gap-2.5 text-xs text-amber-900">
                <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  <strong>此規格標配附贈：</strong>
                  {currentPriceItem.bundledNote}（已包含在基礎空屋價內！）
                </span>
              </div>
            )}

            {/* Step 4: Installation & Region Travel Fee & Stairs Notice */}
            <div className="pt-2 border-t border-stone-100 space-y-3">
              <label className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-amber-900 text-white flex items-center justify-center text-[10px]">
                  4
                </span>
                <span>第四步：到府專業組裝服務與地區車馬費</span>
              </label>

              {/* Toggle Card */}
              <div
                onClick={() => setNeedInstallation(!needInstallation)}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                  needInstallation
                    ? 'bg-amber-50/70 border-amber-800/40'
                    : 'bg-stone-50 border-stone-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                      needInstallation
                        ? 'bg-amber-900 border-amber-900 text-white'
                        : 'border-stone-400 bg-white'
                    }`}
                  >
                    {needInstallation && <Check className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-stone-900">
                      需要專業師傅到府組裝定位
                    </div>
                    <div className="text-[11px] text-stone-500">
                      專人到府搬運上樓定位組裝，免自己動手省時省心
                    </div>
                  </div>
                </div>
                <div className="text-right font-mono font-bold text-xs text-amber-900 tabular-nums">
                  工資 + NT$ {currentPriceItem.installFee.toLocaleString()}
                </div>
              </div>

              {/* DIY Tool / Video Reminder when installation not selected */}
              {!needInstallation && (
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600 flex items-start gap-2.5">
                  <Video className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-stone-800">
                      選擇自行 DIY 組裝：
                    </span>
                    <span>
                      板材預留主要結構孔，強烈建議您自備<strong>「電動螺絲起子」</strong>。我們提供<strong>店長本人親自拍攝入鏡示範的完整教學影片</strong>，隨時線上指導！
                    </span>
                  </div>
                </div>
              )}

              {/* Region Selector and Stairs Checkbox when installation is TRUE */}
              {needInstallation && (
                <div className="p-4 bg-[#F8F5F0] rounded-xl border border-amber-900/15 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
                      <MapPin className="w-3.5 h-3.5 text-amber-800" />
                      <span>選擇您的組裝目的地（計算車馬費，臺中豐原門店出發）：</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleViewTravelSheet}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900 hover:underline"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>查看車馬費計算表格</span>
                    </button>
                  </div>

                  <select
                    value={selectedRegionId}
                    onChange={(e) => setSelectedRegionId(e.target.value)}
                    className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-800/20"
                  >
                    {TRAVEL_FEE_REGIONS.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} · {r.recommendedFee > 0 ? `車馬費 NT$ ${r.recommendedFee.toLocaleString()}` : '偏遠專案實報'} {r.badge ? `(${r.badge})` : ''}
                      </option>
                    ))}
                  </select>

                  {/* Detail explanation of selected region */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 bg-white rounded-lg border border-stone-200 text-xs">
                    <div className="text-stone-600">
                      <span className="font-semibold text-stone-800">{selectedRegion.name}</span>
                      {selectedRegion.distanceKm > 0 && (
                        <span className="text-[11px] text-stone-400 ml-2">
                          預估單趟約 {selectedRegion.distanceKm} km (國道約 {selectedRegion.highwayKm} km)
                        </span>
                      )}
                      <div className="text-[11px] text-amber-900 mt-0.5">
                        {selectedRegion.note}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-stone-400 block">建議收取車馬費</span>
                      <span className="font-mono font-bold text-sm text-amber-900">
                        {selectedRegion.recommendedFee > 0
                          ? `+ NT$ ${selectedRegion.recommendedFee.toLocaleString()}`
                          : '專案實報'}
                      </span>
                    </div>
                  </div>

                  {/* Stairs Notice Checkbox */}
                  <div
                    onClick={() => setHasStairs(!hasStairs)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 text-xs ${
                      hasStairs
                        ? 'bg-amber-100/60 border-amber-800/40'
                        : 'bg-white border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border transition-colors shrink-0 ${
                        hasStairs
                          ? 'bg-amber-900 border-amber-900 text-white'
                          : 'border-stone-400 bg-white'
                      }`}
                    >
                      {hasStairs && <Check className="w-3 h-3" />}
                    </div>
                    <div>
                      <span className="font-bold text-stone-900 block">
                        現場無電梯（需走樓梯搬運上樓）
                      </span>
                      <span className="text-[11px] text-stone-600 block leading-tight mt-0.5">
                        大型實木傢俱體積大，上門安裝若需爬樓梯需額外提前報備，會依樓層加收搬運樓層費，具體請加 LINE 諮詢確認。
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Step 5: Accessories Stepper */}
            <div className="pt-2 border-t border-stone-100">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-900 text-white flex items-center justify-center text-[10px]">
                    5
                  </span>
                  <span>第五步：加裝專屬配件 (依需選配)</span>
                </label>
                <button
                  type="button"
                  onClick={() => setAccessoryQuantities({})}
                  className="text-[11px] text-stone-400 hover:text-stone-700 transition-colors"
                >
                  清空配件
                </button>
              </div>

              <div className="space-y-2">
                {ACCESSORY_OPTIONS.map((acc) => {
                  const qty = accessoryQuantities[acc.id] || 0;
                  return (
                    <div
                      key={acc.id}
                      className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-150 text-xs hover:border-amber-900/20 transition-all"
                    >
                      <div className="pr-2 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-stone-900">{acc.name}</span>
                          <span className="text-[11px] font-bold text-amber-900 font-mono">
                            NT$ {acc.price.toLocaleString()}
                          </span>
                        </div>
                        <span className="block text-[11px] text-stone-500 leading-tight">
                          {acc.description}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleQtyChange(acc.id, -1)}
                          disabled={qty === 0}
                          className="w-7 h-7 rounded-lg bg-white border border-stone-200 text-stone-600 disabled:opacity-30 flex items-center justify-center hover:bg-stone-100 active:scale-95 transition-all"
                          aria-label={`減少 ${acc.name}`}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-mono font-bold text-stone-900 w-5 text-center">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQtyChange(acc.id, 1)}
                          className="w-7 h-7 rounded-lg bg-white border border-stone-200 text-stone-600 flex items-center justify-center hover:bg-stone-100 active:scale-95 transition-all"
                          aria-label={`增加 ${acc.name}`}
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

          {/* Quotation Result Card Right Column */}
          <div className="lg:col-span-5 sticky top-24 space-y-4">
            <div className="bg-white rounded-2xl border border-amber-900/20 p-5 sm:p-6 shadow-md">
              <div className="flex items-center justify-between pb-4 border-b border-stone-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-900 text-white flex items-center justify-center shadow-2xs">
                    <Calculator className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-serif-title font-bold text-stone-900 text-base">
                      客製即時估價明細
                    </h3>
                    <p className="text-[11px] text-stone-500">
                      長{selectedLength} × 深{selectedDepthTier.id === 'depth-60' ? '60' : selectedDepthTier.label} × 高{selectedHeight} cm
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
                  title="重設試算"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Itemized breakdown */}
              <div className="py-4 space-y-2.5 text-xs text-stone-600 border-b border-stone-200">
                <div className="flex justify-between">
                  <span>別墅本體 ({currentPriceItem.dimensionCode})</span>
                  <span className="font-mono font-semibold text-stone-900 tabular-nums">
                    NT$ {basePrice.toLocaleString()}
                  </span>
                </div>

                {depthExtraFee > 0 && (
                  <div className="flex justify-between text-amber-900">
                    <span>{selectedDepthTier.label}</span>
                    <span className="font-mono font-semibold tabular-nums">
                      + NT$ {depthExtraFee.toLocaleString()}
                    </span>
                  </div>
                )}

                {heightExtraFee > 0 && (
                  <div className="flex justify-between text-amber-900">
                    <span>{selectedExtraHeightTier.label}</span>
                    <span className="font-mono font-semibold tabular-nums">
                      + NT$ {heightExtraFee.toLocaleString()}
                    </span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>專業到府組裝工資</span>
                  <span className="font-mono text-stone-900 tabular-nums">
                    {needInstallation ? `NT$ ${installFee.toLocaleString()}` : '自行組裝 (NT$ 0)'}
                  </span>
                </div>

                {needInstallation && (
                  <div className="flex justify-between">
                    <span>
                      地區車馬費 ({selectedRegion.name})
                    </span>
                    <span className="font-mono text-amber-900 font-semibold tabular-nums">
                      {selectedRegion.recommendedFee > 0
                        ? `NT$ ${travelFee.toLocaleString()}`
                        : '專案實報'}
                    </span>
                  </div>
                )}

                {needInstallation && hasStairs && (
                  <div className="flex justify-between text-rose-700 font-medium">
                    <span>無電梯爬樓梯搬運</span>
                    <span className="font-mono">需另加樓層費 (加LINE確認)</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>加裝配件小計</span>
                  <span className="font-mono text-stone-900 tabular-nums">
                    NT$ {accessoryTotal.toLocaleString()}
                  </span>
                </div>

                {/* List selected accessories */}
                {accessoryTotal > 0 && (
                  <div className="pl-3 py-1.5 bg-stone-50 rounded-lg text-[11px] text-stone-500 space-y-1">
                    {ACCESSORY_OPTIONS.filter((acc) => (accessoryQuantities[acc.id] || 0) > 0).map(
                      (acc) => (
                        <div key={acc.id} className="flex justify-between pr-2">
                          <span>
                            {acc.name} × {accessoryQuantities[acc.id]}
                          </span>
                          <span className="font-mono font-medium text-stone-700">
                            NT$ {(acc.price * accessoryQuantities[acc.id]).toLocaleString()}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* Grand Total */}
              <div className="py-4">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-xs font-bold text-stone-700 block">預估總金額 (TWD)</span>
                    <span className="text-[10px] text-stone-400">
                      {needInstallation
                        ? `含空屋 + 客製規格 + 組裝 + ${selectedRegion.name}車馬費`
                        : '含空屋 + 客製規格 + 配件 (自組享教學影片)'}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-serif-title font-bold text-3xl text-amber-900 font-mono tabular-nums">
                      NT$ {grandTotal.toLocaleString()}
                    </div>
                    {selectedRegion.id === 'tf-remote' && needInstallation && (
                      <div className="text-[10px] text-amber-800 mt-0.5">
                        偏遠/東部車馬費請洽 LINE 專案報價
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <a
                  href={lineChatUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 text-xs font-semibold text-white bg-[#06C755] hover:bg-[#05b34c] rounded-xl shadow-xs transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>傳送此報價單至 LINE 專人諮詢</span>
                </a>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-xl transition-colors"
                  >
                    {copiedSuccess ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">已複製！</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-stone-500" />
                        <span>一鍵複製清單</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowQrScanModal(true)}
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-xl transition-colors"
                  >
                    <QrCode className="w-3.5 h-3.5 text-amber-800" />
                    <span>手機掃碼加 LINE</span>
                  </button>
                </div>
              </div>

              {/* LINE QR Code Card Embedded inside Calculator */}
              <div className="mt-4 p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center gap-3">
                <img
                  src={STORE_INFO.lineQrCode}
                  alt="LINE QR"
                  className="w-14 h-14 rounded-lg bg-white p-1 border border-stone-200 object-contain shrink-0"
                />
                <div className="text-xs">
                  <div className="font-bold text-stone-800">直接掃碼加入店長 LINE</div>
                  <div className="text-[11px] text-stone-500 font-mono">ID：{STORE_INFO.lineId}</div>
                  <div className="text-[10px] text-stone-400 mt-0.5">
                    電腦請拿手機相機對準 QR Code 即可快速諮詢
                  </div>
                </div>
              </div>

              {/* Shipping & Warranty reassurance notes */}
              <div className="mt-4 pt-3 border-t border-stone-100 text-[11px] text-stone-500 space-y-1">
                <div className="flex items-center gap-1.5 text-stone-700 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                  <span>純實木板厚度足 1.5cm，拒絕爛木頭與劣質貼皮夾板！</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                  <span>新竹物流配送至一樓（免運不包含偏遠地區還有離島）</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>享 1 年保固（憑到貨拆箱全程錄影非人為損壞免費補件）</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal for Instant QR Code Scanner Popup */}
      {showQrScanModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => setShowQrScanModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-stone-200 relative animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-[#06C755] mx-auto flex items-center justify-center">
              <MessageCircle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-serif-title font-bold text-stone-900 text-lg">
                掃描加店長 LINE 即時諮詢
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                LINE ID：<strong className="text-stone-900 font-mono">{STORE_INFO.lineId}</strong>
              </p>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 inline-block mx-auto">
              <img
                src={STORE_INFO.lineQrCode}
                alt="花花招財貓 LINE QR Code"
                className="w-56 h-56 object-contain rounded-lg"
              />
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              打開手機 LINE App &rarr;「加入好友」&rarr;「行動條碼」對準上方 QR Code，即可直接發送估價單！
            </p>

            <div className="flex gap-2 pt-2">
              <a
                href={STORE_INFO.lineUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 px-4 bg-[#06C755] text-white text-xs font-semibold rounded-xl hover:bg-[#05b34c] transition-colors"
              >
                手機直接開啟 LINE
              </a>
              <button
                type="button"
                onClick={() => setShowQrScanModal(false)}
                className="py-2.5 px-4 bg-stone-100 text-stone-700 text-xs font-semibold rounded-xl hover:bg-stone-200 transition-colors"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
